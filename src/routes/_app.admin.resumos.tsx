import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Loader2, Sparkles, FileText, X, Eye, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, Clock, ChevronRight, ArrowLeft, ListChecks,
} from "lucide-react";
import {
  listarLivrosParaResumo,
  gerarPreviaResumo,
  atualizarPrevia,
  excluirResumoLivro,
} from "@/lib/resumos-admin.functions";
import { resumoQueue, useResumoQueue } from "@/lib/resumo-queue";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/admin/resumos")({
  component: AdminResumos,
});

type PreviaItem = { ordem: number; titulo: string; pagina_inicio: number; pagina_fim: number; incluir: boolean };
type Livro = {
  slug: string;
  livro_id: number;
  titulo: string;
  autor: string | null;
  capa: string | null;
  area: string | null;
  pdf_url: string | null;
  resumo: any;
};

function AdminResumos() {
  const qc = useQueryClient();
  const listFn = useServerFn(listarLivrosParaResumo);
  const previaFn = useServerFn(gerarPreviaResumo);
  const atualizaFn = useServerFn(atualizarPrevia);
  const delFn = useServerFn(excluirResumoLivro);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-resumos"],
    queryFn: () => listFn(),
    refetchInterval: 8_000,
    staleTime: 30_000,
  });

  const queueState = useResumoQueue();
  const naFilaKeys = useMemo(() => {
    const s = new Set<string>();
    for (const i of queueState.fila) s.add(i.key);
    if (queueState.atual) s.add(queueState.atual.key);
    return s;
  }, [queueState]);

  const [areaSelecionada, setAreaSelecionada] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [preview, setPreview] = useState<{ resumo_livro_id: string; itens: PreviaItem[] } | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const livros = (data ?? []) as Livro[];

  const areas = useMemo(() => {
    const map = new Map<string, { total: number; comResumo: number }>();
    for (const l of livros) {
      const k = l.area ?? "Sem área";
      const cur = map.get(k) ?? { total: 0, comResumo: 0 };
      cur.total++;
      if (l.resumo) cur.comResumo++;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [livros]);

  const livrosDaArea = useMemo(() => {
    if (!areaSelecionada) return [];
    return livros
      .filter((l) => (l.area ?? "Sem área") === areaSelecionada)
      .filter((l) => !busca || l.titulo.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [livros, areaSelecionada, busca]);

  const previa = useMutation({
    mutationFn: (v: { slug: string; livro_id: number }) => previaFn({ data: v }),
    onMutate: () => toast.loading("Lendo PDF e extraindo sumário…", { id: "previa" }),
    onSuccess: (r: any) => {
      toast.success(`Prévia pronta: ${r.total} capítulos detectados`, { id: "previa" });
      qc.invalidateQueries({ queryKey: ["admin-resumos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro", { id: "previa" }),
  });

  // Converte um livro em job da fila baseado no estado atual.
  // - sem resumo OU status sem_previa/erro sem id → previa
  // - tem resumo.id com status previa_pronta/gerando/erro → capitulos (pula prévia)
  // - status concluido → null
  function jobParaLivro(l: Livro): ResumoQueueItem | null {
    if (!l.pdf_url) return null;
    const r = l.resumo as any;
    const status: string = r?.status ?? "sem_previa";
    if (status === "concluido") return null;
    if (r?.id && (status === "previa_pronta" || status === "gerando" || status === "erro")) {
      return {
        kind: "capitulos",
        key: capitulosKey(r.id),
        id: r.id,
        titulo: l.titulo,
      };
    }
    return {
      kind: "previa",
      key: previaKey(l.slug, l.livro_id),
      slug: l.slug,
      livro_id: l.livro_id,
      titulo: l.titulo,
    };
  }

  function enfileirarJobs(jobs: ResumoQueueItem[]) {
    const novos = jobs.filter((j) => !naFilaKeys.has(j.key));
    if (!novos.length) {
      toast.info("Nada novo para enfileirar");
      return;
    }
    const added = resumoQueue.enqueue(novos);
    toast.success(`${added} ${added === 1 ? "livro adicionado" : "livros adicionados"} à fila`);
  }

  const salvarPrevia = useMutation({
    mutationFn: (v: { resumo_livro_id: string; previa: PreviaItem[] }) => atualizaFn({ data: v }),
  });

  async function confirmarPreviaEGerar() {
    if (!preview) return;
    await salvarPrevia.mutateAsync({ resumo_livro_id: preview.resumo_livro_id, previa: preview.itens });
    const id = preview.resumo_livro_id;
    const livro = livros.find((l) => (l.resumo as any)?.id === id);
    setPreview(null);
    enfileirarJobs([
      {
        kind: "capitulos",
        key: capitulosKey(id),
        id,
        titulo: livro?.titulo ?? "Livro",
      },
    ]);
  }

  const excluir = useMutation({
    mutationFn: (id: string) => delFn({ data: { resumo_livro_id: id } }),
    onSuccess: () => {
      toast.success("Resumo excluído");
      qc.invalidateQueries({ queryKey: ["admin-resumos"] });
    },
  });

  function jobDoLivro(l: Livro) {
    return jobParaLivro(l);
  }

  function toggleSelecionado(key: string) {
    setSelecionados((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  function selecionarTodosVisiveis() {
    const keys = livrosDaArea
      .map(jobDoLivro)
      .filter((j): j is ResumoQueueItem => !!j && !naFilaKeys.has(j.key))
      .map((j) => j.key);
    setSelecionados(new Set(keys));
  }

  function enfileirarSelecionados() {
    const jobs: ResumoQueueItem[] = [];
    for (const l of livrosDaArea) {
      const j = jobDoLivro(l);
      if (j && selecionados.has(j.key)) jobs.push(j);
    }
    enfileirarJobs(jobs);
    setSelecionados(new Set());
    setSelectionMode(false);
  }

  function iniciarAutomaticoArea() {
    if (!areaSelecionada) return;
    const jobs = livros
      .filter((l) => (l.area ?? "Sem área") === areaSelecionada)
      .map(jobDoLivro)
      .filter((j): j is ResumoQueueItem => !!j);
    enfileirarJobs(jobs);
  }

  function iniciarAutomaticoTudo() {
    const jobs = livros
      .map(jobDoLivro)
      .filter((j): j is ResumoQueueItem => !!j);
    if (jobs.length > 50 && !confirm(`Adicionar ${jobs.length} livros à fila? Pode demorar horas.`)) return;
    enfileirarJobs(jobs);
  }



  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel</p>
        <h1 className="font-display text-2xl md:text-4xl">Extração de Resumos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lê o PDF do livro com o Mistral, extrai o sumário, você revisa e o Gemini gera resumos didáticos por capítulo.
        </p>
      </header>

      {isLoading && (
        <div className="py-12 text-center text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      )}

      {!isLoading && !areaSelecionada && (
        <div>
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Áreas ({areas.length})
          </h2>
          <ul className="grid gap-2">
            {areas.map((a) => (
              <li key={a.nome}>
                <button
                  onClick={() => { setAreaSelecionada(a.nome); setBusca(""); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/40 transition text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.total} {a.total === 1 ? "livro" : "livros"} · {a.comResumo} com resumo
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && areaSelecionada && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={() => setAreaSelecionada(null)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Áreas
            </button>
            <span className="text-xs text-muted-foreground">{livrosDaArea.length} livros</span>
          </div>
          <h2 className="font-display text-xl md:text-2xl mb-3">{areaSelecionada}</h2>

          <div className="flex gap-2 mb-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título…"
              className="flex-1 text-sm px-4 py-2.5 rounded-full border bg-card"
            />
            <Button
              variant={selectionMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectionMode((v) => !v);
                setSelecionados(new Set());
              }}
              className="rounded-full"
            >
              <ListChecks className="h-4 w-4 mr-1.5" />
              {selectionMode ? "Cancelar" : "Selecionar"}
            </Button>
          </div>

          {selectionMode && (
            <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{selecionados.size} selecionado(s)</span>
              <button
                onClick={selecionarTodosVisiveis}
                className="underline hover:text-foreground"
              >
                Selecionar todos elegíveis
              </button>
            </div>
          )}

          <div className={`grid gap-2 ${selectionMode && selecionados.size > 0 ? "pb-24" : ""}`}>
            {livrosDaArea.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum livro encontrado.</p>
            )}
            {livrosDaArea.map((l) => {
              const r = l.resumo as any;
              const status: string = r?.status ?? "sem_previa";
              const proc = r?.id && (queueState.atual?.id === r.id);
              const enfileirado = r?.id && naFila.has(r.id);
              const el = elegivel(l);
              return (
                <LivroCard
                  key={`${l.slug}:${l.livro_id}`}
                  livro={l}
                  status={status}
                  resumo={r}
                  proc={!!proc}
                  enfileirado={!!enfileirado && !proc}
                  previaPending={previa.isPending}
                  selectionMode={selectionMode}
                  selectable={!!el && !enfileirado}
                  selected={!!el && selecionados.has(el.id)}
                  onToggleSelect={() => el && toggleSelecionado(el.id)}
                  onGerarPrevia={() => previa.mutate({ slug: l.slug, livro_id: l.livro_id })}
                  onVerPrevia={() => {
                    const itens = ((r.previa as PreviaItem[]) ?? []).map((it) => ({
                      ordem: it.ordem,
                      titulo: it.titulo,
                      pagina_inicio: it.pagina_inicio,
                      pagina_fim: it.pagina_fim,
                      incluir: it.incluir,
                    }));
                    setPreview({ resumo_livro_id: r.id, itens });
                  }}
                  onRetomar={() => enfileirar([{ id: r.id, titulo: l.titulo }])}
                  onExcluir={() => { if (confirm("Excluir resumo deste livro?")) excluir.mutate(r.id); }}
                />
              );
            })}
          </div>

          {selectionMode && selecionados.size > 0 && (
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-auto z-40 flex justify-center">
              <div className="bg-card border border-border rounded-full shadow-2xl flex items-center gap-3 pl-4 pr-2 py-2 max-w-full">
                <span className="text-sm font-medium whitespace-nowrap">
                  {selecionados.size} selecionado(s)
                </span>
                <Button size="sm" className="rounded-full" onClick={enfileirarSelecionados}>
                  <Sparkles className="h-4 w-4 mr-1.5" /> Adicionar à fila
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {preview && (
        <PreviewDrawer
          preview={preview}
          onChange={(itens) => setPreview({ ...preview, itens })}
          onClose={() => setPreview(null)}
          onConfirm={confirmarPreviaEGerar}
          saving={salvarPrevia.isPending}
        />
      )}
    </div>
  );
}

function LivroCard({
  livro, status, resumo, proc, enfileirado, previaPending,
  selectionMode, selectable, selected, onToggleSelect,
  onGerarPrevia, onVerPrevia, onRetomar, onExcluir,
}: {
  livro: Livro; status: string; resumo: any; proc: boolean; enfileirado: boolean; previaPending: boolean;
  selectionMode: boolean; selectable: boolean; selected: boolean; onToggleSelect: () => void;
  onGerarPrevia: () => void; onVerPrevia: () => void; onRetomar: () => void; onExcluir: () => void;
}) {
  const cardClasses = `p-3 rounded-xl border bg-card transition ${
    selectionMode && selectable ? "cursor-pointer hover:bg-accent/30" : ""
  } ${selected ? "ring-2 ring-primary border-primary" : ""}`;

  return (
    <div
      className={cardClasses}
      onClick={selectionMode && selectable ? onToggleSelect : undefined}
    >
      <div className="flex items-start gap-3">
        {selectionMode && (
          <div className="pt-1">
            <input
              type="checkbox"
              checked={selected}
              disabled={!selectable}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4"
            />
          </div>
        )}
        <div className="h-16 w-12 bg-muted rounded overflow-hidden flex-shrink-0">
          {livro.capa && <img src={livro.capa} alt="" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{livro.titulo}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={status} proc={proc} />
            {enfileirado && (
              <span className="text-xs inline-flex items-center gap-1 text-amber-600">
                <Clock className="h-3 w-3" /> na fila
              </span>
            )}
            {resumo && (
              <span className="text-xs text-muted-foreground">
                {resumo.capitulos_gerados ?? 0}/{resumo.total_capitulos ?? 0} cap.
              </span>
            )}
          </div>
          {resumo?.erro_msg && (
            <p className="text-xs text-destructive mt-1 break-words">{resumo.erro_msg}</p>
          )}
        </div>
      </div>

      {!selectionMode && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!livro.pdf_url && (
            <span className="text-[11px] text-muted-foreground self-center">sem PDF</span>
          )}
          {livro.pdf_url && status === "sem_previa" && (
            <Button
              size="sm"
              disabled={previaPending}
              onClick={onGerarPrevia}
              className="flex-1 sm:flex-none"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar prévia
            </Button>
          )}
          {livro.pdf_url && status === "previa_pronta" && resumo && (
            <Button size="sm" variant="outline" onClick={onVerPrevia} className="flex-1 sm:flex-none">
              <Eye className="h-3.5 w-3.5 mr-1.5" /> Ver prévia
            </Button>
          )}
          {livro.pdf_url && (status === "previa_pronta" || status === "concluido" || status === "erro") && resumo && (
            <Button
              size="sm"
              variant="outline"
              disabled={previaPending}
              title="Refazer prévia"
              onClick={onGerarPrevia}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}
          {resumo && status === "gerando" && !proc && !enfileirado && (
            <Button size="sm" onClick={onRetomar} className="flex-1 sm:flex-none">
              Retomar
            </Button>
          )}
          {resumo && (
            <Button size="sm" variant="ghost" onClick={onExcluir}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, proc }: { status: string; proc: boolean }) {
  if (proc) return <span className="text-xs inline-flex items-center gap-1 text-blue-600"><Loader2 className="h-3 w-3 animate-spin" /> processando</span>;
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    sem_previa: { label: "sem prévia", cls: "text-muted-foreground", icon: FileText },
    previa_pronta: { label: "prévia pronta", cls: "text-amber-600", icon: Clock },
    gerando: { label: "gerando", cls: "text-blue-600", icon: Loader2 },
    concluido: { label: "concluído", cls: "text-emerald-600", icon: CheckCircle2 },
    erro: { label: "erro", cls: "text-destructive", icon: AlertCircle },
  };
  const v = map[status] ?? map.sem_previa;
  const Icon = v.icon;
  return <span className={`text-xs inline-flex items-center gap-1 ${v.cls}`}><Icon className="h-3 w-3" /> {v.label}</span>;
}

function PreviewDrawer({
  preview, onChange, onClose, onConfirm, saving,
}: {
  preview: { resumo_livro_id: string; itens: PreviaItem[] };
  onChange: (itens: PreviaItem[]) => void;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const incluidos = preview.itens.filter((i) => i.incluir).length;

  function toggle(ordem: number) {
    onChange(preview.itens.map((i) => (i.ordem === ordem ? { ...i, incluir: !i.incluir } : i)));
  }
  function editar(ordem: number, titulo: string) {
    onChange(preview.itens.map((i) => (i.ordem === ordem ? { ...i, titulo } : i)));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-stretch justify-end" onClick={onClose}>
      <div className="bg-background w-full max-w-xl h-full flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase text-muted-foreground tracking-wider">Prévia</p>
            <h2 className="font-display text-lg">Capítulos detectados</h2>
            <p className="text-xs text-muted-foreground">{incluidos} de {preview.itens.length} selecionados</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {preview.itens.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum capítulo detectado.</p>
          )}
          {preview.itens.map((it) => (
            <div key={it.ordem} className={`flex items-start gap-2 p-2 rounded-lg border ${it.incluir ? "bg-card" : "bg-muted/30 opacity-60"}`}>
              <input
                type="checkbox"
                checked={it.incluir}
                onChange={() => toggle(it.ordem)}
                className="mt-2"
              />
              <div className="flex-1 min-w-0">
                <input
                  value={it.titulo}
                  onChange={(e) => editar(it.ordem, e.target.value)}
                  className="w-full text-sm font-medium bg-transparent border-b border-transparent focus:border-border outline-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  páginas {it.pagina_inicio}–{it.pagina_fim}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={onConfirm} disabled={saving || !incluidos} className="flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Gerar {incluidos}</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
