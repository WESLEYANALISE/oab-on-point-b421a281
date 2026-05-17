import { Loader2, BookOpen, X } from "lucide-react";
import { useResumoQueue, resumoQueue } from "@/lib/resumo-queue";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Floating indicator visible on any route while a resumo generation queue is active.
 * Positioned above the simulado indicator so both can coexist.
 */
export function ResumoQueueIndicator() {
  const { data: isAdmin } = useIsAdmin();
  const state = useResumoQueue();

  if (!isAdmin) return null;
  if (!state.atual && state.fila.length === 0) return null;

  const totalRestante = state.fila.length + (state.atual ? 1 : 0);

  return (
    <div className="fixed z-[90] right-4 bottom-44 md:bottom-24 max-w-[calc(100vw-2rem)] w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      <div className="w-full p-3 flex items-center gap-3">
        <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 grid place-items-center">
          {state.atual ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Fila de resumos · {totalRestante} restante{totalRestante === 1 ? "" : "s"}
          </p>
          <p className="text-sm font-medium truncate">
            {state.atual ? state.atual.titulo : `${state.fila.length} aguardando…`}
          </p>
          {state.atual && (
            <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full w-1/3 bg-primary animate-[shimmer_1.5s_ease-in-out_infinite]" />
            </div>
          )}
        </div>
      </div>
      <div className="flex border-t border-border">
        <button
          onClick={() => {
            if (confirm("Cancelar toda a fila de resumos? O item atual será interrompido após o próximo capítulo.")) {
              resumoQueue.cancelAll();
            }
          }}
          className="flex-1 p-2 text-xs text-muted-foreground hover:text-destructive inline-flex items-center justify-center gap-1"
        >
          <X className="h-3 w-3" /> Cancelar fila
        </button>
      </div>
    </div>
  );
}
