import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronRight, BookOpen, Clock, ArrowDownAZ, Heart, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { BIB_MAP, livrosQueryOptions, areasQueryOptions, countsQueryOptions, favoritosQueryOptions, toggleFavorito, type SortMode } from "@/lib/biblioteca";
import { supabaseImage, supabaseImageSrcSet } from "@/lib/supabase-image";

const PAGE_SIZE = 60;

export const Route = createFileRoute("/_app/biblioteca/$slug/")({
  head: ({ params }) => ({
    meta: [
      { title: `${BIB_MAP[params.slug]?.title ?? "Biblioteca"} · OAB na Risca` },
      { name: "description", content: `Livros de ${BIB_MAP[params.slug]?.title ?? "biblioteca"} para preparação da OAB.` },
    ],
  }),
  loader: ({ params, context }) => {
    if (BIB_MAP[params.slug]?.hasAreas) {
      context.queryClient.prefetchQuery(areasQueryOptions(params.slug));
    } else {
      context.queryClient.prefetchQuery(livrosQueryOptions(params.slug, null, PAGE_SIZE, 0, "cronologica"));
    }
  },
  component: BibliotecaList,
});

type ViewMode = SortMode | "favoritos";

function BibliotecaList() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const cfg = BIB_MAP[slug];
  const [area, setArea] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [view, setView] = useState<ViewMode>("cronologica");
  const sort: SortMode = view === "favoritos" ? "cronologica" : view;

  const showAreas = cfg.hasAreas && area === null && view !== "favoritos";

  const { data: areas, isLoading: areasLoading } = useQuery(areasQueryOptions(slug));
  const { data: livros, isLoading: livrosLoading } = useQuery({
    ...livrosQueryOptions(slug, area, view === "favoritos" ? 500 : limit, 0, sort),
    enabled: !showAreas,
    placeholderData: keepPreviousData,
  });
  const { data: counts } = useQuery(countsQueryOptions());
  const { data: favoritos } = useQuery(favoritosQueryOptions(slug));
  const favSet = useMemo(() => new Set((favoritos ?? []).map((f) => f.livro_id)), [favoritos]);
  const total = counts?.[slug];

  const favMutation = useMutation({
    mutationFn: ({ id, fav }: { id: number; fav: boolean }) => toggleFavorito(slug, id, fav),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["livros-favoritos"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const livrosVisiveis = useMemo(() => {
    if (!livros) return livros;
    if (view === "favoritos") return livros.filter((l) => favSet.has(Number(l.id)));
    return livros;
  }, [livros, view, favSet]);

  const goBack = () => {
    if (cfg.hasAreas && area !== null) {
      setArea(null);
      setLimit(PAGE_SIZE);
      setView("cronologica");
    } else {
      navigate({ to: "/biblioteca" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Voltar"
            className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted/70 border border-border text-foreground hover:bg-muted active:scale-95 transition-all tap-feedback flex-shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 animate-fade-in">
            <h1 className="font-sans text-lg font-bold text-foreground leading-tight truncate">
              {area ?? cfg.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {showAreas
                ? `${areas?.length ?? 0} áreas${total ? ` · ${total} livros` : ""}`
                : view === "favoritos"
                  ? `${livrosVisiveis?.length ?? 0} favoritos`
                  : `${livros?.length ?? 0} livros`}
            </p>
          </div>
        </div>
      </header>


      <div className="container mx-auto px-4 py-3">
        {showAreas ? (
          <>
            {areas && areas.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {areas.map(({ area: a, total: t }, idx) => (
                  <li
                    key={a}
                    className="animate-fade-in opacity-0"
                    style={{ animationDelay: `${Math.min(idx, 12) * 30}ms`, animationFillMode: "forwards" }}
                  >
                    <button
                      onClick={() => { setArea(a); setLimit(PAGE_SIZE); window.scrollTo(0, 0); }}
                      className="group w-full flex items-center gap-4 p-4 text-left rounded-2xl border border-border bg-gradient-to-br from-card to-card/60 hover:from-primary/10 hover:to-card hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] transition-all duration-200 shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 transition-all duration-200">
                        <BookOpen className="w-5 h-5" strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-sans text-[15px] font-semibold text-foreground leading-tight line-clamp-2">{a}</div>
                        <div className="font-sans text-xs text-muted-foreground mt-1">
                          {t} {t === 1 ? "livro" : "livros"}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 flex-shrink-0 transition-all duration-200" />
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
            <div className="mb-3 inline-flex rounded-xl border border-border bg-card p-1 text-xs font-medium animate-fade-in">
              {([
                { id: "cronologica", label: "Ordem de estudo", Icon: Clock },
                { id: "alfabetica", label: "A–Z", Icon: ArrowDownAZ },
                { id: "favoritos", label: "Favoritos", Icon: Heart },
              ] as const).map(({ id, label, Icon }) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    onClick={() => { setView(id); setLimit(PAGE_SIZE); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 ${active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                    aria-pressed={active}
                  >
                    <Icon className={`w-3.5 h-3.5 transition-transform duration-200 ${active ? "scale-110" : ""}`} /> {label}
                  </button>
                );
              })}
            </div>

            {livrosVisiveis && livrosVisiveis.length === 0 && !livrosLoading && (
              <p className="text-sm text-muted-foreground text-center py-8 animate-fade-in">
                {view === "favoritos" ? "Você ainda não favoritou nenhum livro." : "Nenhum livro disponível."}
              </p>
            )}

            {livrosVisiveis && livrosVisiveis.length > 0 && (
              <>
                <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
                  {livrosVisiveis.map((l, idx) => {
                    const id = String(l.id);
                    const isFav = favSet.has(Number(l.id));
                    return (
                      <li
                        key={id}
                        className="relative animate-fade-in opacity-0"
                        style={{ animationDelay: `${Math.min(idx, 12) * 30}ms`, animationFillMode: "forwards" }}
                      >
                        <Link
                          to="/biblioteca/$slug/$bookId"
                          params={{ slug, bookId: id }}
                          preload={false}
                          className="flex items-center gap-3 p-3 pr-12 hover:bg-muted/50 active:bg-muted/70 transition-colors duration-150"
                        >
                          <div className="relative w-14 h-20 rounded overflow-hidden bg-white border border-border flex-shrink-0">
                            {l.capa ? (
                              <img
                                src={supabaseImage(l.capa, { w: 160, q: 80 }) ?? l.capa}
                                srcSet={supabaseImageSrcSet(l.capa, 80, 80)}
                                sizes="56px"
                                alt={l.titulo}
                                loading={idx < 6 ? "eager" : "lazy"}
                                decoding="async"
                                className="w-full h-full object-contain"
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            favMutation.mutate({ id: Number(l.id), fav: isFav });
                          }}
                          aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                          aria-pressed={isFav}
                          className="absolute top-1.5 left-1.5 z-10 p-1 rounded-full bg-background/85 backdrop-blur shadow-sm border border-border hover:scale-110 active:scale-90 transition-transform duration-200"
                        >
                          <Heart key={String(isFav)} className={`w-3.5 h-3.5 transition-colors ${isFav ? "fill-primary text-primary animate-scale-in" : "text-muted-foreground"}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {view !== "favoritos" && livros && livros.length >= limit && (
                  <div className="mt-4 flex justify-center">
                    <button
                      onClick={() => setLimit((n) => n + PAGE_SIZE)}
                      className="px-4 py-2 rounded-xl border border-border bg-card text-sm font-medium hover:bg-muted hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
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
