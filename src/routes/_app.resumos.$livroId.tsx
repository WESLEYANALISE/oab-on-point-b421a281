import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { obterLivroResumo } from "@/lib/resumos.functions";

export const Route = createFileRoute("/_app/resumos/$livroId")({
  component: ResumoLeitor,
});

function ResumoLeitor() {
  const { livroId } = Route.useParams();
  const fn = useServerFn(obterLivroResumo);
  const { data, isLoading } = useQuery({
    queryKey: ["resumo-livro", livroId],
    queryFn: () => fn({ data: { resumo_livro_id: livroId } }),
    staleTime: 60_000,
  });

  const [ordemAtual, setOrdemAtual] = useState<number | null>(null);
  const capitulos = data?.capitulos ?? [];

  useEffect(() => {
    if (capitulos.length && ordemAtual === null) setOrdemAtual(capitulos[0].ordem);
  }, [capitulos, ordemAtual]);

  const atual = useMemo(
    () => capitulos.find((c) => c.ordem === ordemAtual) ?? capitulos[0] ?? null,
    [capitulos, ordemAtual],
  );

  const idx = atual ? capitulos.findIndex((c) => c.id === atual.id) : -1;
  const prev = idx > 0 ? capitulos[idx - 1] : null;
  const next = idx >= 0 && idx < capitulos.length - 1 ? capitulos[idx + 1] : null;

  if (isLoading) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground inline-flex items-center gap-2 mx-auto">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando resumo…
      </div>
    );
  }
  if (!data) {
    return <div className="px-4 py-12 text-center text-muted-foreground">Resumo não encontrado.</div>;
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-7xl mx-auto">
      <Link to="/resumos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-3.5 w-3.5" /> Todos os resumos
      </Link>

      <header className="mb-4 md:mb-6 flex gap-4 items-start">
        {data.livro.capa && (
          <img src={data.livro.capa} alt="" className="w-16 md:w-20 aspect-[3/4] object-cover rounded-md flex-shrink-0" />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-3xl leading-tight">{data.livro.titulo}</h1>
          {data.livro.autor && <p className="text-sm text-muted-foreground">{data.livro.autor}</p>}
          <p className="text-xs text-muted-foreground mt-1">{capitulos.length} capítulos</p>
        </div>
      </header>

      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <aside className="md:sticky md:top-4 md:self-start md:max-h-[calc(100vh-2rem)] md:overflow-y-auto border border-border rounded-xl bg-card p-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> Sumário
          </p>
          <ul className="space-y-0.5">
            {capitulos.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setOrdemAtual(c.ordem)}
                  className={`w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                    atual?.id === c.id ? "bg-accent text-foreground font-medium" : "hover:bg-accent/50 text-muted-foreground"
                  }`}
                >
                  <span className="text-xs opacity-60 mr-2">{c.ordem}.</span>
                  {c.titulo}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <article className="min-w-0">
          {atual ? (
            <>
              <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-img:rounded-lg prose-img:mx-auto prose-headings:font-display">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{atual.conteudo_markdown ?? ""}</ReactMarkdown>
              </div>
              <div className="mt-8 flex justify-between gap-3 border-t pt-4">
                {prev ? (
                  <button
                    onClick={() => setOrdemAtual(prev.ordem)}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="text-left">
                      <span className="block text-[10px] uppercase">Anterior</span>
                      <span className="block">{prev.titulo}</span>
                    </span>
                  </button>
                ) : <span />}
                {next ? (
                  <button
                    onClick={() => setOrdemAtual(next.ordem)}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground ml-auto"
                  >
                    <span className="text-right">
                      <span className="block text-[10px] uppercase">Próximo</span>
                      <span className="block">{next.titulo}</span>
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : <span />}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Nenhum capítulo disponível.</p>
          )}
        </article>
      </div>
    </div>
  );
}
