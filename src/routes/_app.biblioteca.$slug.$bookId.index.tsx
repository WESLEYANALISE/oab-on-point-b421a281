import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Download } from "lucide-react";
import { BIB_MAP, livroQueryOptions } from "@/lib/biblioteca";

export const Route = createFileRoute("/_app/biblioteca/$slug/$bookId/")({
  loader: ({ params, context }) => {
    context.queryClient.prefetchQuery(livroQueryOptions(params.slug, params.bookId));
  },
  component: BookDetail,
});

function BookDetail() {
  const { slug, bookId } = Route.useParams();
  const navigate = useNavigate();
  const cfg = BIB_MAP[slug];
  const { data: livro, isLoading } = useQuery(livroQueryOptions(slug, bookId));

  if (!cfg) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Biblioteca não encontrada. <Link to="/biblioteca" className="underline">Voltar</Link>
      </div>
    );
  }

  const titulo = livro?.titulo ?? (isLoading ? "Carregando…" : "Sem título");
  const autor = livro?.autor ?? null;
  const capa = livro?.capa ?? null;
  const sobre = livro?.sobre ?? null;
  const link = livro?.link ?? null;
  const download = livro?.download ?? null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/biblioteca/$slug", params: { slug } })}
            className="p-2 -ml-2 rounded-full hover:bg-muted"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">{cfg.title}</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-5 flex-1 flex flex-col">
        <div className="flex gap-4 mb-5">
          <div className="w-28 h-40 rounded-lg overflow-hidden bg-muted border border-border flex-shrink-0 shadow-lg">
            {capa ? (
              <img src={capa} alt={titulo} width={112} height={160} loading="eager" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{titulo}</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground leading-tight">{titulo}</h2>
            {autor && <p className="text-sm text-muted-foreground mt-1">{autor}</p>}
          </div>
        </div>

        {sobre && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Sobre</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{sobre}</p>
          </div>
        )}

        <div className="mt-auto sticky bottom-0 bg-background pt-4 pb-6 grid grid-cols-2 gap-3">
          <a
            href={download ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors ${!download ? "opacity-50 pointer-events-none" : ""}`}
          >
            <Download className="w-4 h-4" /> Baixar
          </a>
          <button
            onClick={() => navigate({ to: "/biblioteca/$slug/$bookId/ler", params: { slug, bookId } })}
            disabled={!link}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <BookOpen className="w-4 h-4" /> Ler
          </button>
        </div>
      </div>
    </div>
  );
}
