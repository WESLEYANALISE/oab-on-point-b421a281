import { useState } from "react";
import { Loader2, Brain, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from "lucide-react";
import { useFCQueue, fcQueue } from "@/lib/flashcards-curados-queue";
import { useIsAdmin } from "@/hooks/use-admin";

export function FlashcardsCuradosQueueIndicator() {
  const { data: isAdmin } = useIsAdmin();
  const state = useFCQueue();
  const [expanded, setExpanded] = useState(true);

  if (!isAdmin) return null;
  if (!state.atual && state.fila.length === 0) return null;

  const atual = state.atual;
  const prog = atual?.progress;
  const pct =
    prog && prog.total && prog.feitos !== undefined
      ? Math.min(100, Math.round((prog.feitos / prog.total) * 100))
      : null;

  return (
    <div
      className="fixed z-[90] left-2 md:left-4 bottom-[calc(72px+env(safe-area-inset-bottom)+8px)] md:bottom-24 w-[min(20rem,calc(100vw-1rem))] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      style={{ maxHeight: "min(60vh, 480px)" }}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/40 transition"
      >
        <div className="shrink-0 h-9 w-9 rounded-full bg-gold/15 grid place-items-center">
          {atual ? (
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
          ) : (
            <Brain className="h-4 w-4 text-gold" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Flashcards · {state.fila.length + (atual ? 1 : 0)} restante(s)
          </p>
          <p className="text-sm font-medium truncate">
            {atual ? atual.titulo : `${state.fila.length} aguardando…`}
          </p>
          {atual && prog?.capitulo && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              Cap. {prog.feitos}/{prog.total ?? "?"} — {prog.capitulo}
            </p>
          )}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
      </button>

      {atual && (
        <div className="px-3 pb-2">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            {pct !== null ? (
              <div className="h-full bg-gold transition-all duration-500" style={{ width: `${pct}%` }} />
            ) : (
              <div className="h-full w-1/3 bg-gold animate-[shimmer_1.5s_ease-in-out_infinite]" />
            )}
          </div>
        </div>
      )}

      {expanded && state.fila.length > 0 && (
        <div className="border-t border-border px-3 py-2 max-h-48 overflow-y-auto">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Próximos</p>
          <ol className="space-y-1 text-[11px]">
            {state.fila.slice(0, 10).map((i, idx) => (
              <li key={i.key} className="truncate">
                <span className="text-muted-foreground tabular-nums mr-1">{idx + 1}.</span>
                {i.titulo}
              </li>
            ))}
          </ol>
        </div>
      )}

      {expanded && state.historico.length > 0 && (
        <details className="border-t border-border px-3 py-2 text-[11px]">
          <summary className="cursor-pointer text-muted-foreground uppercase tracking-wider text-[9px]">
            Histórico ({state.historico.length})
          </summary>
          <ol className="mt-1.5 space-y-1">
            {[...state.historico].reverse().slice(0, 20).map((h) => (
              <li key={`${h.key}-${h.finishedAt}`} className="flex items-start gap-1.5 truncate">
                {h.status === "pronto" ? (
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                )}
                <span className="truncate">{h.titulo}</span>
              </li>
            ))}
          </ol>
        </details>
      )}

      <div className="border-t border-border">
        <button
          onClick={() => {
            if (confirm("Cancelar toda a fila de flashcards?")) fcQueue.cancelAll();
          }}
          className="w-full p-2 text-xs text-muted-foreground hover:text-destructive inline-flex items-center justify-center gap-1"
        >
          <X className="h-3 w-3" /> Cancelar fila
        </button>
      </div>
    </div>
  );
}
