import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { BIB_MAP, livrosQueryOptions } from "@/lib/biblioteca";

export const Route = createFileRoute("/_app/biblioteca/$slug/")({
  component: BibliotecaList,
});

function BibliotecaList() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const cfg = BIB_MAP[slug];
  const { data: livros, isLoading } = useQuery(livrosQueryOptions(slug));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/biblioteca" })}
            className="p-2 -ml-2 rounded-full hover:bg-muted"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground leading-tight truncate">{cfg.title}</h1>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Carregando…" : `${livros?.length ?? 0} livros`}
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-3">
        {isLoading && (
          <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
            {Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 p-3">
                <div className="w-14 h-20 rounded bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
                  <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!isLoading && (!livros || livros.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum livro disponível.</p>
        )}

        {!isLoading && livros && livros.length > 0 && (
          <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
            {livros.map((l) => {
              const id = String(l.id);
              const capa = l[cfg.capaCol] as string | null;
              const titulo = (l[cfg.tituloCol] as string) ?? "Sem título";
              const autor = cfg.autorCol ? (l[cfg.autorCol] as string | null) : null;
              return (
                <li key={id}>
                  <Link
                    to="/biblioteca/$slug/$bookId"
                    params={{ slug, bookId: id }}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-14 h-20 rounded overflow-hidden bg-muted border border-border flex-shrink-0">
                      {capa ? (
                        <img src={capa} alt={titulo} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground p-1 text-center">{titulo}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{titulo}</div>
                      {autor && <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{autor}</div>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
