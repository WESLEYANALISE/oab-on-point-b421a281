import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isUuid, makeSimuladoSlug, provaNumeroFromSimuladoSlug } from "@/lib/simulado-slug";

const simuladoRefSchema = z.object({ id: z.string().min(1).max(180) });

async function resolveSimuladoId(
  supabase: { from: (table: string) => any },
  idOrSlug: string,
) {
  if (isUuid(idOrSlug)) return idOrSlug;
  const provaNumero = provaNumeroFromSimuladoSlug(idOrSlug);
  if (!provaNumero) throw new Error("Simulado não encontrado");
  const { data, error } = await supabase
    .from("simulados")
    .select("id")
    .eq("prova_numero", provaNumero)
    .eq("status", "pronto")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Simulado não encontrado");
  return data.id as string;
}

// ============ Listagem ============
export const listSimulados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("simulados")
      .select("id, prova_numero, titulo, total_questoes, status, ano, created_at")
      .eq("status", "pronto")
      .order("prova_numero", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((simulado) => ({
      ...simulado,
      slug: makeSimuladoSlug(simulado),
    }));
  });

// ============ Detalhe (com gabarito para feedback instantâneo) ============
export const getSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => simuladoRefSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const simuladoId = await resolveSimuladoId(supabase, data.id);
    const [sim, qs] = await Promise.all([
      supabase.from("simulados").select("*").eq("id", simuladoId).maybeSingle(),
      supabase
        .from("simulado_questoes")
        .select("id, numero, enunciado, materia, alternativas, resposta_correta")
        .eq("simulado_id", simuladoId)
        .order("numero", { ascending: true }),
    ]);
    if (sim.error) throw new Error(sim.error.message);
    if (qs.error) throw new Error(qs.error.message);
    if (!sim.data) throw new Error("Simulado não encontrado");
    return { simulado: sim.data, questoes: qs.data ?? [] };
  });

