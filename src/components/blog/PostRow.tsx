import { Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import type { BlogPostListItem } from "@/lib/blog.functions";

const DATE = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function PostRow({ post }: { post: BlogPostListItem }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group flex gap-3 rounded-2xl overflow-hidden border border-border bg-card hover:border-gold/40 transition-all p-2.5"
    >
      <div className="relative h-24 w-24 shrink-0 rounded-xl overflow-hidden bg-muted">
        {post.capa_url ? (
          <img
            src={post.capa_url}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-toga" />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
        <div className="min-w-0">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-gold">
            {post.categoria}
          </span>
          <h3 className="font-display text-[15px] leading-snug line-clamp-2 mt-0.5">
            {post.titulo}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{post.resumo}</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1.5">
          <Clock className="h-3 w-3" />
          {post.tempo_leitura_min} min
          {post.publicado_em && (
            <>
              <span className="mx-1">·</span>
              {DATE.format(new Date(post.publicado_em))}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
