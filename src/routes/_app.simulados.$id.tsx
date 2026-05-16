import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { getSimulado, iniciarTentativa, salvarResposta, finalizarTentativa } from "@/lib/simulados.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/simulados/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Simulado — OAB na Risca` }],
  }),
  component: PraticaPage,
});

type Alt = "A" | "B" | "C" | "D";

function PraticaPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getSimulado);
  const iniFn = useServerFn(iniciarTentativa);
  const salvarFn = useServerFn(salvarResposta);
  const finalFn = useServerFn(finalizarTentativa);

  const sim = useQuery({
    queryKey: ["simulado", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const tentativa = useQuery({
    queryKey: ["tentativa", id],
    enabled: !!sim.data,
    queryFn: () => iniFn({ data: { simuladoId: id } }),
  });

  const [idx, setIdx] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, Alt>>({});

  const questoes = sim.data?.questoes ?? [];
  const atual = questoes[idx];

  const salvarMut = useMutation({
    mutationFn: ({ numero, alt }: { numero: number; alt: Alt }) =>
      salvarFn({ data: { tentativaId: tentativa.data!.id, numero, alternativa: alt } }),
  });

  const finalMut = useMutation({
    mutationFn: () => finalFn({ data: { tentativaId: tentativa.data!.id } }),
    onSuccess: () => {
      navigate({ to: "/simulados/$id/resultado/$tentativaId", params: { id, tentativaId: tentativa.data!.id } });
    },
  });

  function escolher(alt: Alt) {
    if (!atual) return;
    setRespostas((r) => ({ ...r, [atual.numero]: alt }));
    salvarMut.mutate({ numero: atual.numero, alt });
  }

  const respondidas = Object.keys(respostas).length;

  if (sim.isLoading || tentativa.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando simulado…
      </div>
    );
  }
  if (!sim.data || !atual) {
    return <div className="p-6 text-center text-muted-foreground">Simulado indisponível.</div>;
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{sim.data.simulado.titulo}</p>
        <div className="flex items-baseline justify-between mt-1">
          <h1 className="font-display text-2xl">Questão {atual.numero} de {questoes.length}</h1>
          <span className="text-xs text-muted-foreground">{respondidas}/{questoes.length} respondidas</span>
        </div>
        {atual.materia && (
          <p className="mt-1 inline-block px-2 py-0.5 rounded-full text-[11px] bg-primary/10 text-primary font-medium">
            {atual.materia}
          </p>
        )}
      </header>

      <article className="rounded-xl border border-border bg-card p-5">
        <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{atual.enunciado}</p>
        <ul className="mt-5 space-y-2">
          {(["A", "B", "C", "D"] as const).map((letra) => {
            const texto = (atual.alternativas as Record<string, string>)[letra];
            const selecionada = respostas[atual.numero] === letra;
            return (
              <li key={letra}>
                <button
                  onClick={() => escolher(letra)}
                  className={cn(
                    "w-full text-left flex gap-3 p-3 rounded-lg border transition-colors",
                    selecionada
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <span className={cn(
                    "h-7 w-7 shrink-0 rounded-full grid place-items-center text-sm font-semibold",
                    selecionada ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}>{letra}</span>
                  <span className="text-sm leading-relaxed">{texto}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </article>

      <nav className="flex items-center justify-between mt-5 gap-2">
        <Button
          variant="outline"
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        {idx < questoes.length - 1 ? (
          <Button onClick={() => setIdx((i) => Math.min(questoes.length - 1, i + 1))}>
            Próxima <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={() => finalMut.mutate()}
            disabled={finalMut.isPending}
            className="bg-gradient-gold text-gold-foreground"
          >
            {finalMut.isPending ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Finalizando…</>
            ) : (
              <><Flag className="h-4 w-4 mr-1" /> Finalizar simulado</>
            )}
          </Button>
        )}
      </nav>

      <section className="mt-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Mapa de questões</p>
        <div className="grid grid-cols-10 gap-1.5">
          {questoes.map((q, i) => {
            const r = respostas[q.numero];
            const isAtual = i === idx;
            return (
              <button
                key={q.id}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-8 rounded text-[11px] font-semibold transition-colors",
                  isAtual && "ring-2 ring-primary",
                  r ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent",
                )}
              >
                {q.numero}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
