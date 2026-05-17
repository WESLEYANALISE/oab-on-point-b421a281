import { useState } from "react";
import { Loader2, BookOpen, X, ChevronDown, ChevronUp, FileText, ListChecks } from "lucide-react";
import { useResumoQueue, resumoQueue } from "@/lib/resumo-queue";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Floating indicator visible on any route while a resumo generation queue is active.
 * Shows detailed live info: current job, etapa, progress, next-in-line.
 */
export function ResumoQueueIndicator() {
  const { data: isAdmin } = useIsAdmin();
  const state = useResumoQueue();
  const [expanded, setExpanded] = useState(true);

  if (!isAdmin) return null;
  if (!state.atual && state.fila.length === 0) return null;

  const totalRestante = state.fila.length + (state.atual ? 1 : 0);
  const previasNaFila = state.fila.filter((i) => i.kind === "previa").length;
  const capitulosNaFila = state.fila.filter((i) => i.kind === "capitulos").length;

  const atual = state.atual;
  const prog = atual?.progress;
  const pct =
    prog && prog.total && prog.feitos !== undefined
      ? Math.min(100, Math.round((prog.feitos / prog.total) * 100))
      : null;

  // Próxima prévia / próximo resumo (capítulos) na fila
  const proxPrevia = state.fila.find((i) => i.kind === "previa");
  const proxCapitulos = state.fila.find((i) => i.kind === "capitulos");

  return (
    <div className="fixed z-[90] right-4 bottom-44 md:bottom-24 max-w-[calc(100vw-2rem)] w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/40 transition"
      >
        <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 grid place-items-center">
          {atual ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Fila de resumos · {totalRestante} restante{totalRestante === 1 ? "" : "s"}
          </p>
          <p className="text-sm font-medium truncate">
            {atual
              ? `${atual.kind === "previa" ? "Prévia" : "Resumo"}: ${atual.titulo}`
              : `${state.fila.length} aguardando…`}
          </p>
          {atual && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {prog?.etapa ?? (atual.kind === "previa" ? "Lendo PDF…" : "Gerando capítulos…")}
              {prog?.titulo ? ` — ${prog.titulo}` : ""}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Progress bar */}
      {atual && (
        <div className="px-3 pb-2">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            {pct !== null ? (
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            ) : (
              <div className="h-full w-1/3 bg-primary animate-[shimmer_1.5s_ease-in-out_infinite]" />
            )}
          </div>
          {pct !== null && (
            <p className="text-[10px] text-muted-foreground mt-1 text-right tabular-nums">
              {prog?.feitos}/{prog?.total} capítulos · {pct}%
            </p>
          )}
        </div>
      )}

      {expanded && (
        <div className="border-t border-border px-3 py-2 space-y-2 max-h-72 overflow-y-auto">
          {/* Resumo da fila */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-muted/40 px-2 py-1.5">
              <p className="text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> Prévias
              </p>
              <p className="font-semibold tabular-nums">{previasNaFila}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-2 py-1.5">
              <p className="text-muted-foreground flex items-center gap-1">
                <ListChecks className="h-3 w-3" /> Resumos
              </p>
              <p className="font-semibold tabular-nums">{capitulosNaFila}</p>
            </div>
          </div>

          {/* Próximos */}
          {proxPrevia && proxPrevia.key !== atual?.key && (
            <div className="text-[11px]">
              <p className="text-muted-foreground uppercase tracking-wider text-[9px]">
                Próxima prévia
              </p>
              <p className="font-medium truncate">{proxPrevia.titulo}</p>
            </div>
          )}
          {proxCapitulos && proxCapitulos.key !== atual?.key && (
            <div className="text-[11px]">
              <p className="text-muted-foreground uppercase tracking-wider text-[9px]">
                Próximo resumo
              </p>
              <p className="font-medium truncate">{proxCapitulos.titulo}</p>
            </div>
          )}

          {/* Lista completa */}
          {state.fila.length > 0 && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Ver fila completa ({state.fila.length})
              </summary>
              <ol className="mt-1.5 space-y-1 pl-2">
                {state.fila.slice(0, 50).map((i, idx) => (
                  <li key={i.key} className="flex items-start gap-1.5 truncate">
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {idx + 1}.
                    </span>
                    <span
                      className={`shrink-0 text-[9px] uppercase px-1 rounded ${
                        i.kind === "previa"
                          ? "bg-primary/10 text-primary"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {i.kind === "previa" ? "prévia" : "resumo"}
                    </span>
                    <span className="truncate">{i.titulo}</span>
                  </li>
                ))}
                {state.fila.length > 50 && (
                  <li className="text-muted-foreground">+{state.fila.length - 50} mais…</li>
                )}
              </ol>
            </details>
          )}
        </div>
      )}

      <div className="flex border-t border-border">
        <button
          onClick={() => {
            if (
              confirm(
                "Cancelar toda a fila de resumos? O item atual será interrompido após o próximo capítulo.",
              )
            ) {
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
