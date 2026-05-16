import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const MAP: Record<string, { table: string; title: string; isEstudos?: boolean; capaCol: string; tituloCol: string; autorCol?: string; linkCol: string }> = {
  estudos: { table: "BIBLIOTECA-ESTUDOS", title: "Biblioteca de Estudos", isEstudos: true, capaCol: "Capa-livro", tituloCol: "Tema", linkCol: "Link" },
  classicos: { table: "BIBLIOTECA-CLASSICOS", title: "Clássicos do Direito", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
  oratoria: { table: "BIBLIOTECA-ORATORIA", title: "Oratória", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
  lideranca: { table: "BIBLIOTECA-LIDERANÇA", title: "Liderança", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
  politica: { table: "BIBLIOTECA-POLITICA", title: "Política", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
  "fora-da-toga": { table: "BIBLIOTECA-FORA-DA-TOGA", title: "Fora da Toga", capaCol: "capa-livro", tituloCol: "livro", autorCol: "autor", linkCol: "link" },
};

export const Route = createFileRoute("/_app/biblioteca/$slug")({
  beforeLoad: ({ params }) => {
    if (!MAP[params.slug]) throw notFound();
  },
  head: ({ params }) => ({ meta: [{ title: `${MAP[params.slug]?.title ?? "Biblioteca"} · OAB na Risca` }] }),
  component: BibliotecaList,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">Biblioteca não encontrada. <Link to="/biblioteca" className="underline">Voltar</Link></div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Erro ao carregar: {error.message}</div>
  ),
});

function BibliotecaList() {
  const { slug } = Route.useParams();
  const cfg = MAP[slug];

  const { data: livros, isLoading } = useQuery({
    queryKey: ["biblioteca", slug],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from(cfg.table).select("*").order("id");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-4 pb-24">
      <Link to="/biblioteca" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Bibliotecas
      </Link>
      <h1 className="text-xl font-bold mb-4 text-foreground">{cfg.title}</h1>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {!isLoading && (!livros || livros.length === 0) && (
        <p className="text-sm text-muted-foreground">Nenhum livro disponível ainda.</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {livros?.map((l: Record<string, unknown>) => {
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
                  <img src={capa} alt={titulo} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
