import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, ChevronRight, BarChart3, TrendingUp, ListChecks, Loader2, Trophy } from "lucide-react";
import { useState } from "react";
import { listSimulados, getRaioXGlobal, getProgressoUsuario } from "@/lib/simulados.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/simulados/")({
  head: () => ({
    meta: [
      { title: "Simulados — OAB na Risca" },
      { name: "description", content: "Simulados completos no modelo do Exame de Ordem." },
    ],
  }),
  component: SimuladosPage,
});

type Tab = "exames" | "raiox" | "progresso";

function SimuladosPage() {
  const [tab, setTab] = useState<Tab>("exames");

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-5">
        <h1 className="font-display text-3xl md:text-4xl">Simulados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pratique no modelo OAB, veja o raio-x das matérias e acompanhe seu progresso.
        </p>
      </header>

      <div className="relative grid grid-cols-3 p-1 bg-muted rounded-full mb-5">
        <div
          className="absolute top-1 bottom-1 w-[calc(33.333%-0.166rem)] rounded-full bg-card shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            transform:
              tab === "exames"
                ? "translateX(0.25rem)"
                : tab === "raiox"
                ? "translateX(calc(100% + 0rem))"
                : "translateX(calc(200% - 0.25rem))",
          }}
        />
        <TabBtn active={tab === "exames"} onClick={() => setTab("exames")} icon={<ListChecks className="h-4 w-4" />} label="Exames" />
        <TabBtn active={tab === "raiox"} onClick={() => setTab("raiox")} icon={<BarChart3 className="h-4 w-4" />} label="Raio-X" />
        <TabBtn active={tab === "progresso"} onClick={() => setTab("progresso")} icon={<TrendingUp className="h-4 w-4" />} label="Progresso" />
      </div>

      {tab === "exames" && <ExamesTab />}
      {tab === "raiox" && <RaioXTab />}
      {tab === "progresso" && <ProgressoTab />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative z-10 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-medium transition-colors duration-300",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {icon} {label}
    </button>
  );
}

function ExamesTab() {
  const fetchFn = useServerFn(listSimulados);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["simulados-list"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Target className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="font-display text-xl">Nenhum simulado disponível ainda</p>
        <p className="text-sm text-muted-foreground mt-1">
          Em breve teremos simulados liberados para prática. Volte mais tarde.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {data.map((s) => (
        <li key={s.id}>
          <Link
            to="/simulados/$slug"
            params={{ slug: s.slug }}
            onClick={() => {
              queryClient.setQueryData(["simulado-card", s.slug], s);
              queryClient.setQueryData(["simulado-card", s.id], s);
            }}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-gradient-gold grid place-items-center text-gold-foreground">
              <Target className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg leading-tight truncate">
                {s.prova_numero}º Exame da Ordem
              </p>
              <p className="text-xs text-muted-foreground">
                Simulado · {s.total_questoes} questões{s.ano ? ` · ${s.ano}` : ""}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RaioXTab() {
  const fn = useServerFn(getRaioXGlobal);
  const { data, isLoading } = useQuery({
    queryKey: ["raiox-global"],
    queryFn: () => fn(),
    staleTime: 5 * 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Calculando raio-x…
      </div>
    );
  }

  if (data.materias.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Ainda não há questões suficientes para gerar o raio-x.
      </div>
    );
  }

  const max = data.materias[0]?.qtd ?? 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Exames analisados" value={String(data.totalSimulados)} />
        <Stat label="Questões mapeadas" value={String(data.totalQuestoes)} />
      </div>

      <div>
        <h2 className="font-display text-xl mb-3">Matérias que mais caem</h2>
        <ul className="space-y-2">
          {data.materias.map((m) => (
            <li key={m.materia} className="p-3 rounded-lg border border-border bg-card">
              <div className="flex justify-between items-baseline text-sm mb-1.5">
                <span className="font-medium truncate pr-2">{m.materia}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {m.qtd} · {m.pct}% · ~{m.mediaPorProva}/prova
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/60"
                  style={{ width: `${(m.qtd / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ProgressoTab() {
  const fn = useServerFn(getProgressoUsuario);
  const { data, isLoading } = useQuery({
    queryKey: ["progresso-usuario"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando progresso…
      </div>
    );
  }

  if (data.totalTentativas === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="font-display text-xl">Você ainda não finalizou nenhum simulado</p>
        <p className="text-sm text-muted-foreground mt-1">
          Termine um simulado para começar a acompanhar seu progresso e ver suas matérias mais fortes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="rounded-xl bg-gradient-toga text-primary-foreground p-5">
        <p className="text-xs uppercase tracking-widest opacity-80">Aproveitamento geral</p>
        <p className="font-display text-4xl mt-1">{data.pctGeral}%</p>
        <p className="text-sm opacity-90 mt-1">
          {data.totalAcertos} acertos em {data.totalQuestoes} questões · {data.totalTentativas} simulado{data.totalTentativas > 1 ? "s" : ""} finalizado{data.totalTentativas > 1 ? "s" : ""}
        </p>
      </header>

      {data.materias.length > 0 && (
        <div>
          <h2 className="font-display text-xl mb-3">Suas matérias</h2>
          <ul className="space-y-2">
            {data.materias.map((m) => (
              <li key={m.materia} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex justify-between items-baseline text-sm mb-1.5">
                  <span className="font-medium truncate pr-2">{m.materia}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {m.acertos}/{m.total} · {m.pct}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full",
                      m.pct >= 70 ? "bg-green-500" : m.pct >= 50 ? "bg-primary" : "bg-destructive/70",
                    )}
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="font-display text-xl mb-3">Histórico</h2>
        <ul className="space-y-2">
          {data.historico.map((h) => (
            <li key={h.id}>
              {h.slug ? (
                <Link
                  to="/simulados/$slug/resultado/$tentativaId"
                  params={{ slug: h.slug, tentativaId: h.id }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
                >
                  <HistoricoBadge pct={h.pct} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {h.provaNumero ? `${h.provaNumero}º Exame da Ordem` : h.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {h.acertos}/{h.total} · {h.pct}%{h.concluido_em ? ` · ${new Date(h.concluido_em).toLocaleDateString("pt-BR")}` : ""}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <HistoricoBadge pct={h.pct} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.acertos}/{h.total} · {h.pct}%
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-2xl mt-1">{value}</p>
    </div>
  );
}

function HistoricoBadge({ pct }: { pct: number }) {
  return (
    <div
      className={cn(
        "h-10 w-10 shrink-0 rounded-lg grid place-items-center text-sm font-semibold tabular-nums",
        pct >= 70 ? "bg-green-500/15 text-green-600" : pct >= 50 ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive",
      )}
    >
      {pct}%
    </div>
  );
}
