import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Sparkles, Trash2, CheckCircle2, AlertCircle, Clock, ListPlus, Eye, ShieldAlert, RefreshCw } from "lucide-react";
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
      <header className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="font-display text-3xl">Gerar simulados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          OCR via Mistral + organização via Gemini. Gere em fila em segundo plano.
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
        {(queue.fila.length > 0 || queue.atual) && (
          <span className="text-xs text-muted-foreground ml-auto">
            Fila: {queue.fila.length + (queue.atual ? 1 : 0)} pendente
            {queue.fila.length + (queue.atual ? 1 : 0) === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
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
          const podeGerarSolo = podeSelecionar;
          const isSelected = selected.has(p.numero);
          return (
            <li key={p.numero} className="p-4 flex items-center gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(p.numero)}
                disabled={!podeSelecionar}
                className="h-4 w-4 accent-primary disabled:opacity-30 shrink-0"
                aria-label={`Selecionar ${p.titulo}`}
              />
              <div className="flex-1 min-w-0">
                <p className="font-display text-base truncate">{p.titulo}</p>
                <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
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
                  {!p.prova_1fase_url || !p.gabarito_1fase_url ? (
                    <span className="text-muted-foreground">· PDF ausente</span>
                  ) : null}
                </div>
                {p.simulado?.status === "erro" && p.simulado.erro_msg && (
                  <p className="text-xs text-destructive mt-1 truncate">{p.simulado.erro_msg}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {sendo && queue.atual && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setViewerJob({ jobId: queue.atual!.jobId, provaNumero: p.numero })
                    }
                    aria-label="Ver logs"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {p.simulado && status !== "gerando" && !naFila && (
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
                {status === "pronto" && !naFila && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={auditar.isPending}
                    onClick={() => {
                      if (confirm(`Auditar a prova ${p.numero}? Vai detectar questões inventadas e re-extrair do PDF.`))
                        auditar.mutate(p.numero);
                    }}
                    title="Detecta questões alucinadas e reextrai do OCR"
                  >
                    <ShieldAlert className="h-4 w-4 mr-1" />
                    Auditar
                  </Button>
                )}
                {status === "pronto" && !naFila && (
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
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reextrair falhas
                  </Button>
                )}
                {!naFila && (
                  <Button
                    size="sm"
                    variant={status === "pronto" ? "outline" : "default"}
                    disabled={!podeGerarSolo && status !== "pronto"}
                    onClick={() => adicionarFila([p.numero])}
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    {status === "pronto" ? "Regerar" : "Gerar"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

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
