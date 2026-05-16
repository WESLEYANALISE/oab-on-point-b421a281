import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    return data ?? [];
  });

// ============ Detalhe (com gabarito para feedback instantâneo) ============
export const getSimulado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [sim, qs] = await Promise.all([
      supabase.from("simulados").select("*").eq("id", data.id).maybeSingle(),
      supabase
        .from("simulado_questoes")
        .select("id, numero, enunciado, materia, alternativas, resposta_correta")
        .eq("simulado_id", data.id)
        .order("numero", { ascending: true }),
    ]);
    if (sim.error) throw new Error(sim.error.message);
    if (qs.error) throw new Error(qs.error.message);
    if (!sim.data) throw new Error("Simulado não encontrado");
    return { simulado: sim.data, questoes: qs.data ?? [] };
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
