import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ============ Lista de provas com status do simulado ============
export const listProvasComStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const role = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role.data) throw new Error("Acesso negado");

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

// ============ Geração via Mistral ============
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

async function mistralChatJson(apiKey: string, systemPrompt: string, userPrompt: string) {
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Mistral chat falhou [${res.status}]: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "{}";
}

export const gerarSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provaNumero: number }) =>
    z.object({ provaNumero: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const role = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role.data) throw new Error("Acesso negado");

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

    // Cria registro com status 'gerando' usando admin client (RLS-safe)
    const ins = await supabaseAdmin
      .from("simulados")
      .insert({
        prova_numero: prova.data.numero,
        titulo: `Simulado ${prova.data.titulo}`,
        status: "gerando",
        gerado_por: userId,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    const simuladoId = ins.data.id;

    try {
      // 1. OCR dos dois PDFs
      const [provaTxt, gabTxt] = await Promise.all([
        mistralOcr(apiKey, prova.data.prova_1fase_url),
        mistralOcr(apiKey, prova.data.gabarito_1fase_url),
      ]);

      // 2. Parsing estruturado
      const system = `Você é um assistente que extrai questões objetivas do Exame da OAB de PDFs já transcritos. Retorne SEMPRE JSON válido seguindo exatamente o schema solicitado, sem comentários extras.`;
      const user = `Abaixo está o markdown da PROVA e do GABARITO oficial do ${prova.data.titulo}.

Extraia TODAS as questões objetivas (geralmente 80) com os seguintes campos para cada questão:
- numero (inteiro)
- enunciado (texto completo do enunciado, sem as alternativas)
- materia (uma das: "Ética e Estatuto da OAB", "Direito Constitucional", "Direito Civil", "Processo Civil", "Direito Penal", "Processo Penal", "Direito do Trabalho", "Processo do Trabalho", "Direito Tributário", "Direito Administrativo", "Direito Empresarial", "Filosofia do Direito", "Direitos Humanos", "Direito Internacional", "Direito Ambiental", "Direito Eleitoral", "Direito Financeiro", "ECA")
- alternativas: objeto {A, B, C, D} com o texto de cada alternativa
- resposta_correta: "A" | "B" | "C" | "D" (extraída do GABARITO oficial; nunca invente)

Retorne JSON no formato: { "questoes": [ {...}, {...} ] }

===== PROVA =====
${provaTxt.slice(0, 90000)}

===== GABARITO =====
${gabTxt.slice(0, 20000)}`;

      const raw = await mistralChatJson(apiKey, system, user);
      const parsed = JSON.parse(raw) as { questoes?: unknown[] };
      const validas: z.infer<typeof QuestaoSchema>[] = [];
      for (const q of parsed.questoes ?? []) {
        const r = QuestaoSchema.safeParse(q);
        if (r.success) validas.push(r.data);
      }
      if (validas.length < 10) {
        throw new Error(`Apenas ${validas.length} questões válidas extraídas`);
      }

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

      await supabaseAdmin
        .from("simulados")
        .update({ status: "pronto", total_questoes: validas.length })
        .eq("id", simuladoId);

      return { id: simuladoId, total: validas.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("simulados")
        .update({ status: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", simuladoId);
      throw new Error(msg);
    }
  });

export const excluirSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const role = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role.data) throw new Error("Acesso negado");
    const del = await supabaseAdmin.from("simulados").delete().eq("id", data.id);
    if (del.error) throw new Error(del.error.message);
    return { ok: true };
  });
