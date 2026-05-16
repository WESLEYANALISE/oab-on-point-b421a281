import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StatsPrimeiraFase = {
  acertoPct: number;        // 0-100
  tentativas: number;
  totalQuestoesRespondidas: number;
  totalAcertos: number;
  materiasComPratica: number; // matérias distintas tentadas
  porMateria: { materia: string; acerto: number; total: number }[];
};

export const getStatsPrimeiraFase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StatsPrimeiraFase> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("simulado_tentativas")
      .select("acertos, total, por_materia")
      .eq("user_id", userId)
      .not("concluido_em", "is", null)
      .order("concluido_em", { ascending: false })
      .limit(30);

    if (error) throw new Error(error.message);

    const tentativas = data?.length ?? 0;
    let totalAcertos = 0;
    let totalQuestoes = 0;
    const agg = new Map<string, { acerto: number; total: number }>();

    for (const t of data ?? []) {
      totalAcertos += t.acertos ?? 0;
      totalQuestoes += t.total ?? 0;
      const pm = (t.por_materia ?? {}) as Record<string, { acerto: number; total: number }>;
      for (const [k, v] of Object.entries(pm)) {
        const cur = agg.get(k) ?? { acerto: 0, total: 0 };
        cur.acerto += Number(v?.acerto ?? 0);
        cur.total += Number(v?.total ?? 0);
        agg.set(k, cur);
      }
    }

    const acertoPct = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
    const porMateria = [...agg.entries()].map(([materia, v]) => ({ materia, ...v }));

    return {
      acertoPct,
      tentativas,
      totalQuestoesRespondidas: totalQuestoes,
      totalAcertos,
      materiasComPratica: agg.size,
      porMateria,
    };
  });
