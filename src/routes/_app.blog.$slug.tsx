import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Share2, ChevronRight, Sparkles } from "lucide-react";
import { getBlogPost, getRelatedBlogPosts } from "@/lib/blog.functions";
import { MarkdownView } from "@/components/blog/MarkdownView";
import { PostCard } from "@/components/blog/PostCard";
import { supabaseImage, supabaseImageSrcSet } from "@/lib/supabase-image";

const DATE = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export const Route = createFileRoute("/_app/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "Blog — OAB na Risca" }] };
    return {
      meta: [
        { title: `${p.titulo} | Blogger OAB` },
        { name: "description", content: p.resumo },
        { property: "og:title", content: p.titulo },
        { property: "og:description", content: p.resumo },
        ...(p.capa_url ? [{ property: "og:image", content: p.capa_url }] : []),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="px-4 py-16 text-center">
      <p className="font-display text-2xl">Artigo não encontrado</p>
      <Link to="/blog" className="text-gold underline mt-3 inline-block">
        Voltar ao blog
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="px-4 py-16 text-center">
        <p className="font-display text-xl mb-2">Não foi possível carregar este artigo.</p>
        <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="px-4 py-2 rounded-md bg-gold text-gold-foreground font-semibold"
        >
          Tentar novamente
        </button>
      </div>
    );
  },
  component: BlogArticle,
});

function BlogArticle() {
  const { post } = Route.useLoaderData();
  const related = useQuery({
    queryKey: ["blog", "related", post.slug],
    queryFn: () =>
      getRelatedBlogPosts({ data: { slug: post.slug, categoria: post.categoria, limit: 2 } }),
  });

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: post.titulo, text: post.resumo, url });
      } catch {
        /* user cancelou */
      }
    } else if (navigator.clipboard && url) {
      await navigator.clipboard.writeText(url);
    }
  };

  return (
    <article className="pb-16">
      {/* Capa */}
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] bg-muted overflow-hidden">
        {post.capa_url ? (
          <img
            src={supabaseImage(post.capa_url, { w: 1280, q: 80 })}
            srcSet={supabaseImageSrcSet(post.capa_url, 960, 80)}
            sizes="(max-width: 1024px) 100vw, 960px"
            width={960}
            height={540}
            alt=""
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-toga" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute top-4 left-4">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white border border-white/20 hover:bg-black/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Blog
          </Link>
        </div>
      </div>

      {/* Cabeçalho */}
      <header className="px-4 md:px-8 max-w-3xl mx-auto -mt-10 md:-mt-16 relative">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold text-gold-foreground">
          {post.categoria}
        </span>
        <h1 className="font-display text-3xl md:text-5xl leading-tight mt-3">{post.titulo}</h1>
        {post.subtitulo && (
          <p className="text-base md:text-lg text-muted-foreground mt-3">{post.subtitulo}</p>
        )}
        <div className="flex items-center justify-between gap-3 mt-5 pb-5 border-b border-border text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {post.tempo_leitura_min} min de leitura
            {post.publicado_em && (
              <>
                <span className="mx-1.5">·</span>
                {DATE.format(new Date(post.publicado_em))}
              </>
            )}
          </span>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:border-gold/40 hover:text-foreground"
          >
            <Share2 className="h-3.5 w-3.5" /> Compartilhar
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="px-4 md:px-8 max-w-3xl mx-auto mt-6">
        <MarkdownView source={post.conteudo_md} />

        {/* CTA */}
        <div className="mt-10 rounded-2xl border border-gold/25 bg-gradient-toga text-primary-foreground p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold/20 border border-gold/30 grid place-items-center shrink-0">
              <Sparkles className="h-5 w-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="font-display text-lg md:text-xl">Coloque em prática agora</p>
              <p className="text-sm text-primary-foreground/75 mt-1">
                Use o Hub da 1ª Fase para montar seu cronograma, treinar com questões e acompanhar
                sua evolução em tempo real.
              </p>
              <Link
                to="/oab/primeira-fase"
                className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:underline"
              >
                Abrir Hub da 1ª Fase <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((t: string) => (
              <span
                key={t}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Relacionados */}
        {related.data && related.data.length > 0 && (
          <section className="mt-12">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-3">
              Continue lendo
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.data.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
