import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Target, ChevronRight } from "lucide-react";
import { listSimulados } from "@/lib/simulados.functions";

export const Route = createFileRoute("/_app/simulados/")({
  head: () => ({
    meta: [
      { title: "Simulados — OAB na Risca" },
      { name: "description", content: "Simulados completos no modelo do Exame de Ordem." },
    ],
  }),
  component: SimuladosPage,
});

function SimuladosPage() {
  const fetchFn = useServerFn(listSimulados);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["simulados-list"],
    queryFn: () => fetchFn(),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl">Simulados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pratique com simulados completos no modelo OAB. Receba o gabarito e o desempenho por matéria ao final.
        </p>
      </header>

      {!data || data.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-display text-xl">Nenhum simulado disponível ainda</p>
          <p className="text-sm text-muted-foreground mt-1">
            Em breve teremos simulados liberados para prática. Volte mais tarde.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
