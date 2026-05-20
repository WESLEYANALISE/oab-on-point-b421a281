import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Notebook, XCircle } from "lucide-react";
import { listarCadernoErros } from "@/lib/aulas-trilha.functions";

export const Route = createFileRoute("/_app/caderno-erros")({
  head: () => ({
    meta: [
      { title: "Caderno de erros · OAB na Risca" },
      { name: "description", content: "Revise todas as questões que você errou nas aulas e simulados." },
    ],
  }),
  component: CadernoErros,
});

function CadernoErros() {
  const fn = useServerFn(listarCadernoErros);
  const { data, isPending, error } = useQuery({
    queryKey: ["caderno-erros"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  const erros = data?.erros ?? [];
  const grupos = erros.reduce<Record<string, typeof erros>>((acc, e) => {
    const k = e.materia ?? "Outros";
    (acc[k] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="pb-16 max-w-3xl mx-auto">
      <header className="px-4 md:px-8 pt-5 pb-4 border-b border-border">
        <Link
          to="/aulas"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Aulas
        </Link>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-toga grid place-items-center">
            <Notebook className="h-5 w-5 text-gold" />
          </div>
          <div>
            <h1 className="font-display text-2xl">Caderno de erros</h1>
            <p className="text-[12px] text-muted-foreground">
              {erros.length} questões para revisar
            </p>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 mt-5 space-y-6">
        {isPending ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-gold" />
            Carregando…
          </div>
        ) : error ? (
          <p className="text-destructive text-sm">Erro ao carregar.</p>
        ) : erros.length === 0 ? (
          <p className="text-muted-foreground text-sm py-12 text-center">
            Nenhum erro registrado ainda. Continue praticando nas aulas!
          </p>
        ) : (
          Object.entries(grupos).map(([materia, lista]) => (
            <div key={materia}>
              <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-gold/80 mb-3">
                {materia} · {lista.length}
              </h2>
              <ul className="space-y-3">
                {lista.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <p className="text-[11px] text-muted-foreground mb-1">
                      {e.livro_titulo} · Aula {e.ordem}
                    </p>
                    <p className="text-sm leading-relaxed mb-2 line-clamp-3">
                      {e.enunciado_snapshot}
                    </p>
                    <p className="text-xs inline-flex items-center gap-1.5 text-destructive">
                      <XCircle className="h-3.5 w-3.5" />
                      Você marcou {e.alternativa_escolhida} — gabarito{" "}
                      {e.alternativa_correta}
                    </p>
                    {e.justificativa_snapshot && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {e.justificativa_snapshot}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
