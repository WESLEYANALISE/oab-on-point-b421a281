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
  const featured = useMemo(() => (categoria ? null : list[0] ?? null), [list, categoria]);
  const rest = featured ? list.slice(1) : list;

  return (
    <div className="pb-12">
      {/* Hero */}
      <header className="px-4 md:px-8 pt-5 md:pt-8 pb-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Início
        </Link>
        <div className="rounded-3xl p-5 md:p-8 bg-gradient-toga text-primary-foreground border border-gold/20 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gold/10 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-2xl bg-gold/20 border border-gold/30 grid place-items-center shrink-0">
              <Newspaper className="h-6 w-6 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold">
                Blogger OAB
              </p>
              <h1 className="font-display text-2xl md:text-4xl leading-tight mt-1">
                Dicas diárias para sua aprovação
              </h1>
              <p className="text-sm md:text-base text-primary-foreground/75 mt-1.5 max-w-2xl">
                Artigos curtos, diretos e práticos sobre o Exame de Ordem. Sem clichê de cursinho —
                só o que realmente move o ponteiro nos seus estudos.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Categorias */}
      <div className="px-4 md:px-8 mb-5">
        {cats.data && cats.data.length > 0 && (
          <CategoriaChips categorias={cats.data} ativa={categoria} onChange={setCategoria} />
        )}
      </div>

      {/* Featured */}
      {featured && (
        <section className="px-4 md:px-8 mb-6">
          <FeaturedPost post={featured} />
        </section>
      )}

      {/* Grid */}
      <section className="px-4 md:px-8">
        {posts.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-card animate-pulse h-72"
              />
            ))}
          </div>
        ) : rest.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>Nenhum post nesta categoria ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
