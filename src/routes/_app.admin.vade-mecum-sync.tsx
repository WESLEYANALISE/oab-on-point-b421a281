import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Loader2, RefreshCw, CheckCircle2, AlertTriangle, Ban, Sparkles } from "lucide-react";
import { listarRelatoriosCF, runCFSync } from "@/lib/cf-sync.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/vade-mecum-sync")({
  head: () => ({ meta: [{ title: "Sync Vade Mecum — Admin" }] }),
  component: VadeMecumSyncPage,
});

type Relatorio = Awaited<ReturnType<typeof listarRelatoriosCF>>["relatorios"][number];

function VadeMecumSyncPage() {
  const qc = useQueryClient();
  const listar = useServerFn(listarRelatoriosCF);
  const rodar = useServerFn(runCFSync);
  const [aberto, setAberto] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["cf-sync-relatorios"],
    queryFn: () => listar(),
  });

  const mut = useMutation({
    mutationFn: (useBrowserless: boolean) => rodar({ data: { useBrowserless } }),
    onSuccess: (r) => {
      const total = r.novos.length + r.alterados.length + r.revogados.length;
      toast.success(total === 0 ? "Nada novo no Planalto." : `${total} mudanças detectadas.`);
      qc.invalidateQueries({ queryKey: ["cf-sync-relatorios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="h-4 w-4" /> Admin
      </Link>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Vade Mecum</p>
          <h1 className="font-display text-3xl md:text-4xl">Sync Constituição Federal</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compara o banco com o Planalto pelos marcadores de alteração entre parênteses.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => mut.mutate(false)}
            disabled={mut.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50 text-sm"
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Rodar agora
          </button>
          <button
            onClick={() => mut.mutate(true)}
            disabled={mut.isPending}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-accent text-xs"
            title="Usa Browserless (Chrome headless) — útil para fontes com JS"
          >
            <Sparkles className="h-3.5 w-3.5" /> Via Browserless
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando relatórios…
        </div>
      ) : (data?.relatorios.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum relatório ainda. Rode a primeira sincronização.</p>
      ) : (
        <ul className="space-y-3">
          {data!.relatorios.map((r) => (
            <RelatorioItem key={r.id} r={r} aberto={aberto === r.id} onToggle={() => setAberto(aberto === r.id ? null : r.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RelatorioItem({ r, aberto, onToggle }: { r: Relatorio; aberto: boolean; onToggle: () => void }) {
  const novos = (r.novos as { numero: string; parte: string }[]) ?? [];
  const alterados = (r.alterados as { numero: string; parte: string; de: string | null; para: string | null; norma: string | null }[]) ?? [];
  const revogados = (r.revogados as { numero: string; norma: string | null }[]) ?? [];
  const total = novos.length + alterados.length + revogados.length;
  const data = new Date(r.executado_em).toLocaleString("pt-BR");

  return (
    <li className="rounded-xl border border-border bg-card">
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center gap-3">
        {total === 0 ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{data}</p>
          <p className="text-xs text-muted-foreground">
            Planalto {r.total_planalto} · Banco {r.total_banco}
            {total > 0 && (
              <>
                {" · "}
                <span className="text-emerald-600">{novos.length} novos</span>
                {" · "}
                <span className="text-amber-600">{alterados.length} alterados</span>
                {" · "}
                <span className="text-rose-600">{revogados.length} revogados</span>
              </>
            )}
          </p>
        </div>
      </button>
      {aberto && total > 0 && (
        <div className="border-t border-border p-4 space-y-4 text-sm">
          {novos.length > 0 && (
            <Bloco titulo="Novos artigos" cor="emerald" itens={novos.map((n) => `Art. ${n.numero} (${n.parte})`)} />
          )}
          {alterados.length > 0 && (
            <div>
              <p className="font-medium mb-1 text-amber-600">Alterados</p>
              <ul className="space-y-1">
                {alterados.map((a, i) => (
                  <li key={i} className="text-xs">
                    <span className="font-mono">Art. {a.numero}</span> — {a.norma ?? "?"} · {a.de ?? "—"} → {a.para ?? "—"}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {revogados.length > 0 && (
            <div>
              <p className="font-medium mb-1 text-rose-600 inline-flex items-center gap-1"><Ban className="h-4 w-4" /> Revogados</p>
              <ul className="space-y-1">
                {revogados.map((rv, i) => (
                  <li key={i} className="text-xs">
                    <span className="font-mono">Art. {rv.numero}</span> — {rv.norma ?? "?"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function Bloco({ titulo, cor, itens }: { titulo: string; cor: string; itens: string[] }) {
  return (
    <div>
      <p className={`font-medium mb-1 text-${cor}-600`}>{titulo}</p>
      <ul className="text-xs grid grid-cols-2 md:grid-cols-3 gap-x-3 gap-y-0.5 font-mono">
        {itens.map((it, i) => (<li key={i}>{it}</li>))}
      </ul>
    </div>
  );
}
