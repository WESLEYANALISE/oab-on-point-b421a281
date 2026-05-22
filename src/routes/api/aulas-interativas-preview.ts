import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { geminiGenerateContent } from "@/lib/gemini.server";

const MODEL = "gemini-2.5-flash";

const Input = z.object({
  arquivoDriveId: z.string().uuid(),
  tituloCurso: z.string().min(1).max(200).optional(),
  materia: z.string().min(1).max(120).optional(),
});

const SYSTEM_ESQUELETO = `Você é um arquiteto pedagógico que vai PLANEJAR um curso interativo a partir de um MATERIAL DE ESTUDO em markdown (português do Brasil, OAB).

Sua tarefa AQUI é apenas o ESQUELETO: módulos e aulas (sem slides).

Regras:
- 2 a 6 módulos. Cada módulo tem 2 a 4 aulas. Total máximo: 18 aulas.
- "escopo" da aula deve ser 2-4 frases descrevendo exatamente o que aquela aula vai cobrir, com termos-chave do material. Isso será usado depois para gerar os slides.
- IGNORE conteúdo que não seja jurídico (citações ao professor, logos, propaganda, redes sociais).
- NÃO invente: use só o que está no material.

SAÍDA: APENAS JSON válido, sem markdown ao redor:
{
  "titulo_sugerido": "string",
  "materia_sugerida": "string",
  "modulos": [
    {
      "titulo": "string",
      "descricao": "string curta",
      "aulas": [
        {
          "titulo": "string",
          "descricao": "string curta",
          "duracao_min": number,
          "escopo": "string com 2-4 frases descrevendo o que entra nessa aula"
        }
      ]
    }
  ]
}`;

const SYSTEM_SLIDES = `Você gera SLIDES de UMA aula de um curso jurídico interativo (OAB, português do Brasil).

Você receberá: contexto da aula (módulo, título, escopo) + o MATERIAL DE ESTUDO completo em markdown.

Gere de 3 a 10 slides para ESTA AULA APENAS, focados no escopo informado.

Tipos válidos:
- "capa": titulo + objetivos (bullets até 4)
- "conceito": titulo + texto (≤120 palavras) + destaque (1 frase com regra-chave)
- "exemplo": titulo + texto com caso prático curto
- "esquema": titulo + bullets (até 6)
- "comparativo": titulo + colunas[{titulo, itens[]}] (2-3 colunas)
- "quiz": titulo "Teste rápido" + quiz_json {pergunta, alternativas[{letra:"A",texto}], correta:"A", explicacao}
- "resumo": titulo "O que vimos" + bullets dos pontos-chave
- "conclusao": titulo "Próximos passos" + texto motivador curto

Regras:
- A aula precisa ter PELO MENOS 1 slide tipo "quiz".
- Use **negrito** em termos-chave dentro de texto/destaque.
- Se houver imagem útil referenciada no markdown (URL), use em "imagem_url".
- NÃO repita conteúdo de outras aulas.

SAÍDA: APENAS JSON válido (sem markdown ao redor):
{
  "slides": [
    {
      "ordem": number,
      "tipo": "capa"|"conceito"|"exemplo"|"esquema"|"comparativo"|"quiz"|"resumo"|"conclusao",
      "conteudo": {"titulo":"...","texto":"...","destaque":"...","bullets":[...],"colunas":[{"titulo":"...","itens":[...]}],"objetivos":[...]},
      "imagem_url": null,
      "quiz_json": null
    }
  ]
}`;

function sseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

type PaginaFonte = { n?: number; texto?: string; imagens?: string[] };

const STOPWORDS = new Set([
  "para", "pela", "pelo", "como", "mais", "menos", "sobre", "entre", "aula", "direito", "juridico", "jurídico",
  "conceito", "conceitos", "aspectos", "principais", "material", "estudo", "oab", "modulo", "módulo",
]);

function compactText(text: string, maxChars: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  return cut.slice(0, lastStop > maxChars * 0.75 ? lastStop + 1 : maxChars).trim();
}

