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
    <div className="flex items-end justify-between gap-3 px-4 md:px-0 mb-4">
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-1.5">{eyebrow}</p>
        )}
        <h2 className="font-display font-semibold text-[26px] md:text-[32px] leading-[1.05] tracking-tight">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="text-xs md:text-sm font-medium text-gold hover:text-gold/80 inline-flex items-center gap-0.5 shrink-0">
          {cta} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
