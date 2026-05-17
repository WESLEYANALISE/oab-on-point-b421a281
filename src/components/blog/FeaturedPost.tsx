import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight } from "lucide-react";
import type { BlogPostListItem } from "@/lib/blog.functions";
import { supabaseImage, supabaseImageSrcSet } from "@/lib/supabase-image";

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export function FeaturedPost({ post }: { post: BlogPostListItem }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group relative block rounded-3xl overflow-hidden border border-gold/20 bg-card hover:border-gold/50 transition-colors"
    >
      <div className="grid md:grid-cols-[1.2fr_1fr]">
        <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[320px] bg-muted overflow-hidden">
          {post.capa_url ? (
            <img
              src={supabaseImage(post.capa_url, { w: 1200, q: 78 })}
              srcSet={supabaseImageSrcSet(post.capa_url, 800, 78)}
              sizes="(max-width: 768px) 100vw, 60vw"
              width={800}
              height={500}
              alt=""
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-toga" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/55 md:from-card via-black/10 md:via-card/40 to-transparent" />
          <span className="absolute top-3 left-3 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-gold text-gold-foreground">
            Em destaque · {post.categoria}
          </span>
        </div>
        <div className="p-5 md:p-7 flex flex-col justify-center gap-3">
          <h2 className="font-display text-2xl md:text-3xl leading-tight">{post.titulo}</h2>
          {post.subtitulo && (
            <p className="text-sm md:text-base text-muted-foreground">{post.subtitulo}</p>
          )}
          <p className="text-sm text-muted-foreground line-clamp-3">{post.resumo}</p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
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
            <span className="inline-flex items-center gap-1 text-gold font-semibold group-hover:translate-x-0.5 transition-transform">
              Ler agora <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
