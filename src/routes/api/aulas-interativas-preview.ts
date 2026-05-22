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
- 2 a 3 módulos. Cada módulo tem 2 a 3 aulas. Total máximo: 9 aulas.
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

function limitarTotalAulas(modulos: any[], limite = 9) {
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

function fallbackEsqueleto(titulo: string, materia: string, paginas: PaginaFonte[], markdown: string) {
  const total = paginas.length || 9;
  const modulos = Array.from({ length: 3 }, (_, mi) => {
    const ini = Math.floor((total / 3) * mi);
    const fim = Math.max(ini + 1, Math.floor((total / 3) * (mi + 1)));
    const trecho = compactText(
      paginas.slice(ini, fim).map((p) => p.texto ?? "").join(" ") || markdown,
      520,
    );
    return {
      titulo: `${materia} — Parte ${mi + 1}`,
      descricao: `Tópicos centrais do material, páginas ${ini + 1} a ${fim}.`,
      aulas: [1, 2, 3].map((n) => ({
        titulo: `${materia}: aula ${mi * 3 + n}`,
        descricao: `Estudo guiado da parte ${mi + 1}.${n}.`,
        duracao_min: 10,
        escopo: trecho || `Conceitos e aplicações principais de ${materia}.`,
      })),
    };
  });
  return { titulo_sugerido: titulo, materia_sugerida: materia, modulos };
}

function splitSentences(text: string, max = 8) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  return sentences.slice(0, max);
}

