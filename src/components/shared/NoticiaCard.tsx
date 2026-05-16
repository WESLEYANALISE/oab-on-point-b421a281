import { Link } from "@tanstack/react-router";
import type { Noticia } from "@/data/noticias";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const categoriaCor: Record<Noticia["categoria"], string> = {
  OAB: "bg-primary text-primary-foreground",
  STF: "bg-secondary text-secondary-foreground",
  STJ: "bg-secondary text-secondary-foreground",
  Legislação: "bg-gold text-gold-foreground",
  Carreira: "bg-accent text-accent-foreground",
  Exame: "bg-primary text-primary-foreground",
};

export function NoticiaCard({ noticia, variant = "default" }: { noticia: Noticia; variant?: "default" | "hero" | "compact" }) {
  return (
    <Link
      to="/noticias/$id"
      params={{ id: noticia.id }}
      className={cn(
        "group block rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
        variant === "compact" ? "min-w-[280px] w-[280px]" : "",
        variant === "hero" ? "md:col-span-2 row-span-2" : "",
      )}
    >
      <div className={cn(
        "relative p-5 flex flex-col gap-3",
        variant === "hero" ? "min-h-[260px] bg-gradient-toga text-primary-foreground" : "",
      )}>
        <div className="flex items-center gap-2">
          <span className={cn("text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold", variant === "hero" ? "bg-gold text-gold-foreground" : categoriaCor[noticia.categoria])}>
            {noticia.categoria}
          </span>
          <span className={cn("text-[11px]", variant === "hero" ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {new Date(noticia.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
        </div>
        <h3 className={cn(
          "font-display leading-snug text-balance",
          variant === "hero" ? "text-2xl md:text-3xl" : "text-lg",
        )}>
          {noticia.titulo}
        </h3>
        <p className={cn(
          "text-sm line-clamp-3",
          variant === "hero" ? "text-primary-foreground/80" : "text-muted-foreground",
        )}>
          {noticia.resumo}
        </p>
        <div className={cn("mt-auto flex items-center gap-3 text-[11px]", variant === "hero" ? "text-primary-foreground/70" : "text-muted-foreground")}>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {noticia.leitura}</span>
          <span>· {noticia.fonte}</span>
        </div>
      </div>
    </Link>
  );
}
