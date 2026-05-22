import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getNoticia } from "@/data/noticias";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/_app/noticias/$id")({
  loader: ({ params }) => {
    const noticia = getNoticia(params.id);
    if (!noticia) throw notFound();
    return { noticia };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.noticia.titulo} — OAB na Risca` },
      { name: "description", content: loaderData.noticia.resumo },
      { property: "og:title", content: loaderData.noticia.titulo },
      { property: "og:description", content: loaderData.noticia.resumo },
    ] : [],
  }),
  notFoundComponent: () => (
    <div className="px-4 py-16 text-center">
      <p className="font-display text-2xl">Notícia não encontrada</p>
      <Link to="/noticias" className="text-primary hover:underline mt-2 inline-block">Ver todas as notícias</Link>
    </div>
  ),
  component: NoticiaPage,
});

function NoticiaPage() {
  const { noticia } = Route.useLoaderData();
  return (
    <article className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold bg-primary text-primary-foreground">{noticia.categoria}</span>
        <span className="text-xs text-muted-foreground">{new Date(noticia.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</span>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {noticia.leitura}</span>
      </div>
      <h1 className="font-display text-4xl md:text-5xl leading-tight text-balance">{noticia.titulo}</h1>
      <p className="text-lg text-muted-foreground mt-5 leading-relaxed">{noticia.resumo}</p>
      <div className="prose prose-lg max-w-none mt-8 space-y-4 text-foreground">
        <p>
          Este é um conteúdo de exemplo para demonstração do layout de notícia. Na versão final, o texto completo da matéria será carregado dinamicamente, com formatação rica, citações de artigos de lei e links para a fonte original.
        </p>
        <p>
          Fonte: <strong>{noticia.fonte}</strong>
        </p>
      </div>
    </article>
  );
}
