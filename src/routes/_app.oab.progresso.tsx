import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { MATERIAS_OAB_46 } from "@/data/oab-materias-46";
import { touchStreak } from "@/lib/streak";
import { getStatsPrimeiraFase } from "@/lib/primeira-fase.functions";

export const Route = createFileRoute("/_app/oab/progresso")({
  head: () => ({
    meta: [
      { title: "Meu progresso · 1ª Fase OAB — OAB na Risca" },
      { name: "description", content: "Acompanhe sua evolução por matéria, acertos e atividade dos últimos dias na 1ª fase da OAB." },
    ],
  }),
  component: ProgressoPage,
});

function ProgressoPage() {
  const [tab, setTab] = useState<"materias" | "geral">("materias");
  const [historico, setHistorico] = useState<boolean[]>(Array(14).fill(false));

  useEffect(() => {
    const { historico } = touchStreak();
    setHistorico(historico);
  }, []);

  const fetchStats = useServerFn(getStatsPrimeiraFase);
  const { data: stats } = useQuery({
    queryKey: ["pf-stats"],
    queryFn: () => fetchStats(),
    staleTime: 60_000,
  });

  const porMateria = useMemo(() => {
    const map = new Map<string, { acerto: number; total: number }>();
    for (const m of stats?.porMateria ?? []) {
      map.set(m.materia, { acerto: m.acerto, total: m.total });
    }
    return MATERIAS_OAB_46.map((m) => {
      const v = map.get(m.nome) ?? map.get(m.id) ?? { acerto: 0, total: 0 };
      const pct = v.total > 0 ? Math.round((v.acerto / v.total) * 100) : 0;
      return { id: m.id, nome: m.nome, pct, total: v.total };
    });
  }, [stats]);

  return (
    <div className="pb-16">
      <header className="relative overflow-hidden px-4 pt-5 pb-6 md:px-8 bg-gradient-toga text-primary-foreground">
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <Link to="/oab/primeira-fase" className="relative inline-flex items-center gap-1.5 text-[12px] text-primary-foreground/80 hover:text-primary-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> 1ª Fase
        </Link>
        <div className="relative flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gold/20 border border-gold/40 grid place-items-center shrink-0">
            <Sparkles className="h-4 w-4 text-gold" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold">Acompanhe sua evolução</p>
            <h1 className="font-display font-semibold text-[24px] md:text-3xl leading-tight tracking-tight">Meu progresso</h1>
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8 mt-6">
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex border-b border-border">
            <TabBtn active={tab === "materias"} onClick={() => setTab("materias")} label="Por matéria" />
            <TabBtn active={tab === "geral"} onClick={() => setTab("geral")} label="Geral" />
          </div>

          {tab === "materias" && (
            <div className="p-4 md:p-5 space-y-2.5">
              {porMateria.map((m) => (
                <div key={m.id}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-[12px] font-medium truncate">{m.nome}</p>
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      {m.pct}% · {m.total}q
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold to-amber-400 transition-all"
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "geral" && (
            <div className="p-4 md:p-5">
              <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-3">
                Últimos 14 dias
              </p>
              <div className="flex items-end gap-1">
                {historico.map((ativo, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={cn(
                      "w-full rounded-sm transition-colors",
                      ativo ? "bg-gold h-8" : "bg-muted h-3",
                    )} />
                    <span className="text-[9px] text-muted-foreground">{14 - i}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Tentativas" value={stats?.tentativas ?? 0} />
                <MiniStat label="Acertos" value={stats?.totalAcertos ?? 0} />
                <MiniStat label="Questões" value={stats?.totalQuestoesRespondidas ?? 0} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/30 border border-border py-3">
      <p className="font-display font-semibold text-xl tabular-nums">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 py-2.5 text-[12px] font-semibold transition-colors",
        active ? "text-gold border-b-2 border-gold -mb-px" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
