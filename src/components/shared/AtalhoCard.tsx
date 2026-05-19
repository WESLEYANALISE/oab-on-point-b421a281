import { memo } from "react";
import { Link } from "@tanstack/react-router";
import type { Atalho } from "@/data/atalhos";
import { cn } from "@/lib/utils";

function AtalhoCardInner({ atalho }: { atalho: Atalho }) {
  const Icon = atalho.icon;
  return (
    <Link
      to={atalho.to}
      className={cn(
        "group relative overflow-hidden rounded-xl p-4 min-h-[110px] flex flex-col justify-between tap-feedback hover:-translate-y-0.5 hover:shadow-lg",
        atalho.cor,
      )}
    >
      <Icon className="h-6 w-6 opacity-90" />
      <div>
        <p className="font-display text-lg leading-tight">{atalho.label}</p>
        <p className="text-[11px] opacity-75 mt-0.5">{atalho.descricao}</p>
      </div>
    </Link>
  );
}

export const AtalhoCard = memo(AtalhoCardInner);

