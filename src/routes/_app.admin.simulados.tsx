import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, Trash2, CheckCircle2, AlertCircle, Clock, X } from "lucide-react";
import {
  listProvasComStatus,
  prepararSimulado,
  iniciarGeracao,
  processarBatch,
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

type Preview = Awaited<ReturnType<typeof prepararSimulado>>;

function AdminSimulados() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const listFn = useServerFn(listProvasComStatus);
  const prepararFn = useServerFn(prepararSimulado);
  const delFn = useServerFn(excluirSimulado);
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-provas"],
    enabled: !!authHeaders,
    queryFn: () => listFn({ headers: authHeaders }),
  });

  const [preparandoNum, setPreparandoNum] = useState<number | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const preparar = useMutation({
    mutationFn: (provaNumero: number) => {
      if (!authHeaders) throw new Error("Sessão expirada. Entre novamente.");
      return prepararFn({ data: { provaNumero }, headers: authHeaders });
    },
    onMutate: (n) => setPreparandoNum(n),
    onSuccess: (p) => setPreview(p),
    onError: (e) => toast.error(`Falha ao preparar: ${e instanceof Error ? e.message : "erro"}`),
    onSettled: () => setPreparandoNum(null),
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
          1) Prévia (OCR + contagem) → 2) Confirmar → 3) Geração em lotes com logs ao vivo.
        </p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando provas…
        </div>
      ) : (
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
                    disabled={!podeGerar || preparandoNum === p.numero}
                    onClick={() => preparar.mutate(p.numero)}
                  >
                    {preparandoNum === p.numero ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Lendo PDFs…
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

      {preview && !activeJobId && (
        <PreviewModal
          preview={preview}
          authHeaders={authHeaders}
          onCancel={() => setPreview(null)}
          onConfirm={(jobId) => setActiveJobId(jobId)}
        />
      )}

      {activeJobId && (
        <ProgressModal
          jobId={activeJobId}
          authHeaders={authHeaders}
          onClose={() => {
            setActiveJobId(null);
            setPreview(null);
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

// ============ Preview Modal ============
function PreviewModal({
  preview,
  authHeaders,
  onCancel,
  onConfirm,
}: {
  preview: Preview;
  authHeaders: Record<string, string> | undefined;
  onCancel: () => void;
  onConfirm: (jobId: string) => void;
}) {
  const iniciarFn = useServerFn(iniciarGeracao);
  const cancelFn = useServerFn(cancelarJob);

  const iniciar = useMutation({
    mutationFn: () => {
      if (!authHeaders) throw new Error("Sessão expirada");
      return iniciarFn({ data: { jobId: preview.jobId }, headers: authHeaders });
    },
    onSuccess: () => onConfirm(preview.jobId),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const cancelar = useMutation({
    mutationFn: () => {
      if (!authHeaders) throw new Error("Sessão expirada");
      return cancelFn({ data: { jobId: preview.jobId }, headers: authHeaders });
    },
    onSettled: () => onCancel(),
  });

  const tempoEstimado = Math.ceil(preview.totalEstimado / 20) * 20; // ~20s por lote
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Prévia da extração</p>
            <h2 className="font-display text-xl mt-1">{preview.titulo}</h2>
          </div>
          <button onClick={() => cancelar.mutate()} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Questões detectadas</dt>
            <dd className="font-semibold">{preview.totalEstimado}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Matérias identificadas</dt>
            <dd className="font-semibold">{preview.materiasDetectadas.length}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tempo estimado</dt>
            <dd className="font-semibold">~{tempoEstimado}s</dd>
          </div>
        </dl>

        {preview.materiasDetectadas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {preview.materiasDetectadas.map((m) => (
              <span key={m} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={() => cancelar.mutate()} disabled={cancelar.isPending}>
            Cancelar
          </Button>
          <Button className="flex-1" onClick={() => iniciar.mutate()} disabled={iniciar.isPending}>
            {iniciar.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Gerar agora
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ Progress Modal ============
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
  const batchFn = useServerFn(processarBatch);
  const cancelFn = useServerFn(cancelarJob);

  const { data: job } = useQuery({
    queryKey: ["sim-job", jobId],
    enabled: !!authHeaders,
    queryFn: () => statusFn({ data: { jobId }, headers: authHeaders }),
    refetchInterval: (q) => {
      const j = q.state.data;
      return j?.etapa === "gerando" ? 1500 : false;
    },
  });

  // Loop client-side de batches
  const runningRef = useRef(false);
  useEffect(() => {
    if (!job || !authHeaders) return;
    if (job.etapa !== "gerando") return;
    if (runningRef.current) return;
    runningRef.current = true;

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
        runningRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, authHeaders, job?.etapa]);

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
  const pct = total > 0 ? Math.min(100, Math.round((feitas / total) * 100)) : 0;
  const inicio = job?.iniciado_em ? new Date(job.iniciado_em).getTime() : Date.now();
  const decorrido = (Date.now() - inicio) / 1000;
  const eta = feitas > 0 && total > feitas ? Math.round((decorrido / feitas) * (total - feitas)) : null;
  const concluido = job?.etapa === "pronto";
  const erro = job?.etapa === "erro";

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {concluido ? "Concluído" : erro ? "Erro" : "Gerando"}
            </p>
            <h2 className="font-display text-xl mt-1">
              {feitas} / {total} questões
            </h2>
          </div>
          {(concluido || erro) && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-500 ${erro ? "bg-destructive" : concluido ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mb-4">
          <span>
            Lote {job?.batch_atual ?? 0} / {job?.batches_total ?? 0} · {pct}%
          </span>
          {eta !== null && !concluido && !erro && <span>~{eta}s restantes</span>}
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
          {!job && <div className="text-muted-foreground">Conectando…</div>}
        </div>

        <div className="flex gap-2 mt-4">
          {!concluido && !erro && (
            <Button variant="outline" className="flex-1" onClick={() => cancelar.mutate()} disabled={cancelar.isPending}>
              Cancelar geração
            </Button>
          )}
          {(concluido || erro) && (
            <Button className="flex-1" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
