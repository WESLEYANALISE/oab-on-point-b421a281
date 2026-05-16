import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Cfg = {
  table: string;
  title: string;
  capaCol: string;
  tituloCol: string;
  autorCol?: string;
  linkCol: string;
};

const MAP: Record<string, Cfg> = {
  estudos: { table: "BIBLIOTECA-ESTUDOS", title: "Biblioteca de Estudos", capaCol: "Capa-livro", tituloCol: "Tema", linkCol: "Link" },
  classicos: { table: "BIBLIOTECA-CLASSICOS", title: "Clássicos do Direito", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
  oratoria: { table: "BIBLIOTECA-ORATORIA", title: "Oratória", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
  lideranca: { table: "BIBLIOTECA-LIDERANÇA", title: "Liderança", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
  politica: { table: "BIBLIOTECA-POLITICA", title: "Política", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
  "fora-da-toga": { table: "BIBLIOTECA-FORA-DA-TOGA", title: "Fora da Toga", capaCol: "capa-livro", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
};

const quote = (c: string) => `"${c}"`;

const livrosQueryOptions = (slug: string) => {
  const cfg = MAP[slug];
  return queryOptions({
    queryKey: ["biblioteca", slug],
    queryFn: async () => {
      const cols = ["id", cfg.capaCol, cfg.tituloCol, cfg.autorCol, cfg.linkCol]
        .filter(Boolean)
        .map((c) => quote(c as string))
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
    if (!MAP[params.slug]) throw notFound();
  },
  loader: ({ params, context }) => {
    context.queryClient.ensureQueryData(livrosQueryOptions(params.slug));
  },
  head: ({ params }) => ({ meta: [{ title: `${MAP[params.slug]?.title ?? "Biblioteca"} · OAB na Risca` }] }),
  component: BibliotecaList,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">Biblioteca não encontrada. <Link to="/biblioteca" className="underline">Voltar</Link></div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Erro ao carregar: {error.message}</div>
  ),
  pendingComponent: BibliotecaPending,
  pendingMs: 0,
});

function Header({ title }: { title: string }) {
  return (
    <>
      <Link to="/biblioteca" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Bibliotecas
      </Link>
      <h1 className="text-xl font-bold mb-4 text-foreground">{title}</h1>
    </>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
          <div className="h-3 rounded bg-muted animate-pulse" />
          <div className="h-2 w-2/3 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function BibliotecaPending() {
  const { slug } = Route.useParams();
  const cfg = MAP[slug];
  return (
    <div className="container mx-auto px-4 py-4 pb-24">
      <Header title={cfg?.title ?? "Biblioteca"} />
      <SkeletonGrid />
    </div>
  );
}

function BibliotecaList() {
  const { slug } = Route.useParams();
  const cfg = MAP[slug];
  const { data: livros } = useSuspenseQuery(livrosQueryOptions(slug));

  return (
    <div className="container mx-auto px-4 py-4 pb-24">
      <Header title={cfg.title} />

      {livros.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum livro disponível ainda.</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {livros.map((l) => {
          const capa = l[cfg.capaCol] as string | null;
          const titulo = (l[cfg.tituloCol] as string) ?? "Sem título";
          const autor = cfg.autorCol ? (l[cfg.autorCol] as string | null) : null;
          const link = l[cfg.linkCol] as string | null;
          return (
            <a
              key={String(l.id)}
              href={link ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted border border-border">
                {capa ? (
                  <img src={capa} alt={titulo} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground p-2 text-center">{titulo}</div>
                )}
              </div>
              <div className="mt-1.5 text-xs font-medium text-foreground line-clamp-2 leading-tight">{titulo}</div>
              {autor && <div className="text-[10px] text-muted-foreground line-clamp-1">{autor}</div>}
            </a>
          );
        })}
      </div>
    </div>
  );
}
