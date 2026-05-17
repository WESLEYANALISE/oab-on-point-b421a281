import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ErroQuestao = {
  id: string;
  questao_id: string;
  simulado_id: string;
  tentativa_id: string;
  numero: number;
  materia: string | null;
  alternativa_marcada: string | null;
  resposta_correta: string;
  flashcard_id: string | null;
  revisado_em: string | null;
  tentativa_em: string;
  enunciado: string;
  alternativas: Record<string, string>;
  justificativa: string | null;
  simulado_titulo: string | null;
};

const ListSchema = z.object({
  materia: z.string().max(80).optional(),
  somenteNaoRevisados: z.boolean().optional(),
  limite: z.number().int().min(1).max(200).optional(),
});

export const listarErros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let q = supabase
      .from("erros_questao")
      .select("*")
      .eq("user_id", userId)
      .order("tentativa_em", { ascending: false })
      .limit(data.limite ?? 100);
    if (data.materia) q = q.eq("materia", data.materia);
    if (data.somenteNaoRevisados) q = q.is("revisado_em", null);
    const { data: erros, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (erros ?? []).map((e: any) => e.questao_id);
    const simIds = Array.from(new Set((erros ?? []).map((e: any) => e.simulado_id)));
    const [qs, sims] = await Promise.all([
      ids.length
        ? supabase.from("simulado_questoes").select("id, enunciado, alternativas, justificativa").in("id", ids)
        : Promise.resolve({ data: [] as any[], error: null }),
      simIds.length
        ? supabase.from("simulados").select("id, titulo").in("id", simIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    const qMap = new Map((qs.data ?? []).map((q: any) => [q.id, q]));
    const sMap = new Map((sims.data ?? []).map((s: any) => [s.id, s]));

    // contagem por matéria (geral, sem filtro)
    const { data: todos } = await supabase
      .from("erros_questao")
      .select("materia, revisado_em")
      .eq("user_id", userId);
    const porMateria: Record<string, { total: number; pendentes: number }> = {};
    let totalGeral = 0;
    let pendentesGeral = 0;
    for (const e of todos ?? []) {
      const m = (e as any).materia ?? "Sem matéria";
      porMateria[m] ??= { total: 0, pendentes: 0 };
      porMateria[m].total += 1;
      totalGeral += 1;
      if (!(e as any).revisado_em) {
        porMateria[m].pendentes += 1;
        pendentesGeral += 1;
      }
    }

    const enriquecidos: ErroQuestao[] = (erros ?? []).map((e: any) => {
      const full = qMap.get(e.questao_id) as any;
      return {
        ...e,
        enunciado: full?.enunciado ?? "",
        alternativas: (full?.alternativas as Record<string, string>) ?? {},
        justificativa: full?.justificativa ?? null,
        simulado_titulo: (sMap.get(e.simulado_id) as any)?.titulo ?? null,
      };
    });

    return {
      erros: enriquecidos,
      porMateria,
      totalGeral,
      pendentesGeral,
    };
  });

export const marcarRevisado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), revisado: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("erros_questao")
      .update({ revisado_em: data.revisado ? new Date().toISOString() : null })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const apagarErro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("erros_questao")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
