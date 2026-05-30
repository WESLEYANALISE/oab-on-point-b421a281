import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Eye, X, ListOrdered, CheckCircle2 } from "lucide-react";
import { useSimuladoQueue, simuladoQueue } from "@/lib/simulado-queue";
import { useAuth } from "@/hooks/use-auth";
import { getJobStatus } from "@/lib/simulados-admin.functions";
import { Button } from "@/components/ui/button";
import { SimuladoProgressModal } from "./SimuladoProgressModal";
import { mapEtapa } from "@/lib/simulado-etapas";

/**
 * Sticky top bar shown on /admin/simulados while the queue is active.
 * Replaces the floating bottom-right indicator on this route.
 */
export function SimuladoQueueTopBar() {
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

  if (!state.atual && state.fila.length === 0) return null;

  const total = job?.total_estimado ?? 0;
  const feitas = job?.questoes_processadas ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((feitas / total) * 100)) : 0;
  const totalRestante = state.fila.length + (state.atual ? 1 : 0);
  const etapaInfo = job ? mapEtapa(job.etapa) : null;
  const indeterminado = !job || job.etapa === "ocr" || job.etapa === "analisando";
  const isPronto = job?.etapa === "pronto";

  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 md:-mx-8 mb-5 px-4 md:px-8 py-3 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="shrink-0 h-9 w-9 rounded-full bg-primary/10 grid place-items-center">
            {state.atual && !isPronto ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : isPronto ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <ListOrdered className="h-4 w-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <span>
                Fila · {totalRestante} restante{totalRestante === 1 ? "" : "s"}
              </span>
              {etapaInfo && state.atual && (
                <>
                  <span>·</span>
                  <span>Etapa {etapaInfo.numero}/2 — {etapaInfo.label}</span>
                </>
              )}
            </div>
            <p className="text-sm font-medium truncate">
              {state.atual ? (
                <>
                  Prova {state.atual.provaNumero}
                  {etapaInfo && (
                    <span className="text-muted-foreground font-normal">
                      {" "}· {etapaInfo.sub}
                      {!indeterminado && total > 0 && (
                        <> · {feitas}/{total} ({pct}%)</>
                      )}
                    </span>
                  )}
                </>
              ) : (
                `${state.fila.length} aguardando…`
              )}
            </p>
            <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
              {state.atual ? (
                indeterminado ? (
                  <div className="h-full w-1/3 bg-primary animate-[shimmer_1.5s_ease-in-out_infinite]" />
                ) : (
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                )
              ) : null}
            </div>
            {state.fila.length > 0 && (
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Próximas: {state.fila.slice(0, 6).join(", ")}
                {state.fila.length > 6 ? "…" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {state.atual && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
                className="hidden sm:inline-flex"
              >
                <Eye className="h-4 w-4 mr-1" /> Detalhes
              </Button>
            )}
            {state.atual && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(true)}
                aria-label="Ver detalhes"
                className="sm:hidden"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (confirm("Cancelar toda a fila? O job atual será interrompido.")) {
                  simuladoQueue.cancelAll();
                }
              }}
              aria-label="Cancelar fila"
            >
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
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
