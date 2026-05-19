import { cn } from "@/lib/utils";

/** Skeleton para card padrão de listagem (capa + título + meta). */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden border border-border bg-card",
        className,
      )}
      aria-hidden
    >
      <div className="aspect-[16/10] bg-gradient-to-br from-muted to-muted/40 animate-pulse" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted/70 animate-pulse" />
      </div>
    </div>
  );
}

/** Skeleton compacto para linha de lista. */
export function SkeletonRow() {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
      aria-hidden
    >
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-2/3 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/3 rounded bg-muted/70 animate-pulse" />
      </div>
    </div>
  );
}

/** Grade de SkeletonCard. Use enquanto a lista carrega. */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
