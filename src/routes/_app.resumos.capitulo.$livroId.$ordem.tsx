import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { obterLivroResumo } from "@/lib/resumos.functions";

export const Route = createFileRoute("/_app/resumos/capitulo/$livroId/$ordem")({
  component: CapituloView,
});

function CapituloView() {
  const { livroId, ordem } = Route.useParams();
  const ordemNum = Number(ordem);
  const fn = useServerFn(obterLivroResumo);
  const { data, isPending } = useQuery({
    queryKey: ["resumo-livro", livroId],
    queryFn: () => fn({ data: { resumo_livro_id: livroId } }),
    staleTime: 60_000,
  });

  const capitulos = data?.capitulos ?? [];
  const atual = useMemo(() => capitulos.find((c) => c.ordem === ordemNum), [capitulos, ordemNum]);
  const idx = atual ? capitulos.findIndex((c) => c.id === atual.id) : -1;
  const prev = idx > 0 ? capitulos[idx - 1] : null;
  const next = idx >= 0 && idx < capitulos.length - 1 ? capitulos[idx + 1] : null;

  if (isPending || !data) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </span>
      </div>
    );
  }

  if (!atual) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        Capítulo não encontrado.{" "}
        <Link to="/resumos/$livroId" params={{ livroId }} className="underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-3xl mx-auto">
      <Link
        to="/resumos/$livroId"
        params={{ livroId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {data.livro.titulo}
      </Link>

      <header className="mb-6 pb-4 border-b border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Capítulo {atual.ordem} de {capitulos.length}
        </p>
        <h1 className="font-display text-2xl md:text-4xl leading-tight mt-1 break-words">
          {atual.titulo}
        </h1>
      </header>

      <article className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-img:rounded-lg prose-img:mx-auto prose-headings:font-display prose-strong:text-foreground prose-a:text-primary">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{atual.conteudo_markdown ?? ""}</ReactMarkdown>
      </article>

      <nav className="mt-10 pt-6 border-t border-border flex justify-between gap-3">
        {prev ? (
          <Link
            to="/resumos/capitulo/$livroId/$ordem"
            params={{ livroId, ordem: String(prev.ordem) }}
            className="inline-flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground max-w-[45%]"
          >
            <ChevronLeft className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="text-left min-w-0">
              <span className="block text-[10px] uppercase">Anterior</span>
              <span className="block truncate">{prev.titulo}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/resumos/capitulo/$livroId/$ordem"
            params={{ livroId, ordem: String(next.ordem) }}
            className="inline-flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground ml-auto max-w-[45%]"
          >
            <span className="text-right min-w-0">
              <span className="block text-[10px] uppercase">Próximo</span>
              <span className="block truncate">{next.titulo}</span>
            </span>
            <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
