import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ListOrdered, X, ChevronUp } from "lucide-react";
import { useSimuladoQueue, simuladoQueue } from "@/lib/simulado-queue";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";
import { getJobStatus } from "@/lib/simulados-admin.functions";
import { SimuladoProgressModal } from "./SimuladoProgressModal";

/**
 * Floating bottom-right indicator visible on any route while a generation
 * queue is active. Click to expand the full progress modal.
 */
export function SimuladoQueueIndicator() {
  const { data: isAdmin } = useIsAdmin();
  const { session } = useAuth();
  const state = useSimuladoQueue();
  const [open, setOpen] = useState(false);
  const statusFn = useServerFn(getJobStatus);
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  const { data: job } = useQuery({
    queryKey: ["sim-job", state.atual?.jobId],
    enabled: !!state.atual && !!authHeaders,
    queryFn: () =>
      statusFn({ data: { jobId: state.atual!.jobId }, headers: authHeaders }),
    refetchInterval: 2000,
  });

  if (!isAdmin) return null;
  if (!state.atual && state.fila.length === 0) return null;

  const total = job?.total_estimado ?? 0;
  const feitas = job?.questoes_processadas ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((feitas / total) * 100)) : 0;
  const indeterminado = !job || job.etapa === "ocr" || job.etapa === "analisando";
  const totalRestante = state.fila.length + (state.atual ? 1 : 0);

  return (
    <>
      <div className="fixed z-[90] right-4 bottom-24 md:bottom-4 max-w-[calc(100vw-2rem)] w-72 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <button
          onClick={() => state.atual && setOpen(true)}
          className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
          disabled={!state.atual}
        >
          <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 grid place-items-center">
            {state.atual ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <ListOrdered className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Fila de simulados · {totalRestante} restante{totalRestante === 1 ? "" : "s"}
            </p>
            <p className="text-sm font-medium truncate">
              {state.atual
                ? `Gerando prova ${state.atual.provaNumero}`
                : `${state.fila.length} aguardando…`}
            </p>
            {state.atual && (
              <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                {indeterminado ? (
                  <div className="h-full w-1/3 bg-primary animate-[shimmer_1.5s_ease-in-out_infinite]" />
                ) : (
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
            )}
          </div>
          {state.atual && <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />}
        </button>
        <div className="flex border-t border-border">
          <button
            onClick={() => {
              if (confirm("Cancelar toda a fila? O job atual será interrompido.")) {
                simuladoQueue.cancelAll();
              }
            }}
            className="flex-1 p-2 text-xs text-muted-foreground hover:text-destructive inline-flex items-center justify-center gap-1"
          >
            <X className="h-3 w-3" /> Cancelar fila
          </button>
        </div>
      </div>

      {open && state.atual && (
        <SimuladoProgressModal
          jobId={state.atual.jobId}
          provaNumero={state.atual.provaNumero}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
