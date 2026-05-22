import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { MATERIAS_OAB_46 } from "@/data/oab-materias-46";
import { getStatsPrimeiraFase } from "@/lib/primeira-fase.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/oab/reforco")({
  head: () => ({ meta: [{ title: "Reforço · 1ª Fase — OAB na Risca" }] }),
  component: ReforcoPage,
});

function ReforcoPage() {
  const fetchStats = useServerFn(getStatsPrimeiraFase);
  const { data: stats } = useQuery({
    queryKey: ["pf-stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });

  const fracas = (() => {
    const map = new Map<string, { acerto: number; total: number }>();
    for (const m of stats?.porMateria ?? []) {
      map.set(m.materia, { acerto: m.acerto, total: m.total });
    }
    return MATERIAS_OAB_46
      .map((m) => {
        const v = map.get(m.nome) ?? map.get(m.id) ?? { acerto: 0, total: 0 };
        const pct = v.total > 0 ? Math.round((v.acerto / v.total) * 100) : 0;
        return { ...m, pct, total: v.total };
      })
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 8);
  })();

  return (
    <div className="pb-16">
      <header className="px-4 pt-5 pb-7 md:px-8 bg-gradient-toga text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold mb-2">Onde você precisa subir</p>
        <h1 className="font-display font-semibold text-3xl md:text-4xl leading-tight tracking-tight">Reforço</h1>
        <p className="mt-2 text-[13px] text-primary-foreground/80 max-w-xl">As matérias com menor aproveitamento aparecem aqui — foque nelas primeiro.</p>
      </header>

      <div className="px-4 md:px-8 mt-8 space-y-2.5">
        {fracas.map((m, i) => (
          <Link
            key={m.id}
            to="/oab/o-que-estudar"
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 hover:border-gold/35 transition-all"
          >
            <div className={cn(
              "h-10 w-10 rounded-xl grid place-items-center shrink-0 font-display font-bold text-sm tabular-nums",
              i < 3 ? "bg-red-500/15 border border-red-500/30 text-red-400" : "bg-gold/12 border border-gold/25 text-gold",
            )}>
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[14px] truncate">{m.nome}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {m.total > 0 ? `${m.pct}% de acerto · ${m.total} questões resolvidas` : "Você ainda não praticou esta matéria"}
              </p>
            </div>
            <RefreshCw className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
