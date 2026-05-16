import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function SectionHeader({
  eyebrow,
  title,
  to,
  cta = "Ver tudo",
}: {
  eyebrow?: string;
  title: string;
  to?: string;
  cta?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3 px-4 md:px-0 mb-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-1">{eyebrow}</p>
        )}
        <h2 className="font-display text-2xl md:text-3xl leading-tight">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="text-xs md:text-sm font-medium text-primary hover:underline inline-flex items-center gap-0.5 shrink-0">
          {cta} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
