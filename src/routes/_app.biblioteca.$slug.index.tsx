import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { BIB_MAP, livrosQueryOptions, areasQueryOptions, countsQueryOptions } from "@/lib/biblioteca";

const PAGE_SIZE = 60;

export const Route = createFileRoute("/_app/biblioteca/$slug/")({
  loader: ({ params, context }) => {
    if (BIB_MAP[params.slug]?.hasAreas) {
      context.queryClient.prefetchQuery(areasQueryOptions(params.slug));
    } else {
      context.queryClient.prefetchQuery(livrosQueryOptions(params.slug, null, PAGE_SIZE, 0));
    }
  },
  component: BibliotecaList,
});

function BibliotecaList() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const cfg = BIB_MAP[slug];
  const [area, setArea] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const showAreas = cfg.hasAreas && area === null;

  const { data: areas, isLoading: areasLoading } = useQuery(areasQueryOptions(slug));
  const { data: livros, isLoading: livrosLoading } = useQuery({
    ...livrosQueryOptions(slug, area, limit, 0),
    enabled: !showAreas,
  });
  const { data: counts } = useQuery(countsQueryOptions());
  const total = counts?.[slug];

  const goBack = () => {
    if (cfg.hasAreas && area !== null) {
      setArea(null);
      setLimit(PAGE_SIZE);
    } else {
      navigate({ to: "/biblioteca" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 -ml-2 rounded-full hover:bg-muted"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-sans text-lg font-bold text-foreground leading-tight truncate">
              {area ?? cfg.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {showAreas
                ? `${areas?.length ?? 0} áreas${total ? ` · ${total} livros` : ""}`
                : livrosLoading && !livros
                  ? "Carregando…"
                  : `${livros?.length ?? 0} livros`}
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-3">
        {showAreas ? (
          <>
            {areasLoading && !areas && (
              <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
                {Array.from({ length: 8 }).map((_, i) => (
                  <li key={i} className="p-4">
                    <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
                  </li>
                ))}
              </ul>
            )}
            {areas && areas.length > 0 && (
              <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
                {areas.map((a) => (
                  <li key={a}>
                    <button
                      onClick={() => { setArea(a); setLimit(PAGE_SIZE); window.scrollTo(0, 0); }}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-sans text-sm font-medium text-foreground">{a}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {areas && areas.length === 0 && !areasLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma área disponível.</p>
            )}
          </>
        ) : (
          <>
            {livrosLoading && !livros && (
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

            {livros && livros.length === 0 && !livrosLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum livro disponível.</p>
            )}

            {livros && livros.length > 0 && (
              <>
                <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
                  {livros.map((l, idx) => {
                    const id = String(l.id);
                    return (
                      <li key={id}>
                        <Link
                          to="/biblioteca/$slug/$bookId"
                          params={{ slug, bookId: id }}
                          preload={false}
                          className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-14 h-20 rounded overflow-hidden bg-muted border border-border flex-shrink-0">
                            {l.capa ? (
                              <img
                                src={l.capa}
                                alt={l.titulo}
                                width={56}
                                height={80}
                                loading={idx < 6 ? "eager" : "lazy"}
                                decoding="async"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground p-1 text-center font-sans">{l.titulo}</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-sans text-sm font-medium text-foreground line-clamp-2 leading-snug">{l.titulo}</div>
                            {l.autor && <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{l.autor}</div>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                {livros.length >= limit && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setLimit((n) => n + PAGE_SIZE)}
                      className="px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted"
                    >
                      Carregar mais
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
