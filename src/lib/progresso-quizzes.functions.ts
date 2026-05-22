import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MateriaStat = { materia: string; acertos: number; total: number };

export type ProgressoQuizzes = {
  totalQuestoes: number;
  acertos: number;
  taxa: number; // 0..100
  semanaQuestoes: number;
  semanaAcertos: number;
  porMateria: MateriaStat[];
};

function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // segunda
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d.toISOString();
}

export const getProgressoQuizzes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProgressoQuizzes> => {
    const { supabase, userId } = context;
    const weekStart = startOfWeekISO();

    const [capRespAll, capRespWeek, aulasTentAll, aulasTentWeek, simTentAll, simTentWeek] = await Promise.all([
      supabase.from("aula_capitulo_respostas").select("acertou, materia").eq("user_id", userId),
      supabase.from("aula_capitulo_respostas").select("acertou").eq("user_id", userId).gte("created_at", weekStart),
      supabase.from("aulas_tentativas").select("acertos, total, subtema_slug").eq("user_id", userId),
      supabase.from("aulas_tentativas").select("acertos, total").eq("user_id", userId).gte("created_at", weekStart),
      supabase.from("simulado_tentativas").select("acertos, total, por_materia").eq("user_id", userId).not("concluido_em", "is", null),
      supabase.from("simulado_tentativas").select("acertos, total").eq("user_id", userId).gte("created_at", weekStart).not("concluido_em", "is", null),
    ]);

    let acertos = 0;
    let total = 0;
    let semanaAcertos = 0;
    let semanaQuestoes = 0;
    const byMat = new Map<string, { a: number; t: number }>();

    const addMat = (m: string | null | undefined, a: number, t: number) => {
      const key = (m || "Outros").trim() || "Outros";
      const cur = byMat.get(key) || { a: 0, t: 0 };
      cur.a += a;
      cur.t += t;
      byMat.set(key, cur);
    };

    for (const r of capRespAll.data ?? []) {
      total += 1;
      if ((r as any).acertou) acertos += 1;
      addMat((r as any).materia, (r as any).acertou ? 1 : 0, 1);
    }
    for (const r of capRespWeek.data ?? []) {
      semanaQuestoes += 1;
      if ((r as any).acertou) semanaAcertos += 1;
    }
    for (const r of aulasTentAll.data ?? []) {
      const t = Number((r as any).total) || 0;
      const a = Number((r as any).acertos) || 0;
      total += t;
      acertos += a;
      addMat(null, a, t);
    }
    for (const r of aulasTentWeek.data ?? []) {
      semanaQuestoes += Number((r as any).total) || 0;
      semanaAcertos += Number((r as any).acertos) || 0;
    }
    for (const r of simTentAll.data ?? []) {
      const t = Number((r as any).total) || 0;
      const a = Number((r as any).acertos) || 0;
      total += t;
      acertos += a;
      const pm = (r as any).por_materia as Record<string, { acertos?: number; total?: number }> | null;
      if (pm && typeof pm === "object") {
        for (const [mat, v] of Object.entries(pm)) {
          addMat(mat, Number(v?.acertos) || 0, Number(v?.total) || 0);
        }
      }
    }
    for (const r of simTentWeek.data ?? []) {
      semanaQuestoes += Number((r as any).total) || 0;
      semanaAcertos += Number((r as any).acertos) || 0;
    }

    const porMateria: MateriaStat[] = Array.from(byMat.entries())
      .map(([materia, v]) => ({ materia, acertos: v.a, total: v.t }))
      .filter((m) => m.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    return {
      totalQuestoes: total,
      acertos,
      taxa: total > 0 ? Math.round((acertos / total) * 100) : 0,
      semanaQuestoes,
      semanaAcertos,
      porMateria,
    };
  });

export type Metas = {
  data_prova: string | null;
  meta_semanal_questoes: number;
  meta_semanal_minutos: number;
  meta_semanal_aulas: number;
};

export const getMetas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Metas> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("oab_metas")
      .select("data_prova, meta_semanal_questoes, meta_semanal_minutos, meta_semanal_aulas")
      .eq("user_id", userId)
      .maybeSingle();
    return (
      (data as Metas | null) ?? {
        data_prova: null,
        meta_semanal_questoes: 100,
        meta_semanal_minutos: 300,
        meta_semanal_aulas: 5,
      }
    );
  });

const SaveSchema = z.object({
  data_prova: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  meta_semanal_questoes: z.number().int().min(0).max(2000),
  meta_semanal_minutos: z.number().int().min(0).max(10080),
  meta_semanal_aulas: z.number().int().min(0).max(200),
});

export const saveMetas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("oab_metas")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