// ============ Tudo o que a prática precisa em UMA chamada ============
// Retorna simulado + questões + id de uma tentativa já em andamento
// (ou cria uma nova) + respostas já salvas, evitando 2 roundtrips.
export const getSimuladoCompleto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => simuladoRefSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const simuladoId = await resolveSimuladoId(supabase, data.id);
    const [sim, qs, existing] = await Promise.all([
      supabase
        .from("simulados")
        .select("id, prova_numero, titulo, total_questoes, ano")
        .eq("id", simuladoId)
        .maybeSingle(),
      supabase
        .from("simulado_questoes")
        .select("id, numero, enunciado, materia, alternativas, resposta_correta")
        .eq("simulado_id", simuladoId)
        .order("numero", { ascending: true }),
      supabase
        .from("simulado_tentativas")
        .select("id, respostas")
        .eq("user_id", userId)
        .eq("simulado_id", simuladoId)
        .is("concluido_em", null)
        .order("iniciado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (sim.error) throw new Error(sim.error.message);
    if (qs.error) throw new Error(qs.error.message);
    if (!sim.data) throw new Error("Simulado não encontrado");

    let tentativaId = existing.data?.id ?? null;
    const respostasSalvas =
      (existing.data?.respostas as Record<string, string>) ?? {};
    if (!tentativaId) {
      const ins = await supabase
        .from("simulado_tentativas")
        .insert({
          user_id: userId,
          simulado_id: simuladoId,
          total: qs.data?.length ?? 0,
        })
        .select("id")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      tentativaId = ins.data.id;
    }
    return {
      simulado: { ...sim.data, slug: makeSimuladoSlug(sim.data) },
      questoes: qs.data ?? [],
      tentativaId: tentativaId!,
      respostasSalvas,
    };
  });

// ============ Iniciar tentativa ============
export const iniciarTentativa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { simuladoId: string }) =>
    z.object({ simuladoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Reutiliza tentativa em andamento
    const existing = await supabase
      .from("simulado_tentativas")
      .select("id")
      .eq("user_id", userId)
      .eq("simulado_id", data.simuladoId)
      .is("concluido_em", null)
      .maybeSingle();
    if (existing.data) return { id: existing.data.id };

    const { data: total } = await supabase
      .from("simulado_questoes")
      .select("id", { count: "exact", head: true })
      .eq("simulado_id", data.simuladoId);
    const ins = await supabase
      .from("simulado_tentativas")
      .insert({
        user_id: userId,
        simulado_id: data.simuladoId,
        total: (total as unknown as { count?: number })?.count ?? 0,
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(ins.error.message);
    return { id: ins.data.id };
  });

// ============ Salvar resposta parcial ============
export const salvarResposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tentativaId: string; numero: number; alternativa: string }) =>
    z
      .object({
        tentativaId: z.string().uuid(),
        numero: z.number().int().min(1).max(200),
        alternativa: z.enum(["A", "B", "C", "D"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const t = await supabase
      .from("simulado_tentativas")
      .select("respostas")
      .eq("id", data.tentativaId)
      .eq("user_id", userId)
      .maybeSingle();
    if (t.error) throw new Error(t.error.message);
    if (!t.data) throw new Error("Tentativa não encontrada");
    const respostas = { ...(t.data.respostas as Record<string, string>), [String(data.numero)]: data.alternativa };
    const upd = await supabase
      .from("simulado_tentativas")
      .update({ respostas })
      .eq("id", data.tentativaId)
      .eq("user_id", userId);
    if (upd.error) throw new Error(upd.error.message);
    return { ok: true };
  });

// ============ Finalizar tentativa ============
export const finalizarTentativa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tentativaId: string }) =>
    z.object({ tentativaId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const t = await supabase
      .from("simulado_tentativas")
      .select("id, simulado_id, respostas, concluido_em")
      .eq("id", data.tentativaId)
      .eq("user_id", userId)
      .maybeSingle();
    if (t.error) throw new Error(t.error.message);
    if (!t.data) throw new Error("Tentativa não encontrada");

    const respostas = (t.data.respostas as Record<string, string>) ?? {};
    const { data: qs, error: qErr } = await supabase
      .from("simulado_questoes")
      .select("numero, materia, resposta_correta")
      .eq("simulado_id", t.data.simulado_id);
    if (qErr) throw new Error(qErr.message);

    let acertos = 0;
    const porMateria: Record<string, { acertos: number; total: number }> = {};
    for (const q of qs ?? []) {
      const m = q.materia ?? "Sem matéria";
      porMateria[m] ??= { acertos: 0, total: 0 };
      porMateria[m].total += 1;
      const r = respostas[String(q.numero)];
      if (r && r === q.resposta_correta) {
        acertos += 1;
        porMateria[m].acertos += 1;
      }
    }
    const upd = await supabase
      .from("simulado_tentativas")
      .update({
        acertos,
        total: qs?.length ?? 0,
        por_materia: porMateria,
        concluido_em: t.data.concluido_em ?? new Date().toISOString(),
      })
      .eq("id", data.tentativaId)
      .eq("user_id", userId);
    if (upd.error) throw new Error(upd.error.message);
    return { acertos, total: qs?.length ?? 0, porMateria };
  });

// ============ Resultado (com respostas corretas reveladas) ============
export const getResultado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tentativaId: string }) =>
    z.object({ tentativaId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const t = await supabase
      .from("simulado_tentativas")
      .select("*")
      .eq("id", data.tentativaId)
      .eq("user_id", userId)
      .maybeSingle();
    if (t.error) throw new Error(t.error.message);
    if (!t.data) throw new Error("Tentativa não encontrada");
    const [sim, qs] = await Promise.all([
      supabase.from("simulados").select("titulo, prova_numero").eq("id", t.data.simulado_id).maybeSingle(),
      supabase
        .from("simulado_questoes")
        .select("numero, enunciado, materia, alternativas, resposta_correta, justificativa")
        .eq("simulado_id", t.data.simulado_id)
        .order("numero"),
    ]);
    if (sim.error) throw new Error(sim.error.message);
    if (qs.error) throw new Error(qs.error.message);
    return { tentativa: t.data, simulado: sim.data, questoes: qs.data ?? [] };
  });