function normalizeText(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function extractTokens(...parts: Array<string | undefined | null>) {
  const raw = normalizeText(parts.filter(Boolean).join(" "));
  return Array.from(new Set(raw.match(/[a-z0-9]{4,}/g) ?? []))
    .filter((w) => !STOPWORDS.has(w))
    .slice(0, 28);
}

function buildPlanningMaterial(paginas: PaginaFonte[], markdown: string, maxChars = 70_000) {
  if (!paginas.length) return compactText(markdown, maxChars);
  const perPage = Math.max(140, Math.min(520, Math.floor(maxChars / Math.max(1, paginas.length)) - 24));
  const chunks: string[] = [];
  let used = 0;
  for (const p of paginas) {
    const texto = compactText(p.texto ?? "", perPage);
    if (!texto) continue;
    const chunk = `PÁGINA ${(p.n ?? chunks.length) + 1}: ${texto}`;
    used += chunk.length + 2;
    if (used > maxChars) break;
    chunks.push(chunk);
  }
  return chunks.join("\n\n") || compactText(markdown, maxChars);
}

function scorePage(text: string, tokens: string[]) {
  const n = normalizeText(text);
  let score = 0;
  for (const t of tokens) {
    let idx = n.indexOf(t);
    while (idx !== -1) {
      score += t.length > 7 ? 3 : 1;
      idx = n.indexOf(t, idx + t.length);
    }
  }
  return score;
}

function buildLessonMaterial(
  paginas: PaginaFonte[],
  markdown: string,
  ctx: { modulo?: string; aula?: string; descricao?: string; escopo?: string },
  maxChars = 28_000,
) {
  if (!paginas.length) return compactText(markdown, maxChars);
  const tokens = extractTokens(ctx.modulo, ctx.aula, ctx.descricao, ctx.escopo);
  const ranked = paginas
    .map((p, idx) => ({ p, idx, score: scorePage(p.texto ?? "", tokens) }))
    .sort((a, b) => b.score - a.score || a.idx - b.idx);
  const selected = ranked.filter((x) => x.score > 0).slice(0, 10);
  if (selected.length < 4) selected.push(...ranked.filter((x) => !selected.includes(x)).slice(0, 4 - selected.length));
  selected.sort((a, b) => ((a.p.n ?? a.idx) - (b.p.n ?? b.idx)));

  const perPage = Math.max(1_400, Math.min(3_200, Math.floor(maxChars / Math.max(1, selected.length)) - 120));
  return selected.map(({ p, idx }) => {
    const imgs = Array.isArray(p.imagens) && p.imagens.length ? `\nIMAGENS: ${p.imagens.join(" | ")}` : "";
    return `PÁGINA ${(p.n ?? idx) + 1}:\n${compactText(p.texto ?? "", perPage)}${imgs}`;
  }).join("\n\n---\n\n");
}

function limitarTotalAulas(modulos: any[], limite = 18) {
  let total = 0;
  return modulos
    .map((m) => {
      const aulas = Array.isArray(m?.aulas) ? m.aulas : [];
      const restantes = Math.max(0, limite - total);
      const aulasCortadas = aulas.slice(0, restantes);
      total += aulasCortadas.length;
      return { ...m, aulas: aulasCortadas };
    })
    .filter((m) => Array.isArray(m.aulas) && m.aulas.length > 0);
}

function fallbackSlides(aula: any) {
  const titulo = aula?.titulo ?? "Aula";
  const escopo = aula?.escopo ?? aula?.descricao ?? "Tema central da aula.";
  return [
    { ordem: 0, tipo: "capa", conteudo: { titulo, objetivos: ["Entender o núcleo do tema", "Fixar os pontos cobrados na OAB"] }, imagem_url: null, quiz_json: null },
    { ordem: 1, tipo: "conceito", conteudo: { titulo: "Ideia central", texto: escopo, destaque: "Revise o conceito e relacione com a aplicação prática." }, imagem_url: null, quiz_json: null },
    { ordem: 2, tipo: "resumo", conteudo: { titulo: "O que vimos", bullets: ["Conceito principal", "Pontos de atenção", "Aplicação em prova"] }, imagem_url: null, quiz_json: null },
    { ordem: 3, tipo: "quiz", conteudo: { titulo: "Teste rápido" }, imagem_url: null, quiz_json: { pergunta: `Qual é o ponto mais importante em ${titulo}?`, alternativas: [{ letra: "A", texto: "Identificar o conceito e sua consequência jurídica" }, { letra: "B", texto: "Ignorar o contexto normativo" }, { letra: "C", texto: "Aplicar regra sem analisar o caso" }, { letra: "D", texto: "Memorizar sem compreender" }], correta: "A", explicacao: "A compreensão do conceito e da consequência jurídica é a base para resolver questões." } },
  ];
}

function tryParseJson(raw: string): any {
  if (!raw) throw new Error("Resposta vazia do modelo");
  try {
    return JSON.parse(raw);
  } catch {
    // tenta extrair primeiro bloco { ... }
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* segue */ }
    }
    // tenta reparar truncamento: corta na última `}` válida por contagem de chaves
    let depth = 0, lastOk = -1, inStr = false, esc = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') { inStr = true; continue; }
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) lastOk = i;
      }
    }
    if (lastOk > 0) {
      try { return JSON.parse(raw.slice(0, lastOk + 1)); } catch { /* segue */ }
    }
    throw new Error(`JSON inválido do modelo (len=${raw.length})`);
  }
}

