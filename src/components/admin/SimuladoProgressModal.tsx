import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getJobStatus, cancelarJob } from "@/lib/simulados-admin.functions";
import { useAuth } from "@/hooks/use-auth";
import { simuladoQueue } from "@/lib/simulado-queue";

/**
 * Passive viewer of a job's progress + logs.
 * The actual step orchestration (OCR/analisar/batches/validar) lives in
 * SimuladoQueueDriver — this modal only polls and renders.
 */
export function SimuladoProgressModal({
  jobId,
  provaNumero,
  onClose,
}: {
  jobId: string;
  provaNumero?: number;
  onClose: () => void;
}) {
  const { session } = useAuth();
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;
  const statusFn = useServerFn(getJobStatus);
  const cancelFn = useServerFn(cancelarJob);

  const { data: job } = useQuery({
    queryKey: ["sim-job", jobId],
    enabled: !!authHeaders,
    queryFn: () => statusFn({ data: { jobId }, headers: authHeaders }),
    refetchInterval: (q) => {
      const j = q.state.data;
      if (!j) return 1000;
      const ativo =
        j.etapa === "ocr" ||
        j.etapa === "analisando" ||
        j.etapa === "gerando" ||
        j.etapa === "validando";
      return ativo ? 1500 : false;
    },
  });

  const cancelar = useMutation({
    mutationFn: () => {
      if (!authHeaders) throw new Error("Sessão expirada");
      return cancelFn({ data: { jobId }, headers: authHeaders });
    },
    onSettled: () => {
      simuladoQueue.finishAtual("cancelado");
      onClose();
    },
  });

  const logsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight });
  }, [job?.logs]);

  const total = job?.total_estimado ?? 0;
  const feitas = job?.questoes_processadas ?? 0;
  const indeterminado = !job || job.etapa === "ocr" || job.etapa === "analisando";
  const pct = total > 0 ? Math.min(100, Math.round((feitas / total) * 100)) : 0;
  const inicio = job?.iniciado_em ? new Date(job.iniciado_em).getTime() : Date.now();
  const decorrido = (Date.now() - inicio) / 1000;
  const eta = feitas > 0 && total > feitas ? Math.round((decorrido / feitas) * (total - feitas)) : null;
  const concluido = job?.etapa === "pronto";
  const erro = job?.etapa === "erro";

  const etapaLabel = !job
    ? "Conectando…"
    : job.etapa === "ocr"
      ? "Lendo PDFs (OCR Mistral)"
      : job.etapa === "analisando"
        ? "Analisando prova e gabarito"
        : job.etapa === "gerando"
          ? "Extraindo questões (Gemini)"
          : job.etapa === "validando"
            ? "Validando e refazendo faltantes"
            : job.etapa === "pronto"
              ? "Concluído"
              : "Erro";

  const headerTitle = indeterminado
    ? job?.etapa === "analisando"
      ? "Contando questões…"
      : "Lendo PDFs…"
    : `${feitas} / ${total} questões`;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {provaNumero ? `Prova ${provaNumero} · ` : ""}
              {etapaLabel}
            </p>
            <h2 className="font-display text-xl mt-1">{headerTitle}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden mb-2 relative">
          {indeterminado && !erro ? (
            <div className="absolute inset-y-0 left-0 w-1/3 bg-primary animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full" />
          ) : (
            <div
              className={`h-full transition-all duration-500 ${erro ? "bg-destructive" : concluido ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mb-4">
          <span>
            {job?.etapa === "ocr"
              ? "OCR pode levar até 60s…"
              : job?.etapa === "analisando"
                ? "Detectando total de questões e gabarito oficial…"
                : job?.etapa === "validando"
                  ? `Revalidando… ${feitas}/${total} questões`
                  : `Lote ${job?.batch_atual ?? 0} / ${job?.batches_total ?? 0} · ${pct}%`}
          </span>
          {!indeterminado && eta !== null && !concluido && !erro && job?.etapa === "gerando" && (
            <span>~{eta}s restantes</span>
          )}
        </div>

        <div
          ref={logsRef}
          className="h-56 overflow-y-auto bg-background/50 border border-border rounded-lg p-3 text-xs font-mono space-y-1"
        >
          {((job?.logs ?? []) as Array<{ ts: string; nivel: string; msg: string }>).map((l, i) => (
            <div
              key={i}
              className={
                l.nivel === "erro"
                  ? "text-destructive"
                  : l.nivel === "ok"
                    ? "text-green-500"
                    : "text-muted-foreground"
              }
            >
              <span className="opacity-60">{new Date(l.ts).toLocaleTimeString()}</span> {l.msg}
            </div>
          ))}
          {!job && <div className="text-muted-foreground">Conectando ao job…</div>}
        </div>

        <div className="flex gap-2 mt-4">
          {!concluido && !erro && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => cancelar.mutate()}
              disabled={cancelar.isPending}
            >
              Cancelar geração
            </Button>
          )}
          <Button className="flex-1" onClick={onClose}>
            {concluido || erro ? "Fechar" : "Minimizar"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
