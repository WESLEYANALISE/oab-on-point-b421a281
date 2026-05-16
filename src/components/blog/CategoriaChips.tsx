import { cn } from "@/lib/utils";

export function CategoriaChips({
  categorias,
  ativa,
  onChange,
}: {
  categorias: { categoria: string; total: number }[];
  ativa: string | null;
  onChange: (c: string | null) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 md:mx-0 md:px-0">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
          ativa === null
            ? "bg-gold text-gold-foreground border-gold"
            : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-gold/40",
        )}
      >
        Todos
      </button>
      {categorias.map((c) => (
        <button
          key={c.categoria}
          type="button"
          onClick={() => onChange(c.categoria)}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors inline-flex items-center gap-1.5",
            ativa === c.categoria
              ? "bg-gold text-gold-foreground border-gold"
              : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-gold/40",
          )}
        >
          {c.categoria}
          <span className="text-[10px] opacity-70">{c.total}</span>
        </button>
      ))}
    </div>
  );
}
