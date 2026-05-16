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

// ============ Helper: extrai questões dentro de um range ============
async function extrairQuestoes(
  jobId: string,
  ocrProva: string,
  numeros: number[],
  gabarito: Record<string, GabaritoEntry>,
): Promise<z.infer<typeof QuestaoSchema>[]> {
  if (numeros.length === 0) return [];
  const inicio = Math.min(...numeros);
  const fim = Math.max(...numeros);
  const especifico = numeros.length < fim - inicio + 1;

  const system =
    "Você extrai questões objetivas do Exame da OAB a partir de markdown OCR. " +
    "Retorne SEMPRE JSON válido. NÃO inclua a resposta correta — apenas enunciado, matérias e alternativas.";

  const alvo = especifico
    ? `as questões de números ${numeros.join(", ")}`
    : `APENAS as questões de número ${inicio} a ${fim} (inclusivos)`;

  const user = `Extraia ${alvo} do Exame abaixo.
Cada questão deve ter:
- numero (inteiro)
- enunciado (texto sem as alternativas)
- materia (uma de: "Ética e Estatuto da OAB", "Direito Constitucional", "Direito Civil", "Processo Civil", "Direito Penal", "Processo Penal", "Direito do Trabalho", "Processo do Trabalho", "Direito Tributário", "Direito Administrativo", "Direito Empresarial", "Filosofia do Direito", "Direitos Humanos", "Direito Internacional", "Direito Ambiental", "Direito Eleitoral", "ECA")
- alternativas: { A, B, C, D } (cada uma com o texto completo da alternativa)

Retorne JSON: { "questoes": [ ... ] }

===== PROVA =====
${ocrProva.slice(0, 90000)}`;

  const validasMap = new Map<number, z.infer<typeof QuestaoSchema>>();
  const alvoSet = new Set(numeros);

  // Diagnóstico: marcador de cada questão presente no OCR?
  const ocrLower = ocrProva.toLowerCase();
  const semMarcador: number[] = [];
  for (const n of numeros) {
    const regex = new RegExp(`quest[aã]o\\s*${n}\\b`, "i");
    if (!regex.test(ocrLower)) semMarcador.push(n);
  }
  if (semMarcador.length > 0) {
    await appendLog(
      jobId,
      "info",
      `OCR não contém marcador "Questão" para: ${semMarcador.slice(0, 10).join(", ")}${semMarcador.length > 10 ? "…" : ""}. Provável problema no PDF/OCR.`,
    );
  }

  const runOnce = async (prompt: string): Promise<{ chars: number; recebidas: number[]; motivo?: string }> => {
    const raw = await geminiExtractJson(system, prompt);
    let parsed: { questoes?: unknown[] } = {};
    let motivo: string | undefined;
    try {
      parsed = JSON.parse(raw);
    } catch {
      motivo = `parse JSON falhou (primeiros 200 chars: ${raw.slice(0, 200).replace(/\s+/g, " ")})`;
    }
    const recebidas: number[] = [];
    for (const q of parsed.questoes ?? []) {
      const r = QuestaoSchema.safeParse(q);
      if (!r.success) {
        const issue = r.error.issues[0];
        const path = issue?.path.join(".") ?? "?";
        const numTentado = (q as { numero?: unknown })?.numero;
        motivo = motivo ?? `schema rejeitou questão ${numTentado ?? "?"}: ${path} → ${issue?.message ?? "inválido"}`;
        continue;
      }
      recebidas.push(r.data.numero);
      if (alvoSet.has(r.data.numero) && hasGabaritoEntry(gabarito, r.data.numero)) {
        validasMap.set(r.data.numero, r.data);
      }
    }
    return { chars: raw.length, recebidas, motivo };
  };

  try {
    const first = await runOnce(user);
    if (first.motivo && validasMap.size === 0) {
      await appendLog(jobId, "info", `Diagnóstico 1ª tentativa: ${first.motivo}`);
    }
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    await appendLog(jobId, "info", `1ª tentativa falhou: ${m}`);
  }

  // Retry para faltantes
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const faltantes = numeros.filter((n) => !validasMap.has(n));
    if (faltantes.length === 0) break;
    await appendLog(
      jobId,
      "info",
      `Faltam ${faltantes.length} questões (${faltantes.slice(0, 10).join(", ")}${faltantes.length > 10 ? "…" : ""}). Retentativa ${tentativa}/3…`,
    );
    const retryPrompt = `Extraia ESPECIFICAMENTE as questões de números ${faltantes.join(", ")} do Exame abaixo. Use o schema e regras anteriores. Retorne JSON: { "questoes": [ ... ] }

===== PROVA =====
${ocrProva.slice(0, 90000)}`;
    try {
      const r = await runOnce(retryPrompt);
      const aindaFaltam = faltantes.filter((n) => !validasMap.has(n));
      if (aindaFaltam.length > 0) {
        const recebeuOutras = r.recebidas.filter((n) => !faltantes.includes(n));
        const detalhe = r.motivo
          ? r.motivo
          : recebeuOutras.length > 0
          ? `Gemini devolveu questões erradas (${recebeuOutras.slice(0, 5).join(", ")}) em vez das pedidas`
          : `Gemini devolveu ${r.chars} chars sem questões válidas`;
        await appendLog(jobId, "info", `Retentativa ${tentativa}: ${detalhe}`);
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      await appendLog(jobId, "info", `Retentativa ${tentativa} falhou: ${m}`);
    }
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

    const gabarito = (job.data.gabarito_oficial ?? {}) as Record<string, string>;
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

        const rows = validas.map((q) => ({
          simulado_id: simuladoId,
          numero: q.numero,
          enunciado: q.enunciado,
          materia: q.materia,
          alternativas: q.alternativas,
          resposta_correta: gabarito[String(q.numero)],
        }));
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

      await appendLog(data.jobId, "ok", `Lote ${data.batchIndex + 1} concluído (+${validas.length} questões)`);

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
    const gabarito = (job.data.gabarito_oficial ?? {}) as Record<string, string>;

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
          if (!presentes.has(n) && gabarito[String(n)]) faltantes.push(n);
        }

        if (faltantes.length === 0) break;

        await appendLog(
          data.jobId,
          "info",
          `Validação ${tentativa}/3: ${faltantes.length} questões ainda faltam (${faltantes.slice(0, 15).join(", ")}${faltantes.length > 15 ? "…" : ""}). Refazendo…`,
        );

        const validas = await extrairQuestoes(data.jobId, job.data.ocr_prova ?? "", faltantes, gabarito);
        if (validas.length > 0) {
          const rows = validas.map((q) => ({
            simulado_id: simuladoId,
            numero: q.numero,
            enunciado: q.enunciado,
            materia: q.materia,
            alternativas: q.alternativas,
            resposta_correta: gabarito[String(q.numero)],
          }));
          const ins = await supabaseAdmin.from("simulado_questoes").insert(rows);
          if (ins.error) throw new Error(ins.error.message);
        } else {
          await appendLog(data.jobId, "info", `Validação ${tentativa}: Gemini não retornou questões válidas.`);
        }
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

      if (final === total) {
        await appendLog(data.jobId, "ok", `Simulado pronto com ${final}/${total} questões.`);
      } else {
        await appendLog(
          data.jobId,
          "info",
          `Simulado pronto com ${final}/${total} questões. ${total - final} não puderam ser extraídas após múltiplas tentativas.`,
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