function pickSentences(text: string, start: number, count: number, fallback: string) {
  const sentences = splitSentences(text, start + count + 2).slice(start, start + count);
  return sentences.length ? sentences.join(" ") : fallback;
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function buildPares(titulo: string, base: string, termos: string[]) {
  const sentences = splitSentences(base, 24);
  const pool = termos.length ? termos : ["conceito", "regra", "exceção", "aplicação", "fundamento"];
  return pool.slice(0, 5).map((termo, i) => {
    const frase = sentences[i] || sentences[(i + 3) % Math.max(1, sentences.length)] || `Elemento essencial no estudo de ${titulo}.`;
    return { termo: cap(termo), definicao: compactText(frase, 160) };
  });
}

function buildRamos(titulo: string, escopo: string, termos: string[]) {
  const base = termos.length >= 4 ? termos.slice(0, 4) : [...termos, "conceito", "regra", "aplicação", "exceção"].slice(0, 4);
  const frases = splitSentences(escopo, 6);
  return base.map((t, i) => ({
    titulo: cap(t),
    descricao: compactText(frases[i] || `Aspecto relevante de ${titulo}.`, 110),
  }));
}

function buildLocalSlides(aula: any, trechos: string) {
  const titulo = String(aula?.titulo ?? "Aula");
  const escopo = String(aula?.escopo ?? aula?.descricao ?? "Tema central da aula.");
  const base = compactText(trechos.replace(/PÁGINA \d+:/g, " ").replace(/---/g, " "), 12_000);

  const c1 = pickSentences(base, 0, 4, escopo);
  const c2 = pickSentences(base, 4, 4, escopo);
  const ex1 = pickSentences(base, 8, 3, `Aplique ${titulo} a um caso concreto, identificando conceito, regra e consequência.`);
  const ex2 = pickSentences(base, 11, 3, `Outro ângulo de ${titulo}: observe o fato, enquadre na norma e conclua.`);
  const casoTexto = pickSentences(base, 14, 3, `Situação envolvendo ${titulo}.`);
  const analise = pickSentences(base, 5, 3, `Identifique o instituto, destaque os fatos relevantes e aplique a regra estudada.`);

  const termos = extractTokens(titulo, escopo, base).slice(0, 8);
  const pares = buildPares(titulo, base, termos);
  const ramos = buildRamos(titulo, escopo, termos);
  const bulletsEsquema = (termos.slice(0, 5).length ? termos.slice(0, 5) : ["conceito", "regra", "exceção", "aplicação"])
    .map((t) => `${cap(t)} — ponto-chave do tema.`);

  let ordem = 0;
  const next = () => ordem++;

  return [
    { ordem: next(), tipo: "capa", conteudo: { titulo, objetivos: ["Compreender o tema no contexto da OAB", "Identificar conceitos centrais", "Aplicar o raciocínio em questões práticas"] }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "conceito", conteudo: { titulo: "Base conceitual", texto: c1, destaque: "Domine o conceito antes de resolver o caso." }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "esquema", conteudo: { titulo: "Mapa do conteúdo", bullets: bulletsEsquema }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "exemplo", conteudo: { titulo: "Aplicação prática", texto: ex1, destaque: "Conecte fato, regra e consequência." }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "quiz", conteudo: { titulo: "Checagem rápida" }, imagem_url: null, quiz_json: {
      pergunta: `Sobre ${titulo}, qual afirmação é correta?`,
      alternativas: [
        { letra: "A", texto: "O instituto exige análise conjunta de conceito, regra aplicável e situação fática" },
        { letra: "B", texto: "Basta decorar a palavra-chave para acertar a questão" },
        { letra: "C", texto: "O tema independe do contexto da OAB" },
        { letra: "D", texto: "A regra não admite qualquer exceção" },
      ],
      correta: "A",
      explicacao: "A correta é A: o raciocínio jurídico exige integrar conceito, norma e fato. B reduz o estudo à memorização; C ignora o recorte da prova; D é absoluta e por isso falsa.",
    } },

    { ordem: next(), tipo: "conceito", conteudo: { titulo: "Aprofundamento", texto: c2, destaque: "Atenção às palavras que alteram o alcance da regra." }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "comparativo", conteudo: { titulo: "Regra x Exceção", colunas: [
      { titulo: "Regra geral", bullets: ["Aplica-se à maioria dos casos", "Decorre direto do conteúdo estudado", "Cobra-se com frequência na OAB"] },
      { titulo: "Exceções e cuidados", bullets: ["Hipóteses restritas previstas no material", "Exigem leitura atenta do enunciado", "Costumam ser pegadinha de prova"] },
    ] }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "ligar_termos", conteudo: { titulo: "Ligue os termos", pares }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "caso_pratico", conteudo: {
      titulo: "Caso prático",
      enunciado: compactText(casoTexto, 320),
      pergunta: `Qual é o primeiro passo para resolver corretamente uma questão sobre ${titulo}?`,
      analise: compactText(analise, 360),
    }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "quiz", conteudo: { titulo: "Aplicação em prova" }, imagem_url: null, quiz_json: {
      pergunta: `Em uma questão prática de ${titulo}, o examinador costuma cobrar:`,
      alternativas: [
        { letra: "A", texto: "A identificação do instituto e a consequência jurídica correta" },
        { letra: "B", texto: "A repetição literal de doutrina" },
        { letra: "C", texto: "A escolha da alternativa mais longa" },
        { letra: "D", texto: "Resposta baseada em intuição pessoal" },
      ],
      correta: "A",
      explicacao: "A correta é A: a OAB cobra raciocínio aplicado. B confunde estudo com decoreba; C é um chute; D ignora a técnica jurídica.",
    } },

    { ordem: next(), tipo: "mapa_mental", conteudo: { titulo: "Mapa mental", central: titulo, ramos }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "dicas", conteudo: { titulo: "Dicas de prova", dicas: [
      { tipo: "dica", texto: "Leia o enunciado caçando a regra cobrada." },
      { tipo: "atencao", texto: "Cuidado com alternativas absolutas (sempre, nunca, jamais) — costumam ser falsas." },
      { tipo: "alvo", texto: "Foque nos termos que aparecem repetidos no material — sinalizam o que cai." },
      { tipo: "estrela", texto: "Treine ligando o conceito teórico ao caso concreto." },
    ] }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "exemplo", conteudo: { titulo: "Outra aplicação", texto: ex2, destaque: "Variar o cenário ajuda a fixar a regra." }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "quiz", conteudo: { titulo: "Pegadinha clássica" }, imagem_url: null, quiz_json: {
      pergunta: `Sobre ${titulo}, qual alternativa apresenta um ERRO comum?`,
      alternativas: [
        { letra: "A", texto: "Tratar a exceção como se fosse a regra geral" },
        { letra: "B", texto: "Identificar o instituto antes de responder" },
        { letra: "C", texto: "Confrontar fato e norma" },
        { letra: "D", texto: "Verificar a consequência jurídica" },
      ],
      correta: "A",
      explicacao: "A correta é A: confundir exceção com regra é o erro clássico. B, C e D descrevem o método correto de resolução.",
    } },

    { ordem: next(), tipo: "resumo", conteudo: { titulo: "Resumo da aula", bullets: [
      "Conceito central do tema",
      "Regra geral e principais exceções",
      "Aplicação em caso prático",
      "Vocabulário essencial",
      "Erros comuns a evitar",
      "Estratégia para a prova da OAB",
    ] }, imagem_url: null, quiz_json: null },

    { ordem: next(), tipo: "quiz", conteudo: { titulo: "Questão final integradora" }, imagem_url: null, quiz_json: {
      pergunta: `Em uma questão de OAB sobre ${titulo}, o melhor caminho é:`,
      alternativas: [
        { letra: "A", texto: "Ler os fatos, identificar o instituto e aplicar a consequência jurídica prevista" },
        { letra: "B", texto: "Escolher a alternativa mais longa" },
        { letra: "C", texto: "Desconsiderar o contexto fático" },
        { letra: "D", texto: "Responder apenas por familiaridade com o tema" },
      ],
      correta: "A",
      explicacao: "A é correta porque reproduz o método jurídico: fato → norma → consequência. B, C e D são atalhos inseguros que costumam levar ao erro.",
    } },

    { ordem: next(), tipo: "conclusao", conteudo: {
      titulo: "Fechamento",
      texto: `Você percorreu os pontos centrais de ${titulo}: conceito, regra, exceções, aplicação e estratégia de prova.`,
      bullets: ["Revise os pares termo–definição", "Refaça os quizzes errados", "Avance para a próxima aula"],
    }, imagem_url: null, quiz_json: null },
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
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 110_000);
  try {
    const res = await geminiGenerateContent(MODEL, {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
        maxOutputTokens: maxTokens,
      },
    }, {
      maxAttemptsPerKey: 2,
      backoffMs: 1200,
      signal: ac.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Gemini ${res.status}: ${txt.slice(0, 300)}`);
    }
    const j = await res.json();
    const finishReason = j?.candidates?.[0]?.finishReason;
    const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
    if (!text && finishReason) {
      throw new Error(`Gemini terminou sem texto (motivo: ${finishReason})`);
    }
    if (finishReason === "MAX_TOKENS") {
      throw new Error(`Resposta do Gemini truncada por limite de tokens (len=${text.length})`);
    }
    return tryParseJson(text);
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Gemini demorou demais nesta etapa; o material foi reduzido e pode ser tentado de novo.");
    throw e;
  } finally {
    clearTimeout(timeout);
  }
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
          .select("markdown, paginas")
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
        const markdownCompleto = String(extr.markdown ?? "");
        const paginasFonte = Array.isArray(extr.paginas) ? (extr.paginas as PaginaFonte[]) : [];
        const markdownPlanejamento = buildPlanningMaterial(paginasFonte, markdownCompleto);

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
              const userEsq = `Curso sugerido: ${tituloIn}\nMatéria: ${materiaIn}\n\nAMOSTRA REPRESENTATIVA DO MATERIAL EM MARKDOWN:\n${markdownPlanejamento}`;
              let esqueleto: any;
              try {
                esqueleto = await callGeminiJson(SYSTEM_ESQUELETO, userEsq, 12_000);
              } catch (e: any) {
                console.error("[preview] esqueleto falhou; usando fallback:", e?.message);
                esqueleto = fallbackEsqueleto(tituloIn, materiaIn, paginasFonte, markdownCompleto);
              }

              const titulo_sugerido = esqueleto?.titulo_sugerido ?? tituloIn;
              const materia_sugerida = esqueleto?.materia_sugerida ?? materiaIn;
              const modulosBase: any[] = limitarTotalAulas(Array.isArray(esqueleto?.modulos) ? esqueleto.modulos : []);
              if (modulosBase.length === 0) throw new Error("Esqueleto vazio (sem módulos)");

              // Conta total de aulas
              const totalAulas = modulosBase.reduce(
                (acc, m) => acc + (Array.isArray(m?.aulas) ? m.aulas.length : 0),
                0,
              );
              send("progress", { fase: "esqueleto", aula: 0, total: totalAulas, modulos: modulosBase.length });

              // ---- PASS 2: slides por AULA (chamadas menores, mais resilientes) ----
              let feita = 0;
              const modulosOut: any[] = [];
              for (const mod of modulosBase) {
                const aulasIn: any[] = Array.isArray(mod?.aulas) ? mod.aulas : [];
                const aulasOut: any[] = [];
                for (const aul of aulasIn) {
                  const trechos = buildLessonMaterial(paginasFonte, markdownCompleto, {
                    modulo: mod.titulo,
                    aula: aul.titulo,
                    descricao: aul.descricao,
                    escopo: aul.escopo,
                  }, 14_000);
                  const slides = buildLocalSlides(aul, trechos);
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
