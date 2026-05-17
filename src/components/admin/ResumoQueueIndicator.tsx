import { useState, useMemo } from "react";
import {
  Loader2,
  BookOpen,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  ListChecks,
  CheckCircle2,
  AlertCircle,
  Activity,
  RotateCcw,
} from "lucide-react";
import { useResumoQueue, resumoQueue } from "@/lib/resumo-queue";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Floating indicator visible on any route while a resumo generation queue is active.
 * - Mostra tudo (sem limite de 50)
 * - Mobile-friendly: posicionada acima do BottomNav, com altura controlada
 * - Mostra em tempo real o que está sendo gerado
 */
export function ResumoQueueIndicator() {
  const { data: isAdmin } = useIsAdmin();
  const state = useResumoQueue();
  const [expanded, setExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const atual = state.atual;
  const prog = atual?.progress;
  const previasNaFila = state.fila.filter((i) => i.kind === "previa").length;
  const capitulosNaFila = state.fila.filter((i) => i.kind === "capitulos").length;
  const totalRestante = state.fila.length + (atual ? 1 : 0);

  // Histórico recente (última hora) — hooks SEMPRE antes de qualquer early return.
  const oneHourAgo = Date.now() - 60 * 60_000;
  const concluidosRecentes = useMemo(
    () => state.historico.filter((h) => h.status === "pronto" && h.finishedAt >= oneHourAgo).length,
    [state.historico, oneHourAgo],
  );
  const errosRecentes = useMemo(
    () =>
      state.historico.filter(
        (h) =>
          h.status === "erro" &&
          h.finishedAt >= oneHourAgo &&
          !(h.erro ?? "").includes("reenfileirado"),
      ).length,
    [state.historico, oneHourAgo],
  );
  const reenfileiradosRecentes = useMemo(
    () =>
      state.historico.filter(
        (h) =>
          h.status === "erro" &&
          h.finishedAt >= oneHourAgo &&
          (h.erro ?? "").includes("reenfileirado"),
      ).length,
    [state.historico, oneHourAgo],
  );
  const ultimoConcluido = useMemo(
    () => [...state.historico].reverse().find((h) => h.status === "pronto"),
    [state.historico],
  );

  if (!isAdmin) return null;
  if (!state.atual && state.fila.length === 0) return null;

  const pct =
    prog && prog.total && prog.feitos !== undefined
      ? Math.min(100, Math.round((prog.feitos / prog.total) * 100))
      : null;

  const proxPrevia = state.fila.find((i) => i.kind === "previa");
  const proxCapitulos = state.fila.find((i) => i.kind === "capitulos");

  const itensVisiveis = showAll ? state.fila : state.fila.slice(0, 20);

  return (
    <div
      className="fixed z-[90] right-2 md:right-4 bottom-[calc(72px+env(safe-area-inset-bottom)+8px)] md:bottom-24 w-[min(22rem,calc(100vw-1rem))] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={{ maxHeight: "min(80vh, 640px)" }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/40 transition shrink-0"
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
            Fila · {totalRestante} restante{totalRestante === 1 ? "" : "s"}
            {concluidosRecentes > 0 && (
              <span className="text-emerald-500"> · {concluidosRecentes} ✓ (1h)</span>
            )}
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
        <div className="px-3 pb-2 shrink-0">
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
        <div className="border-t border-border px-3 py-2 space-y-2 overflow-y-auto flex-1 overscroll-contain">
          {/* Atual em destaque */}
          {atual && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2 space-y-1">
              <p className="text-[9px] uppercase tracking-wider text-primary flex items-center gap-1">
                <Activity className="h-3 w-3 animate-pulse" /> Gerando agora
              </p>
              <p className="text-[12px] font-medium truncate">{atual.titulo}</p>
              <p className="text-[10px] text-muted-foreground">
                {atual.kind === "previa" ? "Prévia (OCR + sumário)" : "Resumo (capítulos)"}
                {prog?.etapa ? ` · ${prog.etapa}` : ""}
              </p>
              {prog?.titulo && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Cap. atual: {prog.titulo}
                </p>
              )}
            </div>
          )}

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

          {/* Stats da hora */}
          {(concluidosRecentes > 0 || errosRecentes > 0 || reenfileiradosRecentes > 0) && (
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-lg bg-emerald-500/10 px-2 py-1.5">
                <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> OK (1h)
                </p>
                <p className="font-semibold tabular-nums">{concluidosRecentes}</p>
              </div>
              <div className="rounded-lg bg-amber-500/10 px-2 py-1.5">
                <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Retry (1h)
                </p>
                <p className="font-semibold tabular-nums">{reenfileiradosRecentes}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 px-2 py-1.5">
                <p className="text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Erro (1h)
                </p>
                <p className="font-semibold tabular-nums">{errosRecentes}</p>
              </div>
            </div>
          )}

          {ultimoConcluido && (
            <div className="text-[11px]">
              <p className="text-muted-foreground uppercase tracking-wider text-[9px]">
                Último concluído
              </p>
              <p className="font-medium truncate">{ultimoConcluido.titulo}</p>
            </div>
          )}

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
            <div className="text-[11px]">
              <p className="text-muted-foreground uppercase tracking-wider text-[9px] mb-1">
                Fila ({state.fila.length})
              </p>
              <ol className="space-y-1 pl-0">
                {itensVisiveis.map((i, idx) => (
                  <li key={i.key} className="flex items-start gap-1.5 truncate">
                    <span className="text-muted-foreground tabular-nums shrink-0 w-6">
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
              </ol>
              {!showAll && state.fila.length > 20 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="mt-1 text-primary hover:underline text-[11px]"
                >
                  Ver todos os {state.fila.length} itens
                </button>
              )}
              {showAll && state.fila.length > 20 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="mt-1 text-muted-foreground hover:text-foreground text-[11px]"
                >
                  Recolher
                </button>
              )}
            </div>
          )}

          {/* Histórico recente */}
          {state.historico.length > 0 && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground uppercase tracking-wider text-[9px]">
                Histórico ({state.historico.length})
              </summary>
              <ol className="mt-1.5 space-y-1">
                {[...state.historico].reverse().map((h) => (
                  <li key={`${h.key}-${h.finishedAt}`} className="flex items-start gap-1.5 truncate">
                    {h.status === "pronto" ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                    ) : h.status === "erro" ? (
                      <AlertCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <X className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <span className="truncate">{h.titulo}</span>
                  </li>
                ))}
              </ol>
            </details>
          )}
        </div>
      )}

      <div className="flex border-t border-border shrink-0">
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
