import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight } from "lucide-react";
import type { BlogPostListItem } from "@/lib/blog.functions";
import { supabaseImage, supabaseImageSrcSet } from "@/lib/supabase-image";

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function PostCard({ post }: { post: BlogPostListItem }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group flex flex-col rounded-2xl overflow-hidden border border-border bg-card hover:border-gold/40 hover:-translate-y-0.5 transition-all"
    >
      <div className="aspect-[16/10] relative overflow-hidden bg-muted">
        {post.capa_url ? (
          <img
            src={post.capa_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-toga" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
        <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-gold text-gold-foreground">
          {post.categoria}
        </span>
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className="font-display text-base md:text-lg leading-tight line-clamp-2">
          {post.titulo}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{post.resumo}</p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.tempo_leitura_min} min
            {post.publicado_em && (
              <>
                <span className="mx-1.5">·</span>
                {DATE.format(new Date(post.publicado_em))}
              </>
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-gold font-semibold group-hover:translate-x-0.5 transition-transform">
            Ler <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}
