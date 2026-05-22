import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { getAtoConteudo } from "@/lib/resenha-sync.functions";

export const Route = createFileRoute("/_app/atualizacoes-leis/$atoId")({
  head: () => ({
    meta: [{ title: "Ato — Atualizações de Leis" }],
  }),
  component: AtoPage,
});

function AtoPage() {
  const { atoId } = Route.useParams();
  const fn = useServerFn(getAtoConteudo);
  const q = useQuery({
    queryKey: ["ato-conteudo", atoId],
    queryFn: () => fn({ data: { id: atoId } }),
    staleTime: 5 * 60_000,
  });

  if (q.isLoading) {
    return (
      <div className="px-4 py-16 flex flex-col items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-3" />
        <p className="text-sm">Carregando ato…</p>
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div className="px-4 py-10 max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {q.error instanceof Error ? q.error.message : "Não foi possível carregar este ato."}
        </div>
      </div>
    );
  }

  const { ato, conteudoHtml, erroConteudo } = q.data;

  return (
    <article className="px-4 md:px-8 py-5 max-w-3xl mx-auto pb-16">
      {erroConteudo ? (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm text-yellow-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Não conseguimos carregar o texto do ato dentro do app.</span>
          </div>
          <a
            href={ato.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gold font-semibold hover:underline"
          >
            Abrir no Planalto <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : (
        <>
          <div
            className="planalto-doc"
            dangerouslySetInnerHTML={{ __html: conteudoHtml }}
          />
          <div className="mt-8 pt-5 border-t border-border">
            <a
              href={ato.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold"
            >
              Ver fonte original no Planalto <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </>
      )}
    </article>
  );
}
