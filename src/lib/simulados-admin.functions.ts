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
  resposta_correta: z.enum(["A", "B", "C", "D"]),
});

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

// ============ ETAPA 1: Preparar (OCR + prévia) ============
export const prepararSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provaNumero: number }) =>
    z.object({ provaNumero: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY não configurada");

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

    // Cria job em status preview
    const ins = await supabaseAdmin
      .from("simulado_jobs")
      .insert({
        prova_numero: prova.data.numero,
        etapa: "preview",
        gerado_por: userId,
        logs: [
          { ts: new Date().toISOString(), nivel: "info", msg: `Iniciando OCR de ${prova.data.titulo}` },
        ],
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    const jobId = ins.data.id;

    try {
      await appendLog(jobId, "info", "Lendo PDF da prova via Mistral OCR…");
      const provaTxt = await mistralOcr(apiKey, prova.data.prova_1fase_url);
      await appendLog(jobId, "ok", `Prova OCR concluído (${Math.round(provaTxt.length / 1000)}k caracteres)`);

      await appendLog(jobId, "info", "Lendo PDF do gabarito…");
      const gabTxt = await mistralOcr(apiKey, prova.data.gabarito_1fase_url);
      await appendLog(jobId, "ok", `Gabarito OCR concluído (${Math.round(gabTxt.length / 1000)}k caracteres)`);

      // Estimativa por regex: conta padrões de questão
      const matches = provaTxt.match(/Quest(ã|a)o\s+\d+|^\s*\d{1,3}[\.\)]\s/gim) ?? [];
      const numeros = new Set<number>();
      for (const m of matches) {
        const n = parseInt(m.replace(/\D+/g, ""), 10);
        if (n >= 1 && n <= 100) numeros.add(n);
      }
      const totalEstimado = numeros.size > 0 ? numeros.size : 80;

      // Detecta matérias presentes no markdown (heurística simples)
      const materiasPossiveis = [
        "Ética", "Constitucional", "Civil", "Processo Civil", "Penal", "Processo Penal",
        "Trabalho", "Tributário", "Administrativo", "Empresarial", "Filosofia",
        "Direitos Humanos", "Internacional", "Ambiental", "Eleitoral", "ECA",
      ];
      const materiasDetect = materiasPossiveis.filter((m) =>
        new RegExp(m, "i").test(provaTxt),
      );

      await supabaseAdmin
        .from("simulado_jobs")
        .update({
          ocr_prova: provaTxt,
          ocr_gabarito: gabTxt,
          total_estimado: totalEstimado,
          materias_detectadas: materiasDetect,
        })
        .eq("id", jobId);

      await appendLog(jobId, "ok", `Detectadas ~${totalEstimado} questões em ${materiasDetect.length} matérias.`);

      return {
        jobId,
        titulo: prova.data.titulo,
        totalEstimado,
        materiasDetectadas: materiasDetect,
        provaNumero: prova.data.numero,
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await appendLog(jobId, "erro", msg);
      await supabaseAdmin
        .from("simulado_jobs")
        .update({ etapa: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", jobId);
      throw new Error(msg);
    }
  });

// ============ ETAPA 2: Confirmar e iniciar geração ============
const BATCH_SIZE = 20; // questões por batch

export const iniciarGeracao = createServerFn({ method: "POST" })
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
    if (job.data.etapa !== "preview") throw new Error("Job já iniciado");

    const prova = await supabaseAdmin
      .from("provas_oab")
      .select("numero, titulo")
      .eq("numero", job.data.prova_numero)
      .single();
    if (prova.error) throw new Error(prova.error.message);

    // Remove simulado anterior dessa prova (caso regerando)
    await supabaseAdmin.from("simulados").delete().eq("prova_numero", prova.data.numero);

    const sim = await supabaseAdmin
      .from("simulados")
      .insert({
        prova_numero: prova.data.numero,
        titulo: `Simulado ${prova.data.titulo}`,
        status: "gerando",
        gerado_por: userId,
      })
      .select("id")
      .single();
    if (sim.error) throw new Error(sim.error.message);

    const batches = Math.max(1, Math.ceil(job.data.total_estimado / BATCH_SIZE));
    await supabaseAdmin
      .from("simulado_jobs")
      .update({
        etapa: "gerando",
        simulado_id: sim.data.id,
        batches_total: batches,
        batch_atual: 0,
        iniciado_em: new Date().toISOString(),
      })
      .eq("id", data.jobId);

    await appendLog(data.jobId, "info", `Geração iniciada em ${batches} lotes de até ${BATCH_SIZE} questões.`);

    return { jobId: data.jobId, simuladoId: sim.data.id, batchesTotal: batches };
  });

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

    try {
      await appendLog(data.jobId, "info", `Lote ${data.batchIndex + 1}/${job.data.batches_total}: questões ${inicio}–${fim}`);

      const system = `Você extrai questões objetivas do Exame da OAB a partir de markdown OCR. Retorne SEMPRE JSON válido seguindo o schema. Não invente respostas — use SEMPRE o gabarito oficial.`;
      const user = `Extraia APENAS as questões de número ${inicio} a ${fim} (inclusivos) do Exame abaixo.
Cada questão deve ter:
- numero (inteiro entre ${inicio} e ${fim})
- enunciado (texto sem as alternativas)
- materia (uma de: "Ética e Estatuto da OAB", "Direito Constitucional", "Direito Civil", "Processo Civil", "Direito Penal", "Processo Penal", "Direito do Trabalho", "Processo do Trabalho", "Direito Tributário", "Direito Administrativo", "Direito Empresarial", "Filosofia do Direito", "Direitos Humanos", "Direito Internacional", "Direito Ambiental", "Direito Eleitoral", "ECA")
- alternativas: { A, B, C, D }
- resposta_correta: "A" | "B" | "C" | "D" (do gabarito oficial)

Retorne JSON: { "questoes": [ ... ] }

===== PROVA =====
${(job.data.ocr_prova ?? "").slice(0, 90000)}

===== GABARITO =====
${(job.data.ocr_gabarito ?? "").slice(0, 20000)}`;

      await appendLog(data.jobId, "info", `Organizando questões via Gemini Flash Lite (lote ${data.batchIndex + 1})…`);
      const raw = await geminiExtractJson(system, user);
      const parsed = JSON.parse(raw) as { questoes?: unknown[] };
      const validas: z.infer<typeof QuestaoSchema>[] = [];
      for (const q of parsed.questoes ?? []) {
        const r = QuestaoSchema.safeParse(q);
        if (r.success && r.data.numero >= inicio && r.data.numero <= fim) {
          validas.push(r.data);
        }
      }

      if (validas.length > 0) {
        // Remove duplicatas antes de inserir
        await supabaseAdmin
          .from("simulado_questoes")
          .delete()
          .eq("simulado_id", job.data.simulado_id)
          .in("numero", validas.map((q) => q.numero));

        const simuladoId = job.data.simulado_id as string;
        const rows = validas.map((q) => ({
          simulado_id: simuladoId,
          numero: q.numero,
          enunciado: q.enunciado,
          materia: q.materia,
          alternativas: q.alternativas,
          resposta_correta: q.resposta_correta,
        }));
        const insQ = await supabaseAdmin.from("simulado_questoes").insert(rows);
        if (insQ.error) throw new Error(insQ.error.message);
      }

      const novoTotal = (job.data.questoes_processadas ?? 0) + validas.length;
      const proximoIndex = data.batchIndex + 1;
      const concluido = proximoIndex >= job.data.batches_total;

      await supabaseAdmin
        .from("simulado_jobs")
        .update({
          batch_atual: proximoIndex,
          questoes_processadas: novoTotal,
          etapa: concluido ? "pronto" : "gerando",
          concluido_em: concluido ? new Date().toISOString() : null,
        })
        .eq("id", data.jobId);

      await appendLog(data.jobId, "ok", `Lote ${data.batchIndex + 1} concluído (+${validas.length} questões)`);

      if (concluido) {
        await supabaseAdmin
          .from("simulados")
          .update({ status: "pronto", total_questoes: novoTotal })
          .eq("id", job.data.simulado_id);
        await appendLog(data.jobId, "ok", `Simulado pronto com ${novoTotal} questões.`);
      }

      return { proximo: concluido ? null : proximoIndex, processadas: novoTotal };
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
        .eq("id", job.data.simulado_id);
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
      .select("id, etapa, batch_atual, batches_total, questoes_processadas, total_estimado, logs, iniciado_em, concluido_em, erro_msg, materias_detectadas")
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
