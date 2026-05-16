import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Sparkles, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { listProvasComStatus, gerarSimulado, excluirSimulado } from "@/lib/simulados-admin.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/admin/simulados")({
  component: AdminSimulados,
});

function AdminSimulados() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const listFn = useServerFn(listProvasComStatus);
  const gerarFn = useServerFn(gerarSimulado);
  const delFn = useServerFn(excluirSimulado);
  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-provas"],
    enabled: !!authHeaders,
    queryFn: () => listFn({ headers: authHeaders }),
    refetchInterval: (q) => {
      const list = q.state.data as Awaited<ReturnType<typeof listFn>> | undefined;
      const algum = list?.some((p) => p.simulado?.status === "gerando");
      return algum ? 4000 : false;
    },
  });

  const [gerandoNum, setGerandoNum] = useState<number | null>(null);

  const gerar = useMutation({
    mutationFn: (provaNumero: number) => {
      if (!authHeaders) throw new Error("Sessão expirada. Entre novamente.");
      return gerarFn({ data: { provaNumero }, headers: authHeaders });
    },
    onMutate: (n) => setGerandoNum(n),
    onSuccess: () => {
      toast.success("Simulado gerado com sucesso!");
      qc.invalidateQueries({ queryKey: ["admin-provas"] });
      qc.invalidateQueries({ queryKey: ["simulados-list"] });
    },
    onError: (e) => toast.error(`Falha: ${e instanceof Error ? e.message : "erro"}`),
    onSettled: () => setGerandoNum(null),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => {
      if (!authHeaders) throw new Error("Sessão expirada. Entre novamente.");
      return delFn({ data: { id }, headers: authHeaders });
    },
    onSuccess: () => {
      toast.success("Simulado excluído");
      qc.invalidateQueries({ queryKey: ["admin-provas"] });
      qc.invalidateQueries({ queryKey: ["simulados-list"] });
    },
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="font-display text-3xl">Gerar simulados</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cada geração consome a API do Mistral (OCR + parsing). Pode levar 30–90 segundos.
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
                      <span className="text-muted-foreground">· {p.simulado.total_questoes} questões</span>
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
                    disabled={!podeGerar || gerandoNum === p.numero}
                    onClick={() => gerar.mutate(p.numero)}
                  >
                    {gerandoNum === p.numero || status === "gerando" ? (
                      <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Gerando…</>
                    ) : status === "pronto" ? (
                      <><Sparkles className="h-4 w-4 mr-1" /> Regenerar</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-1" /> Gerar</>
                    )}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: string | null }) {
  if (status === "pronto")
    return <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> Pronto</span>;
  if (status === "gerando")
    return <span className="inline-flex items-center gap-1 text-primary"><Clock className="h-3 w-3" /> Gerando</span>;
  if (status === "erro")
    return <span className="inline-flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> Erro</span>;
  return <span className="text-muted-foreground">Sem simulado</span>;
}
