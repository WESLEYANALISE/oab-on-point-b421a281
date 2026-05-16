import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Sparkles, Trash2, CheckCircle2, AlertCircle, Clock, X } from "lucide-react";
import {
  listProvasComStatus,
  iniciarJob,
  executarOcr,
  analisarProva,
  processarBatch,
  validarFinal,
  getJobStatus,
  cancelarJob,
  excluirSimulado,
} from "@/lib/simulados-admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/admin/simulados")({
  component: AdminSimulados,
});

function AdminSimulados() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const listFn = useServerFn(listProvasComStatus);
  const iniciarFn = useServerFn(iniciarJob);
  const delFn = useServerFn(excluirSimulado);
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  const { data } = useQuery({
    queryKey: ["admin-provas"],
    enabled: !!authHeaders,
    queryFn: () => listFn({ headers: authHeaders }),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [iniciandoNum, setIniciandoNum] = useState<number | null>(null);

  const iniciar = useMutation({
    mutationFn: (provaNumero: number) => {
      if (!authHeaders) throw new Error("Sessão expirada. Entre novamente.");
      return iniciarFn({ data: { provaNumero }, headers: authHeaders });
    },
    onMutate: (n) => setIniciandoNum(n),
    onSuccess: (r) => setActiveJobId(r.jobId),
    onError: (e) => toast.error(`Falha ao iniciar: ${e instanceof Error ? e.message : "erro"}`),
    onSettled: () => setIniciandoNum(null),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => {
      if (!authHeaders) throw new Error("Sessão expirada. Entre novamente.");
      return delFn({ data: { id }, headers: authHeaders });
    },
    onSuccess: () => {
      toast.success("Simulado excluído");
      qc.invalidateQueries({ queryKey: ["admin-provas"] });
    },
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="font-display text-3xl">Gerar simulados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          OCR via Mistral + organização via Gemini, com logs ao vivo.
        </p>
      </header>

      {(

        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {(data ?? []).map((p) => {
            const status = p.simulado?.status;
            const podeGerar = !!p.prova_1fase_url && !!p.gabarito_1fase_url && status !== "gerando";
            return (
              <li key={p.numero} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base truncate">{p.titulo}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    <StatusBadge status={status} />
                    {p.simulado?.total_questoes ? (
                      <span className="text-muted-foreground">
                        · {p.simulado.total_questoes} questões
                      </span>
                    ) : null}
                    {!p.prova_1fase_url || !p.gabarito_1fase_url ? (
                      <span className="text-muted-foreground">· PDF ausente</span>
                    ) : null}
                  </div>
                  {p.simulado?.status === "erro" && p.simulado.erro_msg && (
                    <p className="text-xs text-destructive mt-1 truncate">{p.simulado.erro_msg}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.simulado && status !== "gerando" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Excluir este simulado?")) excluir.mutate(p.simulado!.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={!podeGerar || iniciandoNum === p.numero}
                    onClick={() => iniciar.mutate(p.numero)}
                  >
                    {iniciandoNum === p.numero ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Iniciando…
                      </>
                    ) : status === "pronto" ? (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" /> Regerar
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" /> Gerar
                      </>
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activeJobId && (
        <ProgressModal
          jobId={activeJobId}
          authHeaders={authHeaders}
          onClose={() => {
            setActiveJobId(null);
            qc.invalidateQueries({ queryKey: ["admin-provas"] });
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (status === "pronto")
    return (
      <span className="inline-flex items-center gap-1 text-green-600">
        <CheckCircle2 className="h-3 w-3" /> Pronto
      </span>
    );
  if (status === "gerando")
    return (
      <span className="inline-flex items-center gap-1 text-primary">
        <Clock className="h-3 w-3" /> Gerando
      </span>
    );
  if (status === "erro")
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <AlertCircle className="h-3 w-3" /> Erro
      </span>
    );
  return <span className="text-muted-foreground">Sem simulado</span>;
}

// ============ Progress Modal (OCR + Geração com logs ao vivo) ============
function ProgressModal({
  jobId,
  authHeaders,
  onClose,
}: {
  jobId: string;
  authHeaders: Record<string, string> | undefined;
  onClose: () => void;
}) {
  const statusFn = useServerFn(getJobStatus);
  const ocrFn = useServerFn(executarOcr);
  const analisarFn = useServerFn(analisarProva);
  const batchFn = useServerFn(processarBatch);
  const validarFn = useServerFn(validarFinal);
  const cancelFn = useServerFn(cancelarJob);

  const { data: job } = useQuery({
    queryKey: ["sim-job", jobId],
    enabled: !!authHeaders,
    queryFn: () => statusFn({ data: { jobId }, headers: authHeaders }),
    refetchInterval: (q) => {
      const j = q.state.data;
      if (!j) return 1000;
      const ativo = j.etapa === "ocr" || j.etapa === "analisando" || j.etapa === "gerando" || j.etapa === "validando";
      return ativo ? 1500 : false;
    },
  });

  // Dispara OCR uma vez
  const ocrStartedRef = useRef(false);
  useEffect(() => {
    if (!authHeaders || ocrStartedRef.current) return;
    if (job?.etapa !== "ocr") return;
    ocrStartedRef.current = true;
    ocrFn({ data: { jobId }, headers: authHeaders }).catch((e) => {
      toast.error(`OCR falhou: ${e instanceof Error ? e.message : "erro"}`);
    });
  }, [jobId, authHeaders, job?.etapa, ocrFn]);

  // Dispara análise uma vez
  const analisarStartedRef = useRef(false);
  useEffect(() => {
    if (!authHeaders || analisarStartedRef.current) return;
    if (job?.etapa !== "analisando") return;
    analisarStartedRef.current = true;
    analisarFn({ data: { jobId }, headers: authHeaders }).catch((e) => {
      toast.error(`Análise falhou: ${e instanceof Error ? e.message : "erro"}`);
    });
  }, [jobId, authHeaders, job?.etapa, analisarFn]);

  // Loop client-side de batches
  const batchingRef = useRef(false);
  useEffect(() => {
    if (!job || !authHeaders) return;
    if (job.etapa !== "gerando") return;
    if (batchingRef.current) return;
    batchingRef.current = true;

    (async () => {
      let idx = job.batch_atual ?? 0;
      try {
        while (idx < (job.batches_total ?? 0)) {
          const r = await batchFn({ data: { jobId, batchIndex: idx }, headers: authHeaders });
          if (r.proximo === null) break;
          idx = r.proximo;
        }
      } catch (e) {
        toast.error(`Geração interrompida: ${e instanceof Error ? e.message : "erro"}`);
      } finally {
        batchingRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, authHeaders, job?.etapa]);

  // Dispara validação final
  const validarStartedRef = useRef(false);
  useEffect(() => {
    if (!authHeaders || validarStartedRef.current) return;
    if (job?.etapa !== "validando") return;
    validarStartedRef.current = true;
    validarFn({ data: { jobId }, headers: authHeaders }).catch((e) => {
      toast.error(`Validação falhou: ${e instanceof Error ? e.message : "erro"}`);
    });
  }, [jobId, authHeaders, job?.etapa, validarFn]);

  const cancelar = useMutation({
    mutationFn: () => {
      if (!authHeaders) throw new Error("Sessão expirada");
      return cancelFn({ data: { jobId }, headers: authHeaders });
    },
    onSettled: () => onClose(),
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
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{etapaLabel}</p>
            <h2 className="font-display text-xl mt-1">{headerTitle}</h2>
          </div>
          {(concluido || erro) && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
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
            <Button variant="outline" className="flex-1" onClick={() => cancelar.mutate()} disabled={cancelar.isPending}>
              Cancelar
            </Button>
          )}
          {(concluido || erro) && (
            <Button className="flex-1" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
