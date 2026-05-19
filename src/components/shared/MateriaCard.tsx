import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { Materia } from "@/data/materias";
import { cn } from "@/lib/utils";

function MateriaCardInner({ materia, compact = false }: { materia: Materia; compact?: boolean }) {
  return (
    <Link
      to="/materias/$slug"
      params={{ slug: materia.slug }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card tap-feedback hover:shadow-md hover:-translate-y-0.5",
        compact ? "min-w-[180px] w-[180px]" : "w-full",
      )}
    >
      <div className={cn("h-24 bg-gradient-to-br p-4 flex items-start justify-between", materia.cor)}>
        <span className="text-3xl">{materia.emoji}</span>
        <span className="text-[10px] uppercase tracking-wider text-primary-foreground/80 font-semibold">{materia.area}</span>
      </div>
      <div className="p-3.5">
        <h3 className="font-display text-base leading-snug text-balance">{materia.nome}</h3>
        <p className="text-[11px] text-muted-foreground mt-1">~{materia.peso} questões / exame</p>
      </div>
    </Link>
  );
}

export const MateriaCard = memo(MateriaCardInner);

