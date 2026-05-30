import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, CheckCircle2, Loader2, AlertCircle, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getJobStatus, cancelarJob } from "@/lib/simulados-admin.functions";
import { useAuth } from "@/hooks/use-auth";
import { simuladoQueue } from "@/lib/simulado-queue";
import { getStageStatus, mapEtapa, type StageStatus } from "@/lib/simulado-etapas";

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

  const [logsOpen, setLogsOpen] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logsOpen) logsRef.current?.scrollTo({ top: logsRef.current.scrollHeight });
  }, [job?.logs, logsOpen]);

  const total = job?.total_estimado ?? 0;
  const feitas = job?.questoes_processadas ?? 0;
  const pct = total > 0 ? Math.min(100, Math.round((feitas / total) * 100)) : 0;
  const inicio = job?.iniciado_em ? new Date(job.iniciado_em).getTime() : Date.now();
  const decorrido = (Date.now() - inicio) / 1000;
  const eta = feitas > 0 && total > feitas ? Math.round((decorrido / feitas) * (total - feitas)) : null;
  const concluido = job?.etapa === "pronto";
  const erro = job?.etapa === "erro";

  const stage1 = getStageStatus(1, job?.etapa);
  const stage2 = getStageStatus(2, job?.etapa);
  const info = mapEtapa(job?.etapa);

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {provaNumero ? `Prova ${provaNumero}` : "Geração em andamento"}
            </p>
            <h2 className="font-display text-xl mt-1">
              {concluido
                ? "Simulado pronto"
                : erro
                  ? "Erro na geração"
                  : `Etapa ${info.numero}/2 — ${info.label}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="space-y-3 mb-5">
          <StageRow
            status={stage1}
            numero={1}
            titulo="Extração"
            descricao={
              stage1 === "concluido"
                ? total > 0
                  ? `${total} questões detectadas no gabarito`
                  : "Concluída"
                : stage1 === "ativo"
                  ? info.sub
                  : stage1 === "erro"
                    ? job?.erro_msg ?? "Falhou ao ler o PDF"
                    : "Aguardando OCR do PDF…"
            }
            indeterminate={stage1 === "ativo"}
          />
          <StageRow
            status={stage2}
            numero={2}
            titulo="Geração"
            descricao={
              stage2 === "concluido"
                ? `${feitas || total} questões geradas`
                : stage2 === "ativo"
                  ? info.sub
                  : stage2 === "erro"
                    ? job?.erro_msg ?? "Falhou ao gerar questões"
                    : "Aguardando fim da Etapa 1…"
            }
            progress={
              stage2 === "ativo" && total > 0
                ? { feitas, total, pct, eta }
                : null
            }
          />
        </div>

        {/* Logs collapsible */}
        <button
          onClick={() => setLogsOpen((o) => !o)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <span>Logs detalhados ({(Array.isArray(job?.logs) ? job!.logs.length : 0)})</span>
          {logsOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        {logsOpen && (
          <div
            ref={logsRef}
            className="h-48 overflow-y-auto bg-background/50 border border-border rounded-lg p-3 text-xs font-mono space-y-1 mb-4"
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
        )}

        <div className="flex gap-2">
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

function StageRow({
  status,
  numero,
  titulo,
  descricao,
  indeterminate,
  progress,
}: {
  status: StageStatus;
  numero: 1 | 2;
  titulo: string;
  descricao: string;
  indeterminate?: boolean;
  progress?: { feitas: number; total: number; pct: number; eta: number | null } | null;
}) {
  const icon =
    status === "concluido" ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : status === "ativo" ? (
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
    ) : status === "erro" ? (
      <AlertCircle className="h-5 w-5 text-destructive" />
    ) : (
      <Circle className="h-5 w-5 text-muted-foreground/50" />
    );

  const borderClass =
    status === "ativo"
      ? "border-primary/40 bg-primary/5"
      : status === "concluido"
        ? "border-green-500/30 bg-green-500/5"
        : status === "erro"
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-muted/20";

  return (
    <div className={`flex gap-3 p-3 rounded-xl border ${borderClass}`}>
      <div className="shrink-0 pt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Etapa {numero}
        </p>
        <p className="font-display text-base leading-tight">{titulo}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
        {progress && (
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              {indeterminate && progress.total === 0 ? (
                <div className="h-full w-1/3 bg-primary animate-[shimmer_1.5s_ease-in-out_infinite]" />
              ) : (
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progress.pct}%` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>
                {progress.feitas}/{progress.total} ({progress.pct}%)
              </span>
              {progress.eta !== null && <span>~{progress.eta}s restantes</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