// ============ Overview (materiais + raio-x + tentativa em andamento) ============
export const getSimuladoOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => simuladoRefSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const simuladoId = await resolveSimuladoId(supabase, data.id);
    const sim = await supabase
      .from("simulados")
      .select("id, prova_numero, titulo, total_questoes, ano, status")
      .eq("id", simuladoId)
      .maybeSingle();
    if (sim.error) throw new Error(sim.error.message);
    if (!sim.data) throw new Error("Simulado não encontrado");

    const [prova, qs, andamento] = await Promise.all([
      supabase
        .from("provas_oab")
        .select("numero, edital_url, prova_1fase_url, gabarito_1fase_url, oab_source_url")
        .eq("numero", sim.data.prova_numero)
        .maybeSingle(),
      supabase
        .from("simulado_questoes")
        .select("materia")
        .eq("simulado_id", simuladoId),
      supabase
        .from("simulado_tentativas")
        .select("id, iniciado_em")
        .eq("user_id", userId)
        .eq("simulado_id", simuladoId)
        .is("concluido_em", null)
        .order("iniciado_em", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (qs.error) throw new Error(qs.error.message);

    const total = qs.data?.length ?? 0;
    const contagem: Record<string, number> = {};
    for (const q of qs.data ?? []) {
      const m = q.materia ?? "Sem matéria";
      contagem[m] = (contagem[m] ?? 0) + 1;
    }
    const raioX = Object.entries(contagem)
      .map(([materia, qtd]) => ({ materia, qtd, pct: total ? Math.round((qtd / total) * 100) : 0 }))
      .sort((a, b) => b.qtd - a.qtd);

    return {
      simulado: { ...sim.data, slug: makeSimuladoSlug(sim.data) },
      prova: prova.data ?? null,
      raioX,
      total,
      tentativaEmAndamento: andamento.data?.id ?? null,
    };
  });

// ============ Histórico de tentativas do usuário ============
export const listMinhasTentativas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { simuladoId: string }) =>
    z.object({ simuladoId: z.string().min(1).max(180) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const simuladoId = await resolveSimuladoId(supabase, data.simuladoId);
    const { data: rows, error } = await supabase
      .from("simulado_tentativas")
      .select("id, iniciado_em, concluido_em, acertos, total, por_materia, updated_at")
      .eq("user_id", userId)
      .eq("simulado_id", simuladoId)
      .order("iniciado_em", { ascending: false });
    if (error) throw new Error(error.message);
    const agora = Date.now();
    const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;
    return (rows ?? []).map((t) => {
      let status: "finalizado" | "em-andamento" | "abandonado" = "em-andamento";
      if (t.concluido_em) status = "finalizado";
      else if (agora - new Date(t.updated_at).getTime() > SETE_DIAS) status = "abandonado";
      return {
        id: t.id,
        iniciado_em: t.iniciado_em,
        concluido_em: t.concluido_em,
        acertos: t.acertos,
        total: t.total,
        por_materia: (t.por_materia as Record<string, { acertos: number; total: number }>) ?? {},
        status,
      };
    });
  });

// ============ Resumo estruturado do edital (cache-or-generate) ============
type EditalResumo = {
  resumo: string;
  cronograma: Array<{ data: string; titulo: string }>;
  taxas: Array<{ descricao: string; valor: string }>;
  requisitos: string[];
  secoes: Array<{ titulo: string; conteudo: string }>;
};

