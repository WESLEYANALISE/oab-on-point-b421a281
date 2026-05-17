import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Newspaper } from "lucide-react";
import { listBlogPosts, listBlogCategorias } from "@/lib/blog.functions";
import { PostRow } from "@/components/blog/PostRow";
import { CategoriaChips } from "@/components/blog/CategoriaChips";

export const Route = createFileRoute("/_app/blog")({
  head: () => ({
    meta: [
      { title: "Blogger OAB — Dicas e artigos | OAB na Risca" },
      {
        name: "description",
        content:
          "Artigos diários com dicas, estratégias e estudos sobre o Exame de Ordem da OAB. Conteúdo direto e prático para acelerar sua aprovação.",
      },
      { property: "og:title", content: "Blogger OAB — OAB na Risca" },
      {
        property: "og:description",
        content: "Artigos diários sobre OAB: estratégias, estudo, mente e reta final.",
      },
    ],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [categoria, setCategoria] = useState<string | null>(null);
  const posts = useQuery({
    queryKey: ["blog", "list", categoria],
    queryFn: () => listBlogPosts({ data: { categoria: categoria ?? undefined, limit: 40 } }),
  });
  const cats = useQuery({
    queryKey: ["blog", "categorias"],
    queryFn: () => listBlogCategorias(),
  });

  const list = posts.data ?? [];

  return (
    <div className="pb-12">
      {/* Hero compacto */}
      <header className="px-4 md:px-8 pt-3 md:pt-6 pb-4">
        <div className="rounded-2xl p-4 md:p-5 bg-gradient-toga text-primary-foreground border border-gold/20 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold/20 border border-gold/30 grid place-items-center shrink-0">
              <Newspaper className="h-5 w-5 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.18em] text-gold font-semibold">
                Blogger OAB
              </p>
              <h1 className="font-display text-lg md:text-2xl leading-tight">
                Dicas diárias para sua aprovação
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Categorias */}
      <div className="px-4 md:px-8 mb-4">
        {cats.data && cats.data.length > 0 && (
          <CategoriaChips categorias={cats.data} ativa={categoria} onChange={setCategoria} />
        )}
      </div>

      {/* Lista */}
      <section className="px-4 md:px-8">
        {posts.isLoading ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card animate-pulse h-28"
              />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Nenhum post nesta categoria ainda.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {list.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
