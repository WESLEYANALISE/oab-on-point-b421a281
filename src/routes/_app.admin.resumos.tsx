import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, FileText, X, Eye, Trash2, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  listarLivrosParaResumo,
  gerarPreviaResumo,
  atualizarPrevia,
  gerarProximoCapitulo,
  excluirResumoLivro,
} from "@/lib/resumos-admin.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/admin/resumos")({
  component: AdminResumos,
});

const SLUG_LABEL: Record<string, string> = {
  estudos: "Estudos",
  classicos: "Clássicos",
  oratoria: "Oratória",
  lideranca: "Liderança",
  politica: "Política",
  "fora-da-toga": "Fora da Toga",
};

type PreviaItem = { ordem: number; titulo: string; pagina_inicio: number; pagina_fim: number; incluir: boolean };

function AdminResumos() {
  const qc = useQueryClient();
  const listFn = useServerFn(listarLivrosParaResumo);
  const previaFn = useServerFn(gerarPreviaResumo);
  const atualizaFn = useServerFn(atualizarPrevia);
  const proxCapFn = useServerFn(gerarProximoCapitulo);
  const delFn = useServerFn(excluirResumoLivro);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-resumos"],
    queryFn: () => listFn(),
    refetchInterval: 8_000,
    staleTime: 30_000,
  });

  const [filtro, setFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [preview, setPreview] = useState<{ resumo_livro_id: string; itens: PreviaItem[] } | null>(null);
  const [gerando, setGerando] = useState<Set<string>>(new Set());

  const livros = data ?? [];
  const slugs = Array.from(new Set(livros.map((l) => l.slug)));

  const filtrados = useMemo(() => {
    return livros.filter((l) => {
      if (filtro !== "todos" && l.slug !== filtro) return false;
      if (busca && !l.titulo.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [livros, filtro, busca]);

  const previa = useMutation({
    mutationFn: (v: { slug: string; livro_id: number }) => previaFn({ data: v }),
    onMutate: () => toast.loading("Lendo PDF e extraindo sumário…", { id: "previa" }),
    onSuccess: (r: any) => {
      toast.success(`Prévia pronta: ${r.total} capítulos detectados`, { id: "previa" });
      qc.invalidateQueries({ queryKey: ["admin-resumos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro", { id: "previa" }),
  });

  // worker que processa um livro até concluir
  async function processarLivro(resumo_livro_id: string) {
    setGerando((s) => new Set(s).add(resumo_livro_id));
    try {
      let safety = 100;
      while (safety-- > 0) {
        const r: any = await proxCapFn({ data: { resumo_livro_id } });
        qc.invalidateQueries({ queryKey: ["admin-resumos"] });
        if (r?.done) {
          toast.success("Resumos gerados");
          break;
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar capítulo");
    } finally {
      setGerando((s) => {
        const n = new Set(s);
        n.delete(resumo_livro_id);
        return n;
      });
      qc.invalidateQueries({ queryKey: ["admin-resumos"] });
    }
  }

  const salvarPrevia = useMutation({
    mutationFn: (v: { resumo_livro_id: string; previa: PreviaItem[] }) => atualizaFn({ data: v }),
  });

  async function confirmarPreviaEGerar() {
    if (!preview) return;
    await salvarPrevia.mutateAsync({ resumo_livro_id: preview.resumo_livro_id, previa: preview.itens });
    const id = preview.resumo_livro_id;
    setPreview(null);
    processarLivro(id);
  }

  const excluir = useMutation({
    mutationFn: (id: string) => delFn({ data: { resumo_livro_id: id } }),
    onSuccess: () => {
      toast.success("Resumo excluído");
      qc.invalidateQueries({ queryKey: ["admin-resumos"] });
    },
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel</p>
        <h1 className="font-display text-3xl md:text-4xl">Extração de Resumos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lê o PDF do livro com o Mistral, extrai o sumário, você revisa e o Gemini gera resumos didáticos por capítulo.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFiltro("todos")}
          className={`text-xs px-3 py-1.5 rounded-full border ${filtro === "todos" ? "bg-foreground text-background" : "bg-card"}`}
        >
          Todos ({livros.length})
        </button>
        {slugs.map((s) => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`text-xs px-3 py-1.5 rounded-full border ${filtro === s ? "bg-foreground text-background" : "bg-card"}`}
          >
            {SLUG_LABEL[s] ?? s}
          </button>
        ))}
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por título…"
          className="ml-auto text-sm px-3 py-1.5 rounded-full border bg-card min-w-[200px]"
        />
      </div>

      {isLoading && (
        <div className="py-12 text-center text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      )}

      <div className="grid gap-2">
        {filtrados.map((l) => {
          const r = l.resumo as any;
          const status: string = r?.status ?? "sem_previa";
          const key = `${l.slug}:${l.livro_id}`;
          const proc = r?.id && gerando.has(r.id);
          return (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
              <div className="h-14 w-10 bg-muted rounded overflow-hidden flex-shrink-0">
                {l.capa && <img src={l.capa} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {SLUG_LABEL[l.slug] ?? l.slug}
                </p>
                <p className="text-sm font-medium truncate">{l.titulo}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={status} proc={!!proc} />
                  {r && (
                    <span className="text-xs text-muted-foreground">
                      {r.capitulos_gerados ?? 0}/{r.total_capitulos ?? 0} capítulos
                    </span>
                  )}
                  {r?.erro_msg && <span className="text-xs text-destructive truncate max-w-[300px]" title={r.erro_msg}>· {r.erro_msg}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {!l.pdf_url && <span className="text-[11px] text-muted-foreground">sem PDF</span>}
                {l.pdf_url && status === "sem_previa" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={previa.isPending}
                    onClick={() => previa.mutate({ slug: l.slug, livro_id: l.livro_id })}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Gerar prévia
                  </Button>
                )}
                {l.pdf_url && status === "previa_pronta" && r && (
                  <Button size="sm" variant="outline" onClick={() => {
                    const itens = ((r.previa as PreviaItem[]) ?? []).map((it) => ({
                      ordem: it.ordem,
                      titulo: it.titulo,
                      pagina_inicio: it.pagina_inicio,
                      pagina_fim: it.pagina_fim,
                      incluir: it.incluir,
                    }));
                    setPreview({ resumo_livro_id: r.id, itens });
                  }}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" /> Ver prévia
                  </Button>
                )}
                {l.pdf_url && (status === "previa_pronta" || status === "concluido" || status === "erro") && r && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={previa.isPending}
                    title="Refazer prévia"
                    onClick={() => previa.mutate({ slug: l.slug, livro_id: l.livro_id })}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                )}
                {r && status === "gerando" && !proc && (
                  <Button size="sm" onClick={() => processarLivro(r.id)}>
                    Retomar
                  </Button>
                )}
                {r && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Excluir resumo deste livro?")) excluir.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
          <div>
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
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Gerar {incluidos} resumos</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
