import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type BibCfg = {
  table: string;
  title: string;
  capaCol: string;
  tituloCol: string;
  autorCol?: string;
  linkCol: string;
  downloadCol: string;
  sobreCol: string;
};

export const BIB_MAP: Record<string, BibCfg> = {
  estudos: { table: "BIBLIOTECA-ESTUDOS", title: "Biblioteca de Estudos", capaCol: "Capa-livro", tituloCol: "Tema", linkCol: "Link", downloadCol: "Download", sobreCol: "Sobre" },
  classicos: { table: "BIBLIOTECA-CLASSICOS", title: "Clássicos do Direito", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
  oratoria: { table: "BIBLIOTECA-ORATORIA", title: "Oratória", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
  lideranca: { table: "BIBLIOTECA-LIDERANÇA", title: "Liderança", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
  politica: { table: "BIBLIOTECA-POLITICA", title: "Política", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
  "fora-da-toga": { table: "BIBLIOTECA-FORA-DA-TOGA", title: "Fora da Toga", capaCol: "capa-livro", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
};

const q = (c: string) => `"${c}"`;

export const livrosQueryOptions = (slug: string) => {
  const cfg = BIB_MAP[slug];
  return queryOptions({
    queryKey: ["biblioteca", slug],
    queryFn: async () => {
      const cols = ["id", cfg.capaCol, cfg.tituloCol, cfg.autorCol, cfg.linkCol, cfg.downloadCol, cfg.sobreCol]
        .filter(Boolean)
        .map((c) => q(c as string))
        .join(",");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from(cfg.table).select(cols).order("id");
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
};

export const Route = createFileRoute("/_app/biblioteca/$slug")({
  beforeLoad: ({ params }) => {
    if (!BIB_MAP[params.slug]) throw notFound();
  },
  head: ({ params }) => ({ meta: [{ title: `${BIB_MAP[params.slug]?.title ?? "Biblioteca"} · OAB na Risca` }] }),
  component: BibliotecaList,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">
      Biblioteca não encontrada. <Link to="/biblioteca" className="underline">Voltar</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Erro ao carregar: {error.message}</div>
  ),
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