export const getEditalResumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { provaNumero: number }) =>
    z.object({ provaNumero: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Cache hit
    const cached = await supabaseAdmin
      .from("provas_oab_edital_resumo")
      .select("conteudo, gerado_em")
      .eq("prova_numero", data.provaNumero)
      .maybeSingle();
    if (cached.data) {
      return { conteudo: cached.data.conteudo as EditalResumo, fonte: "cache" as const };
    }

    // Busca URL do edital
    const prova = await supabaseAdmin
      .from("provas_oab")
      .select("edital_url")
      .eq("numero", data.provaNumero)
      .maybeSingle();
    const url = prova.data?.edital_url;
    if (!url) {
      return { conteudo: null, fonte: "sem-edital" as const };
    }

    // OCR via Mistral (suporta PDF por URL)
    let markdown = "";
    try {
      const ocr = await fetch("https://api.mistral.ai/v1/ocr", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "mistral-ocr-latest",
          document: { type: "document_url", document_url: url },
        }),
      });
      if (!ocr.ok) throw new Error(`OCR ${ocr.status}`);
      const ocrJson = (await ocr.json()) as { pages?: Array<{ markdown?: string }> };
      markdown = (ocrJson.pages ?? []).map((p) => p.markdown ?? "").join("\n\n");
    } catch (e) {
      console.error("[edital] OCR falhou:", e);
      return { conteudo: null, fonte: "erro-ocr" as const };
    }

    if (!markdown.trim()) return { conteudo: null, fonte: "vazio" as const };

    // Estrutura: Gemini direto (API do usuário); fallback Mistral
    const prompt = `Organize o edital abaixo em JSON com as chaves: resumo (3-5 frases), cronograma (array de {data, titulo}), taxas (array de {descricao, valor}), requisitos (array de strings), secoes (array de {titulo, conteudo} cobrindo os principais tópicos: inscrição, prova objetiva, prova prático-profissional, recursos, resultado, vagas para PcD, e outros relevantes). Responda SOMENTE com JSON válido.\n\nEDITAL:\n${markdown.slice(0, 60000)}`;
    const system =
      "Você organiza editais da OAB em JSON estruturado em português do Brasil. Seja conciso e fiel ao texto.";

    async function tryGemini(): Promise<string | null> {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        console.error("[edital] GEMINI_API_KEY ausente");
        return null;
      }
      const model = "gemini-2.5-flash";
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
            }),
          },
        );
        if (!r.ok) {
          const body = await r.text().catch(() => "");
          console.error("[edital] Gemini falhou:", r.status, body.slice(0, 400));
          return null;
        }
        const j = (await r.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        return j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? null;
      } catch (e) {
        console.error("[edital] Gemini exceção:", e);
        return null;
      }
    }

    async function tryMistral(): Promise<string | null> {
      try {
        const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-large-latest",
            messages: [
              { role: "system", content: system },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (!r.ok) {
          const body = await r.text().catch(() => "");
          console.error("[edital] Mistral falhou:", r.status, body.slice(0, 300));
          return null;
        }
        const j = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
        return j.choices?.[0]?.message?.content ?? null;
      } catch (e) {
        console.error("[edital] Mistral exceção:", e);
        return null;
      }
    }

    function parseLoose(raw: string): EditalResumo | null {
      let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = s.search(/[\{\[]/);
      const end = s.lastIndexOf("}");
      if (start === -1 || end === -1) return null;
      s = s.substring(start, end + 1);
      try {
        return JSON.parse(s) as EditalResumo;
      } catch {
        try {
          s = s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
          return JSON.parse(s) as EditalResumo;
        } catch {
          return null;
        }
      }
    }

    let resumo: EditalResumo | null = null;
    const content = (await tryGemini()) ?? (await tryMistral());
    if (content) resumo = parseLoose(content);
    if (!resumo) {
      return { conteudo: null, fonte: "erro-ai" as const };
    }

    // Persiste cache
    await supabaseAdmin
      .from("provas_oab_edital_resumo")
      .upsert({ prova_numero: data.provaNumero, conteudo: resumo });

    return { conteudo: resumo, fonte: "gerado" as const };
  });
