import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============ Helpers ============
type LogEntry = { ts: string; nivel: "info" | "ok" | "erro"; msg: string };

async function assertAdmin(supabase: ReturnType<typeof supabaseAdmin.from> extends never ? never : any, userId: string) {
  const role = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!role.data) throw new Error("Acesso negado");
}

async function appendLog(jobId: string, nivel: LogEntry["nivel"], msg: string) {
  const { data } = await supabaseAdmin
    .from("simulado_jobs")
    .select("logs")
    .eq("id", jobId)
    .single();
  const logs: LogEntry[] = (data?.logs as LogEntry[]) ?? [];
  logs.push({ ts: new Date().toISOString(), nivel, msg });
  await supabaseAdmin.from("simulado_jobs").update({ logs }).eq("id", jobId);
}

async function mistralOcr(apiKey: string, documentUrl: string): Promise<string> {
  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: { type: "document_url", document_url: documentUrl },
      include_image_base64: false,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Mistral OCR falhou [${res.status}]: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as { pages?: Array<{ markdown?: string }> };
  return (json.pages ?? []).map((p) => p.markdown ?? "").join("\n\n");
}

async function geminiExtractJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    },
  );
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error("Limite de requisições do Gemini atingido. Aguarde alguns segundos.");
    if (res.status === 403) throw new Error("Chave Gemini inválida ou sem permissão (403).");
    throw new Error(`Gemini falhou [${res.status}]: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

const QuestaoSchema = z.object({
  numero: z.number().int().min(1).max(200),
  enunciado: z.string().min(10),
  materia: z.string().min(2),
  alternativas: z.object({
    A: z.string().min(1),
    B: z.string().min(1),
    C: z.string().min(1),
    D: z.string().min(1),
  }),
});

// gabarito_oficial: { [numero]: { letra, anulada, nota } } (aceita formato antigo)
type GabaritoEntry = { letra: "A" | "B" | "C" | "D" | null; anulada: boolean; nota: string | null };
function normalizeGabarito(raw: unknown): Record<string, GabaritoEntry> {
  const out: Record<string, GabaritoEntry> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") {
      const L = v.toUpperCase().trim();
      out[k] = ["A", "B", "C", "D"].includes(L)
        ? { letra: L as GabaritoEntry["letra"], anulada: false, nota: null }
        : { letra: null, anulada: true, nota: v };
    } else if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      const letra = typeof obj.letra === "string" ? obj.letra.toUpperCase().trim() : null;
      out[k] = {
        letra: letra && ["A", "B", "C", "D"].includes(letra) ? (letra as GabaritoEntry["letra"]) : null,
        anulada: Boolean(obj.anulada),
        nota: typeof obj.nota === "string" ? obj.nota : null,
      };
    }
  }
  return out;
}
function hasGabaritoEntry(g: Record<string, GabaritoEntry>, numero: number): boolean {
  const e = g[String(numero)];
  return !!e && (e.anulada || !!e.letra);
}

// ============ Lista de provas com status ============
export const listProvasComStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const [provas, simulados] = await Promise.all([
      supabase
        .from("provas_oab")
        .select("numero, titulo, ano, prova_1fase_url, gabarito_1fase_url")
        .order("numero", { ascending: false }),
      supabase
        .from("simulados")
        .select("id, prova_numero, status, total_questoes, erro_msg, created_at")
        .order("created_at", { ascending: false }),
    ]);
    if (provas.error) throw new Error(provas.error.message);
    if (simulados.error) throw new Error(simulados.error.message);

    const simByProva = new Map<number, (typeof simulados.data)[number]>();
    for (const s of simulados.data ?? []) {
      if (!simByProva.has(s.prova_numero)) simByProva.set(s.prova_numero, s);
    }
    return (provas.data ?? []).map((p) => ({
      ...p,
      simulado: simByProva.get(p.numero) ?? null,
    }));
  });

// ============ ETAPA 1: Criar job (instantâneo) ============
const BATCH_SIZE = 20; // questões por batch

export const iniciarJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provaNumero: number }) =>
    z.object({ provaNumero: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const prova = await supabase
      .from("provas_oab")
      .select("numero, titulo, prova_1fase_url, gabarito_1fase_url")
      .eq("numero", data.provaNumero)
      .maybeSingle();
    if (prova.error) throw new Error(prova.error.message);
    if (!prova.data) throw new Error("Prova não encontrada");
    if (!prova.data.prova_1fase_url || !prova.data.gabarito_1fase_url) {
      throw new Error("Prova ou gabarito sem PDF cadastrado");
    }

    const ins = await supabaseAdmin
      .from("simulado_jobs")
      .insert({
        prova_numero: prova.data.numero,
        etapa: "ocr",
        gerado_por: userId,
        iniciado_em: new Date().toISOString(),
        logs: [
          { ts: new Date().toISOString(), nivel: "info", msg: `Job criado para ${prova.data.titulo}` },
        ],
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    return { jobId: ins.data.id, titulo: prova.data.titulo };
  });

// ============ ETAPA 2: OCR (só lê PDFs) ============
export const executarOcr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY não configurada");

    const job = await supabaseAdmin
      .from("simulado_jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (job.error || !job.data) throw new Error("Job não encontrado");
    if (job.data.etapa !== "ocr") return { ok: true, ja: true };

    const prova = await supabaseAdmin
      .from("provas_oab")
      .select("numero, titulo, ano, prova_1fase_url, gabarito_1fase_url")
      .eq("numero", job.data.prova_numero)
      .single();
    if (prova.error || !prova.data) throw new Error("Prova não encontrada");

    try {
      await appendLog(data.jobId, "info", "Baixando e lendo PDF da prova via Mistral OCR…");
      const provaTxt = await mistralOcr(apiKey, prova.data.prova_1fase_url!);
      await appendLog(data.jobId, "ok", `Prova OCR: ${Math.round(provaTxt.length / 1000)}k caracteres extraídos`);

      await appendLog(data.jobId, "info", "Baixando e lendo PDF do gabarito…");
      const gabTxt = await mistralOcr(apiKey, prova.data.gabarito_1fase_url!);
      await appendLog(data.jobId, "ok", `Gabarito OCR: ${Math.round(gabTxt.length / 1000)}k caracteres extraídos`);

      await supabaseAdmin
        .from("simulado_jobs")
        .update({
          ocr_prova: provaTxt,
          ocr_gabarito: gabTxt,
          etapa: "analisando",
        })
        .eq("id", data.jobId);

      return { ok: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await appendLog(data.jobId, "erro", msg);
      await supabaseAdmin
        .from("simulado_jobs")
        .update({ etapa: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", data.jobId);
      throw new Error(msg);
    }
  });

// ============ ETAPA 2b: Analisar prova (conta total + extrai gabarito) ============
export const analisarProva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const job = await supabaseAdmin
      .from("simulado_jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (job.error || !job.data) throw new Error("Job não encontrado");
    if (job.data.etapa === "gerando" || job.data.etapa === "validando" || job.data.etapa === "pronto") {
      return { ok: true, ja: true };
    }
    if (job.data.etapa !== "analisando") throw new Error(`Job em etapa ${job.data.etapa}`);

    const prova = await supabaseAdmin
      .from("provas_oab")
      .select("numero, titulo, ano")
      .eq("numero", job.data.prova_numero)
      .single();
    if (prova.error || !prova.data) throw new Error("Prova não encontrada");

    try {
      await appendLog(data.jobId, "info", "Analisando prova: contando questões e extraindo gabarito oficial…");

      const system =
        "Você analisa Exames da OAB a partir de OCR. Retorne SEMPRE JSON válido. " +
        "NUNCA invente respostas — extraia o gabarito EXATAMENTE como aparece no documento oficial.";

      const userPrompt = `Analise o material abaixo e retorne EXATAMENTE este JSON:
{
  "total_questoes": <inteiro com o número total de questões objetivas da prova>,
  "gabarito": [ { "numero": <int>, "letra": "A"|"B"|"C"|"D"|null, "anulada": <bool>, "nota": <string|null> }, ... ]
}

Regras:
- Conte o NÚMERO REAL de questões na prova (provavelmente 80, mas pode variar).
- O gabarito deve ter UMA entrada por questão.
- Se o gabarito oficial marca a questão como ANULADA / Anulada / "Recurso deferido" / "Sem resposta", retorne "letra": null, "anulada": true, e em "nota" o texto bruto (ex.: "Anulada", "Recurso deferido").
- Se houver letra normal, retorne "letra" com A/B/C/D, "anulada": false, "nota": null.
- NUNCA invente uma letra para questões anuladas. Anuladas DEVEM ter letra null.
- NÃO inclua nada além do JSON.

===== PROVA =====
${(job.data.ocr_prova ?? "").slice(0, 90000)}

===== GABARITO =====
${(job.data.ocr_gabarito ?? "").slice(0, 30000)}`;

      const raw = await geminiExtractJson(system, userPrompt);
      let parsed: {
        total_questoes?: number;
        gabarito?: Array<{ numero: number; letra?: string | null; anulada?: boolean; nota?: string | null }>;
      } = {};
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("Gemini retornou JSON inválido na análise");
      }

      const totalQ = Number(parsed.total_questoes);
      if (!totalQ || totalQ < 10 || totalQ > 200) {
        throw new Error(`Total de questões inválido detectado: ${parsed.total_questoes}`);
      }

      const gabaritoMap: Record<string, GabaritoEntry> = {};
      let anuladasCount = 0;
      for (const g of parsed.gabarito ?? []) {
        const n = Number(g.numero);
        if (!(n >= 1 && n <= totalQ)) continue;
        const letra = String(g.letra ?? "").toUpperCase().trim();
        const anulada = Boolean(g.anulada);
        if (anulada) {
          gabaritoMap[String(n)] = { letra: null, anulada: true, nota: g.nota ?? "Anulada" };
          anuladasCount++;
        } else if (["A", "B", "C", "D"].includes(letra)) {
          gabaritoMap[String(n)] = { letra: letra as GabaritoEntry["letra"], anulada: false, nota: null };
        }
      }

      const gabCount = Object.keys(gabaritoMap).length;
      await appendLog(
        data.jobId,
        gabCount === totalQ ? "ok" : "info",
        `Prova tem ${totalQ} questões. Gabarito com ${gabCount} respostas extraídas${
          anuladasCount ? ` (${anuladasCount} anuladas)` : ""
        }.${gabCount !== totalQ ? " (algumas faltam)" : ""}`,
      );

      // Cria simulado (remove anterior se houver)
      await supabaseAdmin.from("simulados").delete().eq("prova_numero", prova.data.numero);
      const sim = await supabaseAdmin
        .from("simulados")
        .insert({
          prova_numero: prova.data.numero,
          titulo: `Simulado ${prova.data.titulo}`,
          ano: prova.data.ano,
          status: "gerando",
          gerado_por: userId,
        })
        .select("id")
        .single();
      if (sim.error) throw new Error(sim.error.message);

      const batches = Math.max(1, Math.ceil(totalQ / BATCH_SIZE));
      await supabaseAdmin
        .from("simulado_jobs")
        .update({
          total_estimado: totalQ,
          gabarito_oficial: gabaritoMap as never,
          simulado_id: sim.data.id,
          batches_total: batches,
          batch_atual: 0,
          etapa: "gerando",
        })
        .eq("id", data.jobId);

      await appendLog(data.jobId, "info", `Iniciando extração em ${batches} lotes de até ${BATCH_SIZE} questões.`);

      return { ok: true, total: totalQ, batches };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await appendLog(data.jobId, "erro", `Falha na análise: ${msg}`);
      await supabaseAdmin
        .from("simulado_jobs")
        .update({ etapa: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", data.jobId);
      throw new Error(msg);
    }
  });

// ============ Helpers anti-invenção ============
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Indexa as posições dos marcadores de questão no OCR.
// Formatos reconhecidos (no início de linha):
//   "# N", "## N" (Markdown — Mistral OCR)
//   "Questão N" / "QUESTÃO N"
//   "N" sozinho na linha (formato bruto do Mistral OCR — número da questão isolado)
//   "N." ou "N)" no começo de linha (fallback)
// Para o caso de "N sozinho" e "N./N)", só aceitamos quando o número é SEQUENCIAL
// (1, 2, 3, …) e há "(A)" e "(B)" nas próximas ~80 linhas (cara de questão objetiva).
function indexQuestionPositions(ocr: string): Map<number, number> {
  const positions = new Map<number, number>();
  const lines = ocr.split("\n");

  // Pré-calcula offset (índice no OCR) de cada linha
  const offsets: number[] = new Array(lines.length);
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    offsets[i] = acc;
    acc += lines[i].length + 1; // +1 pelo \n
  }

  const reHeader = /^[ \t]*#{1,6}[ \t]*(\d{1,3})[ \t]*$/;
  const reQuestao = /^[ \t]*quest[ãa]o[ \t]*(\d{1,3})\b/i;
  const reBare = /^[ \t]*(\d{1,3})[ \t]*$/;
  const reDotted = /^[ \t]*(\d{1,3})[\.)][ \t]+/;

  const hasAlternativasProximas = (idxLinha: number): boolean => {
    const fim = Math.min(lines.length, idxLinha + 80);
    let viuA = false;
    let viuB = false;
    for (let j = idxLinha + 1; j < fim; j++) {
      const l = lines[j];
      if (/^\s*\(A\)/.test(l)) viuA = true;
      else if (/^\s*\(B\)/.test(l)) viuB = true;
      if (viuA && viuB) return true;
      // se já bate outra questão, para
      if (j > idxLinha + 2 && (reHeader.test(l) || reQuestao.test(l) || reBare.test(l))) {
        // não interrompe imediatamente — só se já passamos o início
      }
    }
    return viuA && viuB;
  };

  let proximoEsperado = 1; // para validar formato "N sozinho" sequencial

  for (let i = 0; i < lines.length; i++) {
    const linha = lines[i];
    let n: number | null = null;
    let exigeValidacao = false;

    let m = reHeader.exec(linha);
    if (m) {
      n = Number(m[1]);
    } else if ((m = reQuestao.exec(linha))) {
      n = Number(m[1]);
    } else if ((m = reBare.exec(linha))) {
      n = Number(m[1]);
      exigeValidacao = true;
    } else if ((m = reDotted.exec(linha))) {
      n = Number(m[1]);
      exigeValidacao = true;
    }

    if (n === null) continue;
    if (n < 1 || n > 80) continue;
    if (positions.has(n)) continue;

    if (exigeValidacao) {
      // só aceita se for sequencial E tiver (A)/(B) próximos
      if (n !== proximoEsperado) continue;
      if (!hasAlternativasProximas(i)) continue;
    }

    positions.set(n, offsets[i]);
    if (n >= proximoEsperado) proximoEsperado = n + 1;
  }

  return positions;
}

// Recorta o trecho do OCR que contém as questões pedidas (sem truncar o resto)
function sliceOcrForRange(ocr: string, numeros: number[]): { trecho: string; ausentes: number[] } {
  const positions = indexQuestionPositions(ocr);
  const presentes = numeros.filter((n) => positions.has(n));
  const ausentes = numeros.filter((n) => !positions.has(n));
  if (presentes.length === 0) return { trecho: "", ausentes };
  const minN = Math.min(...presentes);
  const maxN = Math.max(...presentes);
  const start = Math.max(0, (positions.get(minN) ?? 0) - 200);
  // fim = início da próxima questão depois de maxN, ou fim do OCR
  let fimPos = ocr.length;
  for (let k = maxN + 1; k <= maxN + 5; k++) {
    const p = positions.get(k);
    if (p !== undefined) {
      fimPos = p;
      break;
    }
  }
  const end = Math.min(ocr.length, fimPos + 200);
  return { trecho: ocr.slice(start, end), ausentes };
}

// Verifica se o enunciado realmente aparece no OCR original (anti-alucinação)
function enunciadoAparece(enunciado: string, ocrNorm: string): boolean {
  const norm = normalizeForMatch(enunciado);
  if (norm.length < 30) return ocrNorm.includes(norm);
  // testa 3 janelas distintas do enunciado
  const probes = [norm.slice(0, 50), norm.slice(20, 80), norm.slice(40, 100)].filter(
    (p) => p.length >= 30,
  );
  return probes.some((p) => ocrNorm.includes(p));
}

const MATERIAS_VALIDAS = [
  "Ética e Estatuto da OAB",
  "Direito Constitucional",
  "Direito Civil",
  "Processo Civil",
  "Direito Penal",
  "Processo Penal",
  "Direito do Trabalho",
  "Processo do Trabalho",
  "Direito Tributário",
  "Direito Administrativo",
  "Direito Empresarial",
  "Filosofia do Direito",
  "Direitos Humanos",
  "Direito Internacional",
  "Direito Ambiental",
  "Direito Eleitoral",
  "ECA",
];

// ============ Helper: extrai questões dentro de um range ============
async function extrairQuestoes(
  jobId: string,
  ocrProva: string,
  numeros: number[],
  gabarito: Record<string, GabaritoEntry>,
): Promise<z.infer<typeof QuestaoSchema>[]> {
  if (numeros.length === 0) return [];

  const ocrNorm = normalizeForMatch(ocrProva);

  const system =
    "Você EXTRAI (não cria) questões objetivas do Exame da OAB a partir de OCR. " +
    "É PROIBIDO inventar, completar, reformular ou parafrasear. " +
    "Toda questão retornada deve poder ser encontrada PALAVRA POR PALAVRA no texto fornecido. " +
    "Se uma questão pedida não estiver no texto, OMITA-A do JSON. Retorne SEMPRE JSON válido.";

  const validasMap = new Map<number, z.infer<typeof QuestaoSchema>>();
  const alvoSet = new Set(numeros);
  const descartadasInvencao: number[] = [];

  // Faz uma chamada por grupo de até `groupSize` números
  const runForGroup = async (grupo: number[]): Promise<void> => {
    const { trecho, ausentes } = sliceOcrForRange(ocrProva, grupo);
    if (ausentes.length > 0) {
      await appendLog(
        jobId,
        "info",
        `OCR não contém marcador "Questão" para: ${ausentes.slice(0, 10).join(", ")}${ausentes.length > 10 ? "…" : ""}.`,
      );
    }
    if (trecho.length === 0) return;

    const userPrompt = `Extraia as questões de números ${grupo.join(", ")} do trecho de OCR abaixo.

REGRAS OBRIGATÓRIAS:
- Copie enunciado e alternativas EXATAMENTE como aparecem no texto.
- Se uma questão pedida NÃO estiver presente no trecho, OMITA-A do JSON. NÃO invente.
- NÃO complete questões parciais.

Cada questão deve ter:
- numero (inteiro)
- enunciado (texto da questão sem as alternativas)
- materia (uma de: ${MATERIAS_VALIDAS.map((m) => `"${m}"`).join(", ")})
- alternativas: { A, B, C, D } (texto completo de cada alternativa, copiado do OCR)

Retorne JSON: { "questoes": [ ... ] }

===== OCR =====
${trecho.slice(0, 90000)}`;

    let raw: string;
    try {
      raw = await geminiExtractJson(system, userPrompt);
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      await appendLog(jobId, "info", `Gemini falhou no grupo ${grupo[0]}–${grupo[grupo.length - 1]}: ${m}`);
      return;
    }
    let parsed: { questoes?: unknown[] } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      await appendLog(jobId, "info", `JSON inválido no grupo ${grupo[0]}–${grupo[grupo.length - 1]}`);
      return;
    }
    for (const q of parsed.questoes ?? []) {
      const r = QuestaoSchema.safeParse(q);
      if (!r.success) continue;
      if (!alvoSet.has(r.data.numero)) continue;
      if (!hasGabaritoEntry(gabarito, r.data.numero)) continue;
      // ★ Validação anti-invenção: enunciado precisa aparecer no OCR original
      if (!enunciadoAparece(r.data.enunciado, ocrNorm)) {
        descartadasInvencao.push(r.data.numero);
        continue;
      }
      // ★ Validação de matéria: só aceita matéria da lista oficial
      let materiaFinal = MATERIAS_VALIDAS.find(
        (m) => normalizeForMatch(m) === normalizeForMatch(r.data.materia),
      );
      if (!materiaFinal) {
        // Fallback: pede pra Gemini classificar só a matéria
        materiaFinal = await classificarMateria(r.data.enunciado, r.data.alternativas);
      }
      if (!materiaFinal) continue; // sem matéria confiável → não salva
      validasMap.set(r.data.numero, { ...r.data, materia: materiaFinal });
    }
  };

  // Quebra `numeros` em grupos de no máx. 5 questões (janelas pequenas = mais assertivo)
  const GROUP = 5;
  for (let i = 0; i < numeros.length; i += GROUP) {
    const grupo = numeros.slice(i, i + GROUP);
    if (grupo.every((n) => validasMap.has(n))) continue;
    await runForGroup(grupo);
  }

  // Retry só para faltantes (1x)
  const faltantes = numeros.filter((n) => !validasMap.has(n));
  if (faltantes.length > 0) {
    await appendLog(
      jobId,
      "info",
      `Faltam ${faltantes.length} questões após 1ª passada (${faltantes.slice(0, 10).join(", ")}${faltantes.length > 10 ? "…" : ""}). Retentando individualmente…`,
    );
    for (const n of faltantes) {
      await runForGroup([n]);
    }
  }

  if (descartadasInvencao.length > 0) {
    await appendLog(
      jobId,
      "info",
      `Descartadas ${descartadasInvencao.length} questão(ões) por invenção (não aparecem no OCR): ${descartadasInvencao.slice(0, 10).join(", ")}${descartadasInvencao.length > 10 ? "…" : ""}.`,
    );
  }

  return Array.from(validasMap.values()).sort((a, b) => a.numero - b.numero);
}

// ============ ETAPA 3: Processar um batch ============
export const processarBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string; batchIndex: number }) =>
    z.object({ jobId: z.string().uuid(), batchIndex: z.number().int().min(0) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada");

    const job = await supabaseAdmin
      .from("simulado_jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (job.error || !job.data) throw new Error("Job não encontrado");
    if (job.data.etapa !== "gerando") throw new Error(`Job em etapa ${job.data.etapa}`);
    if (!job.data.simulado_id) throw new Error("Simulado não vinculado");

    const inicio = data.batchIndex * BATCH_SIZE + 1;
    const fim = Math.min((data.batchIndex + 1) * BATCH_SIZE, job.data.total_estimado);
    const numerosAlvo: number[] = [];
    for (let n = inicio; n <= fim; n++) numerosAlvo.push(n);

    const gabarito = normalizeGabarito(job.data.gabarito_oficial);
    const simuladoId = job.data.simulado_id as string;

    try {
      await appendLog(data.jobId, "info", `Lote ${data.batchIndex + 1}/${job.data.batches_total}: questões ${inicio}–${fim}`);

      const validas = await extrairQuestoes(data.jobId, job.data.ocr_prova ?? "", numerosAlvo, gabarito);

      if (validas.length > 0) {
        await supabaseAdmin
          .from("simulado_questoes")
          .delete()
          .eq("simulado_id", simuladoId)
          .in("numero", validas.map((q) => q.numero));

        const rows = validas.map((q) => {
          const g = gabarito[String(q.numero)];
          const anulada = !!g?.anulada;
          return {
            simulado_id: simuladoId,
            numero: q.numero,
            enunciado: q.enunciado,
            materia: q.materia,
            alternativas: q.alternativas,
            resposta_correta: anulada ? null : (g?.letra ?? null),
            status: anulada ? "anulada" : "ok",
            nota_oficial: g?.nota ?? null,
          };
        });
        const insQ = await supabaseAdmin.from("simulado_questoes").insert(rows);
        if (insQ.error) throw new Error(insQ.error.message);
      }

      // Recount real no banco (em vez de incrementar)
      const cnt = await supabaseAdmin
        .from("simulado_questoes")
        .select("numero", { count: "exact", head: true })
        .eq("simulado_id", simuladoId);
      const novoTotal = cnt.count ?? 0;

      const proximoIndex = data.batchIndex + 1;
      const ultimoLote = proximoIndex >= job.data.batches_total;

      await supabaseAdmin
        .from("simulado_jobs")
        .update({
          batch_atual: proximoIndex,
          questoes_processadas: novoTotal,
          etapa: ultimoLote ? "validando" : "gerando",
        })
        .eq("id", data.jobId);

      const anuladasLote = validas.filter((q) => gabarito[String(q.numero)]?.anulada).length;
      await appendLog(
        data.jobId,
        "ok",
        `Lote ${data.batchIndex + 1} concluído (+${validas.length} questões${anuladasLote ? `, ${anuladasLote} anuladas` : ""})`,
      );

      return { proximo: ultimoLote ? null : proximoIndex, processadas: novoTotal };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await appendLog(data.jobId, "erro", `Falha no lote ${data.batchIndex + 1}: ${msg}`);
      await supabaseAdmin
        .from("simulado_jobs")
        .update({ etapa: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", data.jobId);
      await supabaseAdmin
        .from("simulados")
        .update({ status: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", simuladoId);
      throw new Error(msg);
    }
  });

// ============ ETAPA 4: Validar / refazer faltantes ============
export const validarFinal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const job = await supabaseAdmin
      .from("simulado_jobs")
      .select("*")
      .eq("id", data.jobId)
      .single();
    if (job.error || !job.data) throw new Error("Job não encontrado");
    if (!job.data.simulado_id) throw new Error("Simulado não vinculado");
    if (job.data.etapa === "pronto") return { ok: true, ja: true };

    const simuladoId = job.data.simulado_id as string;
    const total = job.data.total_estimado as number;
    const gabarito = normalizeGabarito(job.data.gabarito_oficial);

    try {
      // Tenta refazer faltantes até 3 vezes
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        const existentes = await supabaseAdmin
          .from("simulado_questoes")
          .select("numero")
          .eq("simulado_id", simuladoId);
        if (existentes.error) throw new Error(existentes.error.message);
        const presentes = new Set((existentes.data ?? []).map((r) => r.numero));
        const faltantes: number[] = [];
        for (let n = 1; n <= total; n++) {
          if (!presentes.has(n) && hasGabaritoEntry(gabarito, n)) faltantes.push(n);
        }

        if (faltantes.length === 0) break;

        await appendLog(
          data.jobId,
          "info",
          `Validação ${tentativa}/3: ${faltantes.length} questões ainda faltam (${faltantes.slice(0, 15).join(", ")}${faltantes.length > 15 ? "…" : ""}). Refazendo…`,
        );

        const validas = await extrairQuestoes(data.jobId, job.data.ocr_prova ?? "", faltantes, gabarito);
        if (validas.length > 0) {
          const rows = validas.map((q) => {
            const g = gabarito[String(q.numero)];
            const anulada = !!g?.anulada;
            return {
              simulado_id: simuladoId,
              numero: q.numero,
              enunciado: q.enunciado,
              materia: q.materia,
              alternativas: q.alternativas,
              resposta_correta: anulada ? null : (g?.letra ?? null),
              status: anulada ? "anulada" : "ok",
              nota_oficial: g?.nota ?? null,
            };
          });
          const ins = await supabaseAdmin.from("simulado_questoes").insert(rows);
          if (ins.error) throw new Error(ins.error.message);
        } else {
          await appendLog(data.jobId, "info", `Validação ${tentativa}: Gemini não retornou questões válidas.`);
        }
      }

      // Após retentativas, marca as ainda faltantes como falhou_extracao
      const existentesFinal = await supabaseAdmin
        .from("simulado_questoes")
        .select("numero")
        .eq("simulado_id", simuladoId);
      const presentesFinal = new Set((existentesFinal.data ?? []).map((r) => r.numero));
      const placeholders: Array<{
        simulado_id: string;
        numero: number;
        enunciado: string;
        materia: string | null;
        alternativas: { A: string; B: string; C: string; D: string };
        resposta_correta: string | null;
        status: string;
        nota_oficial: string | null;
      }> = [];
      for (let n = 1; n <= total; n++) {
        if (!presentesFinal.has(n)) {
          placeholders.push({
            simulado_id: simuladoId,
            numero: n,
            enunciado: "Esta questão não pôde ser extraída automaticamente do PDF. Pule para a próxima.",
            materia: null,
            alternativas: { A: "—", B: "—", C: "—", D: "—" },
            resposta_correta: null,
            status: "falhou_extracao",
            nota_oficial: null,
          });
        }
      }
      if (placeholders.length > 0) {
        await supabaseAdmin.from("simulado_questoes").insert(placeholders);
        await appendLog(
          data.jobId,
          "info",
          `${placeholders.length} questão(ões) marcada(s) como "falhou_extracao": ${placeholders.map((p) => p.numero).join(", ")}.`,
        );
      }

      // Total final
      const cnt = await supabaseAdmin
        .from("simulado_questoes")
        .select("numero", { count: "exact", head: true })
        .eq("simulado_id", simuladoId);
      const final = cnt.count ?? 0;

      await supabaseAdmin
        .from("simulado_jobs")
        .update({
          questoes_processadas: final,
          etapa: "pronto",
          concluido_em: new Date().toISOString(),
        })
        .eq("id", data.jobId);

      await supabaseAdmin
        .from("simulados")
        .update({ status: "pronto", total_questoes: final })
        .eq("id", simuladoId);

      const okCount = final - placeholders.length;
      if (placeholders.length === 0) {
        await appendLog(data.jobId, "ok", `Simulado pronto com ${final}/${total} questões.`);
      } else {
        await appendLog(
          data.jobId,
          "info",
          `Simulado pronto: ${okCount} extraídas + ${placeholders.length} sem extração (marcadas para pular).`,
        );
      }

      return { ok: true, final, total };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await appendLog(data.jobId, "erro", `Falha na validação final: ${msg}`);
      await supabaseAdmin
        .from("simulado_jobs")
        .update({ etapa: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", data.jobId);
      throw new Error(msg);
    }
  });

// ============ Polling: status do job ============
export const getJobStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const job = await supabaseAdmin
      .from("simulado_jobs")
      .select("id, etapa, batch_atual, batches_total, questoes_processadas, total_estimado, logs, iniciado_em, concluido_em, erro_msg, materias_detectadas, gabarito_oficial")
      .eq("id", data.jobId)
      .single();
    if (job.error || !job.data) throw new Error("Job não encontrado");
    return job.data;
  });

// ============ Cancelar job ============
export const cancelarJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const job = await supabaseAdmin
      .from("simulado_jobs")
      .select("simulado_id")
      .eq("id", data.jobId)
      .single();
    if (job.data?.simulado_id) {
      await supabaseAdmin.from("simulados").delete().eq("id", job.data.simulado_id);
    }
    await supabaseAdmin.from("simulado_jobs").delete().eq("id", data.jobId);
    return { ok: true };
  });

// ============ Excluir simulado ============
export const excluirSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const del = await supabaseAdmin.from("simulados").delete().eq("id", data.id);
    if (del.error) throw new Error(del.error.message);
    return { ok: true };
  });

// ============ Auditoria + Reextração de questões inventadas ============
export const auditarEReextrair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provaNumero: number }) =>
    z.object({ provaNumero: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    // Pega o job mais recente "pronto" da prova (tem ocr_prova + gabarito)
    const jobRes = await supabaseAdmin
      .from("simulado_jobs")
      .select("id, simulado_id, ocr_prova, gabarito_oficial, total_estimado")
      .eq("prova_numero", data.provaNumero)
      .not("simulado_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (jobRes.error) throw new Error(jobRes.error.message);
    if (!jobRes.data || !jobRes.data.simulado_id || !jobRes.data.ocr_prova) {
      throw new Error("Não há job com OCR salvo para esta prova. Gere o simulado primeiro.");
    }
    const job = jobRes.data;
    const simuladoId = job.simulado_id as string;
    const ocr = job.ocr_prova as string;
    const ocrNorm = normalizeForMatch(ocr);
    const gabarito = normalizeGabarito(job.gabarito_oficial);

    // 1) Carrega questões atuais "ok" e detecta inventadas
    const qs = await supabaseAdmin
      .from("simulado_questoes")
      .select("id, numero, enunciado, status")
      .eq("simulado_id", simuladoId)
      .eq("status", "ok");
    if (qs.error) throw new Error(qs.error.message);

    const inventadas: number[] = [];
    for (const q of qs.data ?? []) {
      if (!enunciadoAparece(q.enunciado as string, ocrNorm)) {
        inventadas.push(q.numero as number);
      }
    }

    await appendLog(
      job.id,
      "info",
      `Auditoria: ${inventadas.length} questão(ões) inventadas detectada(s)${
        inventadas.length > 0 ? ` (${inventadas.slice(0, 15).join(", ")}${inventadas.length > 15 ? "…" : ""})` : ""
      }.`,
    );

    if (inventadas.length === 0) {
      return { inventadas: 0, reextraidas: 0, restantes: 0 };
    }

    // 2) Apaga as inventadas
    const del = await supabaseAdmin
      .from("simulado_questoes")
      .delete()
      .eq("simulado_id", simuladoId)
      .in("numero", inventadas);
    if (del.error) throw new Error(del.error.message);

    // 3) Re-extrai com o pipeline novo (anti-invenção)
    const validas = await extrairQuestoes(job.id, ocr, inventadas, gabarito);

    if (validas.length > 0) {
      const rows = validas.map((q) => {
        const g = gabarito[String(q.numero)];
        const anulada = !!g?.anulada;
        return {
          simulado_id: simuladoId,
          numero: q.numero,
          enunciado: q.enunciado,
          materia: q.materia,
          alternativas: q.alternativas,
          resposta_correta: anulada ? null : (g?.letra ?? null),
          status: anulada ? "anulada" : "ok",
          nota_oficial: g?.nota ?? null,
        };
      });
      const ins = await supabaseAdmin.from("simulado_questoes").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }

    // 4) Marca as que ainda não saíram como falhou_extracao
    const validasNums = new Set(validas.map((v) => v.numero));
    const restantes = inventadas.filter((n) => !validasNums.has(n));
    if (restantes.length > 0) {
      const placeholders = restantes.map((n) => ({
        simulado_id: simuladoId,
        numero: n,
        enunciado: "Esta questão não pôde ser extraída do PDF oficial.",
        materia: null as string | null,
        alternativas: { A: "—", B: "—", C: "—", D: "—" },
        resposta_correta: null as string | null,
        status: "falhou_extracao",
        nota_oficial: null as string | null,
      }));
      const ins2 = await supabaseAdmin.from("simulado_questoes").insert(placeholders);
      if (ins2.error) throw new Error(ins2.error.message);
    }

    // 5) Recalcula total
    const cnt = await supabaseAdmin
      .from("simulado_questoes")
      .select("numero", { count: "exact", head: true })
      .eq("simulado_id", simuladoId)
      .neq("status", "falhou_extracao");
    await supabaseAdmin
      .from("simulados")
      .update({ total_questoes: cnt.count ?? 0 })
      .eq("id", simuladoId);

    await appendLog(
      job.id,
      "ok",
      `Auditoria concluída: ${validas.length} reextraída(s), ${restantes.length} marcada(s) como sem extração.`,
    );

    return {
      inventadas: inventadas.length,
      reextraidas: validas.length,
      restantes: restantes.length,
    };
  });

// ============ REEXTRAIR FALHAS ============
// Pega questões marcadas como "falhou_extracao" e tenta reextrair com o pipeline atual.
export const reextrairFalhas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provaNumero: number }) =>
    z.object({ provaNumero: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const jobRes = await supabaseAdmin
      .from("simulado_jobs")
      .select("id, simulado_id, ocr_prova, gabarito_oficial")
      .eq("prova_numero", data.provaNumero)
      .not("simulado_id", "is", null)
      .not("ocr_prova", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (jobRes.error) throw new Error(jobRes.error.message);
    if (!jobRes.data || !jobRes.data.simulado_id || !jobRes.data.ocr_prova) {
      throw new Error("Não há job com OCR salvo para esta prova.");
    }
    const job = jobRes.data;
    const simuladoId = job.simulado_id as string;
    const ocr = job.ocr_prova as string;
    const gabarito = normalizeGabarito(job.gabarito_oficial);

    // 1) Lista os números marcados como falhou_extracao
    const qs = await supabaseAdmin
      .from("simulado_questoes")
      .select("numero")
      .eq("simulado_id", simuladoId)
      .eq("status", "falhou_extracao");
    if (qs.error) throw new Error(qs.error.message);
    const numeros = (qs.data ?? []).map((r) => r.numero as number).sort((a, b) => a - b);

    await appendLog(job.id, "info", `Reextração: ${numeros.length} questão(ões) com status=falhou_extracao.`);
    if (numeros.length === 0) return { tentadas: 0, reextraidas: 0, restantes: 0 };

    // 2) Apaga placeholders
    const del = await supabaseAdmin
      .from("simulado_questoes")
      .delete()
      .eq("simulado_id", simuladoId)
      .in("numero", numeros);
    if (del.error) throw new Error(del.error.message);

    // 3) Tenta extrair de novo (com o índice de marcadores corrigido)
    const validas = await extrairQuestoes(job.id, ocr, numeros, gabarito);

    if (validas.length > 0) {
      const rows = validas.map((q) => {
        const g = gabarito[String(q.numero)];
        const anulada = !!g?.anulada;
        return {
          simulado_id: simuladoId,
          numero: q.numero,
          enunciado: q.enunciado,
          materia: q.materia,
          alternativas: q.alternativas,
          resposta_correta: anulada ? null : (g?.letra ?? null),
          status: anulada ? "anulada" : "ok",
          nota_oficial: g?.nota ?? null,
        };
      });
      const ins = await supabaseAdmin.from("simulado_questoes").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
    }

    // 4) Recria placeholders para o que ainda faltou
    const validasNums = new Set(validas.map((v) => v.numero));
    const restantes = numeros.filter((n) => !validasNums.has(n));
    if (restantes.length > 0) {
      const placeholders = restantes.map((n) => ({
        simulado_id: simuladoId,
        numero: n,
        enunciado: "Esta questão não pôde ser extraída do PDF oficial.",
        materia: null as string | null,
        alternativas: { A: "—", B: "—", C: "—", D: "—" },
        resposta_correta: null as string | null,
        status: "falhou_extracao",
        nota_oficial: null as string | null,
      }));
      const ins2 = await supabaseAdmin.from("simulado_questoes").insert(placeholders);
      if (ins2.error) throw new Error(ins2.error.message);
    }

    // 5) Recalcula total
    const cnt = await supabaseAdmin
      .from("simulado_questoes")
      .select("numero", { count: "exact", head: true })
      .eq("simulado_id", simuladoId)
      .neq("status", "falhou_extracao");
    await supabaseAdmin
      .from("simulados")
      .update({ total_questoes: cnt.count ?? 0 })
      .eq("id", simuladoId);

    await appendLog(
      job.id,
      "ok",
      `Reextração concluída: ${validas.length} reextraída(s), ${restantes.length} ainda falhou.`,
    );

    return { tentadas: numeros.length, reextraidas: validas.length, restantes: restantes.length };
  });
