import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ListPlus,
  Eye,
  ShieldAlert,
  RefreshCw,
  Loader2,
  Circle,
} from "lucide-react";
import {
  listProvasComStatus,
  excluirSimulado,
  auditarEReextrair,
  reextrairFalhas,
} from "@/lib/simulados-admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { simuladoQueue, useSimuladoQueue } from "@/lib/simulado-queue";
import { SimuladoProgressModal } from "@/components/admin/SimuladoProgressModal";
import { SimuladoQueueTopBar } from "@/components/admin/SimuladoQueueTopBar";
import { type StageStatus } from "@/lib/simulado-etapas";

export const Route = createFileRoute("/_app/admin/simulados")({
  component: AdminSimulados,
});

function AdminSimulados() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const listFn = useServerFn(listProvasComStatus);
  const delFn = useServerFn(excluirSimulado);
  const auditFn = useServerFn(auditarEReextrair);
  const reextFn = useServerFn(reextrairFalhas);
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  const { data } = useQuery({
    queryKey: ["admin-provas"],
    enabled: !!authHeaders,
    queryFn: () => listFn({ headers: authHeaders }),
    staleTime: 60_000,
    refetchInterval: 5_000,
    placeholderData: (prev) => prev,
  });

  const queue = useSimuladoQueue();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewerJob, setViewerJob] = useState<{ jobId: string; provaNumero: number } | null>(null);

  const provas = data ?? [];

  const elegiveis = useMemo(
    () =>
      provas.filter(
        (p) =>
          !!p.prova_1fase_url &&
          !!p.gabarito_1fase_url &&
          p.simulado?.status !== "gerando" &&
          p.simulado?.status !== "pronto" &&
          !queue.fila.includes(p.numero) &&
          queue.atual?.provaNumero !== p.numero,
      ),
    [provas, queue.fila, queue.atual],
  );

  const toggle = (n: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  const adicionarFila = (numeros: number[]) => {
    if (!numeros.length) return;
    simuladoQueue.enqueue(numeros);
    setSelected(new Set());
    toast.success(
      numeros.length === 1
        ? `Prova ${numeros[0]} adicionada à fila`
        : `${numeros.length} provas adicionadas à fila`,
    );
  };

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

  const auditar = useMutation({
    mutationFn: (provaNumero: number) => {
      if (!authHeaders) throw new Error("Sessão expirada. Entre novamente.");
      return auditFn({ data: { provaNumero }, headers: authHeaders });
    },
    onMutate: (n) => {
      toast.loading(`Auditando prova ${n}… (pode levar 1-2 min)`, { id: `audit-${n}` });
    },
    onSuccess: (r, n) => {
      toast.success(
        `Prova ${n}: ${r.inventadas} inventadas · ${r.reextraidas} reextraídas · ${r.restantes} sem extração`,
        { id: `audit-${n}`, duration: 6000 },
      );
      qc.invalidateQueries({ queryKey: ["admin-provas"] });
    },
    onError: (e, n) =>
      toast.error(e instanceof Error ? e.message : "Falhou", { id: `audit-${n}` }),
  });

  const reextrair = useMutation({
    mutationFn: (provaNumero: number) => {
      if (!authHeaders) throw new Error("Sessão expirada. Entre novamente.");
      return reextFn({ data: { provaNumero }, headers: authHeaders });
    },
    onMutate: (n) => {
      toast.loading(`Reextraindo falhas da prova ${n}…`, { id: `reext-${n}` });
    },
    onSuccess: (r, n) => {
      toast.success(
        `Prova ${n}: ${r.reextraidas}/${r.tentadas} reextraídas · ${r.restantes} ainda sem extração`,
        { id: `reext-${n}`, duration: 6000 },
      );
      qc.invalidateQueries({ queryKey: ["admin-provas"] });
    },
    onError: (e, n) =>
      toast.error(e instanceof Error ? e.message : "Falhou", { id: `reext-${n}` }),
  });

  const filaPositionOf = (n: number): number | null => {
    if (queue.atual?.provaNumero === n) return 0;
    const idx = queue.fila.indexOf(n);
    return idx >= 0 ? idx + 1 : null;
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <SimuladoQueueTopBar />

      <header className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="font-display text-3xl">Gerar simulados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fluxo em <strong>2 etapas</strong>: extração via OCR (Mistral) + geração via Gemini. A
          fila roda automática em segundo plano.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(new Set(elegiveis.map((p) => p.numero)))}
          disabled={!elegiveis.length}
        >
          Selecionar todas pendentes ({elegiveis.length})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelected(new Set())}
          disabled={!selected.size}
        >
          Limpar seleção
        </Button>
        <Button
          size="sm"
          onClick={() => adicionarFila([...selected].sort((a, b) => a - b))}
          disabled={!selected.size}
        >
          <ListPlus className="h-4 w-4 mr-1" />
          Gerar {selected.size || ""} em fila
        </Button>
      </div>

      <div className="space-y-3">
        {provas.map((p) => {
          const status = p.simulado?.status;
          const filaPos = filaPositionOf(p.numero);
          const naFila = filaPos !== null;
          const sendo = queue.atual?.provaNumero === p.numero;
          const podeSelecionar =
            !!p.prova_1fase_url &&
            !!p.gabarito_1fase_url &&
            status !== "gerando" &&
            status !== "pronto" &&
            !naFila;
          const isSelected = selected.has(p.numero);
          const pdfAusente = !p.prova_1fase_url || !p.gabarito_1fase_url;
          const mostrarEtapas = sendo || status === "pronto" || status === "gerando";

          // Etapa visual: para pronto mostramos ambos concluídos; para sendo usamos
          // o etapa atual no driver (estimado pelo backend via simulado.status apenas).
          // Sem polling per-card; o estado fino está no topo + no modal.
          const stage1: StageStatus =
            status === "pronto"
              ? "concluido"
              : sendo
                ? "ativo"
                : status === "erro"
                  ? "erro"
                  : "pendente";
          const stage2: StageStatus =
            status === "pronto"
              ? "concluido"
              : sendo
                ? "ativo"
                : "pendente";

          return (
            <article
              key={p.numero}
              className={`rounded-2xl border bg-card overflow-hidden transition-colors ${
                sendo ? "border-primary/40 shadow-sm" : "border-border"
              }`}
            >
              {/* Header */}
              <div className="p-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(p.numero)}
                  disabled={!podeSelecionar}
                  className="h-4 w-4 mt-1 accent-primary disabled:opacity-30 shrink-0"
                  aria-label={`Selecionar ${p.titulo}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base leading-snug break-words">{p.titulo}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
                    <StatusBadge status={status} />
                    {sendo && (
                      <span className="inline-flex items-center gap-1 text-primary">
                        · Gerando agora
                      </span>
                    )}
                    {naFila && !sendo && (
                      <span className="text-muted-foreground">· Na fila (#{filaPos})</span>
                    )}
                    {p.simulado?.total_questoes ? (
                      <span className="text-muted-foreground">
                        · {p.simulado.total_questoes} questões
                      </span>
                    ) : null}
                    {pdfAusente && (
                      <span className="text-amber-600">· PDF ausente</span>
                    )}
                  </div>
                  {p.simulado?.status === "erro" && p.simulado.erro_msg && (
                    <p className="text-xs text-destructive mt-1.5 break-words">
                      {p.simulado.erro_msg}
                    </p>
                  )}
                </div>
              </div>

              {/* Etapas */}
              {mostrarEtapas && (
                <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <StageMini
                    numero={1}
                    titulo="Extração"
                    status={stage1}
                    descricao={
                      stage1 === "concluido"
                        ? `${p.simulado?.total_questoes ?? "—"} questões extraídas do PDF`
                        : stage1 === "ativo"
                          ? "OCR + análise do gabarito…"
                          : stage1 === "erro"
                            ? "Falhou"
                            : "—"
                    }
                  />
                  <StageMini
                    numero={2}
                    titulo="Geração"
                    status={stage2}
                    descricao={
                      stage2 === "concluido"
                        ? "Simulado pronto"
                        : stage2 === "ativo"
                          ? "Gerando questões com Gemini…"
                          : "Aguardando Etapa 1"
                    }
                  />
                </div>
              )}

              {/* Actions */}
              <div className="border-t border-dashed border-border px-3 py-2 flex flex-wrap items-center justify-end gap-1.5">
                {sendo && queue.atual && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setViewerJob({ jobId: queue.atual!.jobId, provaNumero: p.numero })
                    }
                  >
                    <Eye className="h-4 w-4 mr-1" /> Ver progresso
                  </Button>
                )}
                {status === "pronto" && !naFila && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={auditar.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            `Auditar a prova ${p.numero}? Vai detectar questões inventadas e re-extrair do PDF.`,
                          )
                        )
                          auditar.mutate(p.numero);
                      }}
                      title="Detecta questões alucinadas e reextrai do OCR"
                    >
                      <ShieldAlert className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Auditar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reextrair.isPending}
                      onClick={() => {
                        if (confirm(`Reextrair questões que falharam na prova ${p.numero}?`))
                          reextrair.mutate(p.numero);
                      }}
                      title="Tenta reextrair questões marcadas como falhou_extracao"
                    >
                      <RefreshCw className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Reextrair falhas</span>
                    </Button>
                  </>
                )}
                {p.simulado && status !== "gerando" && !naFila && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Excluir este simulado?")) excluir.mutate(p.simulado!.id);
                    }}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
                {!naFila && (
                  <Button
                    size="sm"
                    variant={status === "pronto" ? "outline" : "default"}
                    disabled={pdfAusente || (status === "gerando")}
                    onClick={() => adicionarFila([p.numero])}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    {status === "pronto" ? "Regerar" : "Gerar"}
                  </Button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {viewerJob && (
        <SimuladoProgressModal
          jobId={viewerJob.jobId}
          provaNumero={viewerJob.provaNumero}
          onClose={() => setViewerJob(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (status === "pronto")
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-600 font-medium">
        <CheckCircle2 className="h-3 w-3" /> Pronto
      </span>
    );
  if (status === "gerando")
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-medium">
        <Clock className="h-3 w-3" /> Gerando
      </span>
    );
  if (status === "erro")
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive font-medium">
        <AlertCircle className="h-3 w-3" /> Erro
      </span>
    );
  return <span className="text-muted-foreground">Sem simulado</span>;
}

function StageMini({
  numero,
  titulo,
  status,
  descricao,
}: {
  numero: 1 | 2;
  titulo: string;
  status: StageStatus;
  descricao: string;
}) {
  const icon =
    status === "concluido" ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : status === "ativo" ? (
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
    ) : status === "erro" ? (
      <AlertCircle className="h-4 w-4 text-destructive" />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground/40" />
    );
  const border =
    status === "ativo"
      ? "border-primary/40 bg-primary/5"
      : status === "concluido"
        ? "border-green-500/30 bg-green-500/5"
        : status === "erro"
          ? "border-destructive/40 bg-destructive/5"
          : "border-border bg-muted/20";
  return (
    <div className={`flex gap-2 p-2.5 rounded-lg border ${border}`}>
      <div className="shrink-0 pt-0.5">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Etapa {numero}
        </p>
        <p className="text-xs font-medium">{titulo}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{descricao}</p>
      </div>
    </div>
  );
}