async function callGeminiJson(system: string, user: string, maxTokens: number): Promise<any> {
  const res = await geminiGenerateContent(MODEL, {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.4,
      responseMimeType: "application/json",
      maxOutputTokens: maxTokens,
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 300)}`);
  }
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
  return tryParseJson(text);
}

export const Route = createFileRoute("/api/aulas-interativas-preview")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let parsed: z.infer<typeof Input>;
        try {
          parsed = Input.parse(await request.json());
        } catch (e: any) {
          return new Response(`Bad request: ${e?.message ?? "invalid"}`, { status: 400 });
        }

        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data: arq } = await sb
          .from("aulas_interativas_arquivos_drive")
          .select("id, nome_arquivo, subpasta")
          .eq("id", parsed.arquivoDriveId)
          .maybeSingle();
        if (!arq) return new Response("Arquivo não encontrado", { status: 404 });

        const { data: extr } = await sb
          .from("aulas_interativas_extracoes")
          .select("markdown")
          .eq("arquivo_drive_id", arq.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!extr?.markdown) {
          return new Response("Extração não encontrada. Rode a extração primeiro.", {
            status: 409,
          });
        }

        await sb
          .from("aulas_interativas_arquivos_drive")
          .update({
            status_ingestao: "gerando_previa",
            erro_msg: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", arq.id);

        const tituloIn = parsed.tituloCurso ?? arq.nome_arquivo.replace(/\.pdf$/i, "");
        const materiaIn = parsed.materia ?? arq.subpasta;
        const markdown = extr.markdown.slice(0, 180_000);

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            let closed = false;
            const send = (event: string, data: unknown) => {
              if (closed) return;
              try {
                controller.enqueue(encoder.encode(sseEvent(event, data)));
              } catch {
                closed = true;
              }
            };
            const ping = setInterval(() => {
              if (closed) return;
              try {
                controller.enqueue(encoder.encode(`: ping\n\n`));
              } catch {
                closed = true;
              }
            }, 10_000);

            const failAndPersist = async (msg: string) => {
              await sb
                .from("aulas_interativas_arquivos_drive")
                .update({
                  status_ingestao: "erro",
                  erro_msg: msg.slice(0, 500),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", arq.id);
              send("error", { error: msg });
            };

            try {
              send("start", { ok: true });

              // ---- PASS 1: esqueleto ----
              send("progress", { fase: "esqueleto", aula: 0, total: 0 });
              const userEsq = `Curso sugerido: ${tituloIn}\nMatéria: ${materiaIn}\n\nMATERIAL EM MARKDOWN:\n${markdown}`;
              let esqueleto: any;
              try {
                esqueleto = await callGeminiJson(SYSTEM_ESQUELETO, userEsq, 16_000);
              } catch (e: any) {
                throw new Error(`Falha no esqueleto: ${e?.message ?? e}`);
              }

              const titulo_sugerido = esqueleto?.titulo_sugerido ?? tituloIn;
              const materia_sugerida = esqueleto?.materia_sugerida ?? materiaIn;
              const modulosBase: any[] = Array.isArray(esqueleto?.modulos) ? esqueleto.modulos : [];
              if (modulosBase.length === 0) throw new Error("Esqueleto vazio (sem módulos)");

              // Conta total de aulas
              const totalAulas = modulosBase.reduce(
                (acc, m) => acc + (Array.isArray(m?.aulas) ? m.aulas.length : 0),
                0,
              );
              send("progress", { fase: "esqueleto", aula: 0, total: totalAulas, modulos: modulosBase.length });

              // ---- PASS 2: slides por aula ----
              let feita = 0;
              const modulosOut: any[] = [];
              for (const mod of modulosBase) {
                const aulasIn: any[] = Array.isArray(mod?.aulas) ? mod.aulas : [];
                const aulasOut: any[] = [];
                for (const aul of aulasIn) {
                  const userSlides =
                    `MÓDULO: ${mod.titulo}\nDescrição do módulo: ${mod.descricao ?? ""}\n\n` +
                    `AULA: ${aul.titulo}\nDescrição: ${aul.descricao ?? ""}\nEscopo: ${aul.escopo ?? ""}\n\n` +
                    `Gere os slides apenas desta aula, conforme o escopo.\n\n` +
                    `MATERIAL EM MARKDOWN:\n${markdown}`;
                  let slidesJson: any;
                  try {
                    slidesJson = await callGeminiJson(SYSTEM_SLIDES, userSlides, 8_000);
                  } catch (e: any) {
                    // não derruba tudo — usa slides vazios e segue
                    slidesJson = { slides: [] };
                    console.error("[preview] aula falhou:", aul?.titulo, e?.message);
                  }
                  const slides = Array.isArray(slidesJson?.slides) ? slidesJson.slides : [];
                  aulasOut.push({
                    titulo: aul.titulo,
                    descricao: aul.descricao ?? "",
                    duracao_min: aul.duracao_min ?? 10,
                    slides: slides.map((s: any, i: number) => ({
                      ordem: typeof s?.ordem === "number" ? s.ordem : i,
                      tipo: s?.tipo ?? "conceito",
                      conteudo: s?.conteudo ?? {},
                      imagem_url: s?.imagem_url ?? null,
                      quiz_json: s?.quiz_json ?? null,
                    })),
                  });
                  feita++;
                  send("progress", {
                    fase: "slides",
                    aula: feita,
                    total: totalAulas,
                    aulaTitulo: aul.titulo,
                    slides: slides.length,
                  });
                }
                modulosOut.push({
                  titulo: mod.titulo,
                  descricao: mod.descricao ?? "",
                  aulas: aulasOut,
                });
              }

              const out = { modulos: modulosOut };

              await sb
                .from("aulas_interativas_previas")
                .delete()
                .eq("arquivo_drive_id", arq.id);

              const { error: eIns } = await sb.from("aulas_interativas_previas").insert({
                arquivo_drive_id: arq.id,
                estrutura: out as never,
                titulo_sugerido,
                materia_sugerida,
              } as never);
              if (eIns) throw new Error(eIns.message);

              await sb
                .from("aulas_interativas_arquivos_drive")
                .update({
                  status_ingestao: "previa_pronta",
                  erro_msg: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", arq.id);

              send("done", { estrutura: out, titulo_sugerido, materia_sugerida });
            } catch (err: any) {
              await failAndPersist(String(err?.message ?? err));
            } finally {
              clearInterval(ping);
              closed = true;
              try { controller.close(); } catch { /* já fechado */ }
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
