import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import { getResultado } from "@/lib/simulados.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/simulados/$id/resultado/$tentativaId")({
  head: () => ({ meta: [{ title: "Resultado — OAB na Risca" }] }),
  component: ResultadoPage,
});

function ResultadoPage() {
  const { id, tentativaId } = Route.useParams();
  const fn = useServerFn(getResultado);
  const { data, isLoading } = useQuery({
    queryKey: ["resultado", tentativaId],
    queryFn: () => fn({ data: { tentativaId } }),
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Calculando…
      </div>
    );
  }

  const respostas = (data.tentativa.respostas as Record<string, string>) ?? {};
  const total = data.questoes.length;
  const acertos = data.tentativa.acertos;
  const pct = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const porMateria = (data.tentativa.por_materia as Record<string, { acertos: number; total: number }>) ?? {};
  const materias = Object.entries(porMateria).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <Link to="/simulados" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar aos simulados
      </Link>

      <header className="rounded-xl bg-gradient-toga text-primary-foreground p-6 mb-5">
        <p className="text-xs uppercase tracking-widest opacity-80">{data.simulado?.titulo}</p>
        <p className="font-display text-5xl mt-2">{acertos}<span className="text-2xl opacity-70"> / {total}</span></p>
        <p className="text-lg mt-1 opacity-90">Você acertou {pct}%</p>
      </header>

      <section className="mb-6">
        <h2 className="font-display text-xl mb-3">Desempenho por matéria</h2>
        <ul className="space-y-2">
          {materias.map(([m, { acertos: a, total: t }]) => {
            const p = t > 0 ? (a / t) * 100 : 0;
            return (
              <li key={m} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium">{m}</span>
                  <span className="text-muted-foreground">{a}/{t}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${p}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-xl mb-3">Revisar questões</h2>
        <ul className="space-y-3">
          {data.questoes.map((q) => {
            const escolhida = respostas[String(q.numero)];
            const acertou = escolhida === q.resposta_correta;
            const alts = q.alternativas as Record<string, string>;
            return (
              <li key={q.numero} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-2">
                  <span className={cn(
                    "h-6 w-6 shrink-0 rounded-full grid place-items-center mt-0.5",
                    acertou ? "bg-green-500/15 text-green-600" : "bg-destructive/15 text-destructive",
                  )}>
                    {acertou ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Questão {q.numero} · {q.materia}</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{q.enunciado}</p>
                    <ul className="mt-3 space-y-1.5">
                      {(["A", "B", "C", "D"] as const).map((l) => {
                        const isCorr = l === q.resposta_correta;
                        const isUser = l === escolhida;
                        return (
                          <li
                            key={l}
                            className={cn(
                              "text-[13px] flex gap-2 p-2 rounded border",
                              isCorr && "border-green-500/40 bg-green-500/5",
                              !isCorr && isUser && "border-destructive/40 bg-destructive/5",
                              !isCorr && !isUser && "border-transparent",
                            )}
                          >
                            <span className="font-semibold">{l}.</span>
                            <span>{alts[l]}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
