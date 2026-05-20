import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AudioLines,
  ChevronLeft,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  Eye,
  Check,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  excluirNarracao,
  gerarNarracaoArtigo,
  listarArtigosParaNarrar,
  listarLeisNarracao,
  obterNarracao,
  previewTextoNarracao,
  sugerirRecomendacoesLei,
} from "@/lib/narracoes.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/admin/narracoes")({
  component: AdminNarracoes,
});

type Artigo = {
  id: string;
  numero: string;
  texto: string;
  ordem: number;
  relevancia: string | null;
  tem_narracao: boolean;
};

type QueueState = {
  ids: string[];
  currentId: string | null;
};

function AdminNarracoes() {
  const fnLeis = useServerFn(listarLeisNarracao);
  const fnArtigos = useServerFn(listarArtigosParaNarrar);
  const fnGerar = useServerFn(gerarNarracaoArtigo);
  const fnSugerir = useServerFn(sugerirRecomendacoesLei);
  const qc = useQueryClient();

  const [leiId, setLeiId] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const [aba, setAba] = useState<"todos" | "recomendados">("todos");
  const [soFaltantes, setSoFaltantes] = useState(false);

  // Fila de geração
  const [queue, setQueue] = useState<QueueState>({ ids: [], currentId: null });

  const { data: leis, isLoading: leisLoading } = useQuery({
    queryKey: ["admin-narracoes", "leis"],
    queryFn: () => fnLeis(),
  });

  const { data: artigos, isFetching } = useQuery({
    queryKey: ["admin-narracoes", "artigos", leiId, busca, page, aba],
    queryFn: () =>
      fnArtigos({
        data: {
          leiId,
          busca,
          page,
          pageSize: 50,
          apenasRecomendados: aba === "recomendados",
        },
      }),
    enabled: !!leiId,
  });

  // Processa fila: quando não há current e tem ids, dispara o primeiro
  useEffect(() => {
    if (queue.currentId || queue.ids.length === 0) return;
    const next = queue.ids[0];
    setQueue((q) => ({ ids: q.ids.slice(1), currentId: next }));
    fnGerar({ data: { artigoId: next, voz: "Kore" } })
      .then(() => {
        toast.success("Narração gerada");
        qc.invalidateQueries({ queryKey: ["admin-narracoes"] });
        qc.removeQueries({ queryKey: ["vade-mecum", "artigo", next] });
      })
      .catch((e: any) => toast.error(e?.message || "Erro ao narrar"))
      .finally(() => {
        setQueue((q) => ({ ...q, currentId: null }));
      });
  }, [queue, fnGerar, qc]);

  const sugerir = useMutation({
    mutationFn: () => fnSugerir({ data: { leiId } }),
    onSuccess: (r) => {
      toast.success(`${r.atualizados} artigos marcados como recomendados`);
      qc.invalidateQueries({ queryKey: ["admin-narracoes"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro na sugestão"),
  });

  const enqueue = (id: string) => {
    setQueue((q) => {
      if (q.currentId === id || q.ids.includes(id)) return q;
      return { ...q, ids: [...q.ids, id] };
    });
  };

  const queuePosition = (id: string): number => {
    if (queue.currentId === id) return 0; // narrando agora
    const idx = queue.ids.indexOf(id);
    return idx >= 0 ? idx + 1 : -1;
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-6 flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-gradient-gold grid place-items-center text-gold-foreground">
          <AudioLines className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl md:text-4xl">Narração de Artigos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gera o áudio de cada artigo com Gemini TTS (voz <strong>Kore</strong>, pt-BR).
            Salva no Storage privado.
          </p>
        </div>
      </header>

      {!leiId && leisLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando leis…
        </div>
      )}

      {!leiId && !leisLoading && (
        <LeisLista
          leis={leis ?? []}
          onSelect={(id) => {
            setLeiId(id);
            setPage(0);
            setBusca("");
            setAba("todos");
          }}
        />
      )}

      {leiId && (
        <>
          <div className="flex items-center justify-between gap-3 mb-3">
            <button
              onClick={() => {
                setLeiId("");
                setBusca("");
                setPage(0);
              }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Trocar lei
            </button>
            <span className="text-sm font-medium truncate">
              {(leis ?? []).find((l) => l.id === leiId)?.nome_curto ||
                (leis ?? []).find((l) => l.id === leiId)?.nome}
            </span>
          </div>

          {(() => {
            const l = (leis ?? []).find((x) => x.id === leiId);
            if (!l) return null;
            return <ProgressoLei narrados={l.narrados ?? 0} total={l.total_narravel ?? 0} className="mb-3" />;
          })()}

          {/* Tabs Todos / Recomendados */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted mb-3">
            <button
              onClick={() => { setAba("todos"); setPage(0); }}
              className={`flex-1 h-8 text-xs rounded-md transition-colors ${
                aba === "todos"
                  ? "bg-card shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos os artigos
            </button>
            <button
              onClick={() => { setAba("recomendados"); setPage(0); }}
              className={`flex-1 h-8 text-xs rounded-md transition-colors inline-flex items-center justify-center gap-1 ${
                aba === "recomendados"
                  ? "bg-card shadow-sm font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="h-3 w-3" /> Recomendações OAB
            </button>
          </div>

          {/* Fila ativa */}
          {(queue.currentId || queue.ids.length > 0) && (
            <div className="mb-3 px-3 py-2 rounded-lg border border-border bg-card text-xs flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
              <span>
                Narrando 1 · {queue.ids.length} na fila
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPage(0);
                }}
                placeholder="Buscar por número ou texto"
                className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm"
              />
            </div>
            <button
              onClick={() => { setSoFaltantes((v) => !v); setPage(0); }}
              className={`shrink-0 h-9 px-3 text-xs rounded-lg border transition-colors ${
                soFaltantes
                  ? "bg-gradient-gold text-gold-foreground border-transparent"
                  : "border-border hover:bg-accent"
              }`}
            >
              Só faltantes
            </button>
          </div>

          {isFetching && !artigos && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}

          {(() => {
            const itens = (artigos?.items ?? []).filter((a) => !soFaltantes || !a.tem_narracao);
            const vazioRecomendados = aba === "recomendados" && artigos && artigos.total === 0;
            return (
              <>
                {vazioRecomendados && (
                  <div className="p-6 rounded-xl border border-dashed border-border bg-card text-center mb-3">
                    <Sparkles className="h-6 w-6 mx-auto text-primary mb-2" />
                    <p className="text-sm font-medium mb-1">Sem recomendações ainda</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Use a IA pra marcar os artigos mais cobrados na OAB desta lei.
                    </p>
                    <button
                      disabled={sugerir.isPending}
                      onClick={() => sugerir.mutate()}
                      className="h-9 px-4 inline-flex items-center gap-2 rounded-lg bg-gradient-gold text-gold-foreground text-xs disabled:opacity-50"
                    >
                      {sugerir.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      Sugerir com IA
                    </button>
                  </div>
                )}

                {!vazioRecomendados && aba === "recomendados" && (
                  <div className="flex justify-end mb-2">
                    <button
                      disabled={sugerir.isPending}
                      onClick={() => sugerir.mutate()}
                      className="h-7 px-2 inline-flex items-center gap-1 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-accent disabled:opacity-50"
                    >
                      {sugerir.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Regerar sugestões
                    </button>
                  </div>
                )}

                <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                  {itens.map((a) => (
                    <ArtigoRow
                      key={a.id}
                      artigo={a}
                      queuePosition={queuePosition(a.id)}
                      onEnqueue={() => enqueue(a.id)}
                    />
                  ))}
                  {artigos && itens.length === 0 && !vazioRecomendados && (
                    <li className="p-4 text-sm text-muted-foreground text-center">
                      {soFaltantes ? "Todos os artigos desta página já foram narrados." : "Nenhum artigo encontrado."}
                    </li>
                  )}
                </ul>
              </>
            );
          })()}


          {artigos && artigos.total > artigos.pageSize && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-muted-foreground">
                {page * artigos.pageSize + 1}–
                {Math.min((page + 1) * artigos.pageSize, artigos.total)} de{" "}
                {artigos.total}
              </span>
              <button
                disabled={(page + 1) * artigos.pageSize >= artigos.total}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40"
              >
                Próximo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ArtigoRow({
  artigo,
  queuePosition,
  onEnqueue,
}: {
  artigo: Artigo;
  queuePosition: number; // -1 não está; 0 = narrando agora; >=1 posição na fila
  onEnqueue: () => void;
}) {
  const qc = useQueryClient();
  const fnObter = useServerFn(obterNarracao);
  const fnExcluir = useServerFn(excluirNarracao);
  const fnPreview = useServerFn(previewTextoNarracao);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState<string>("");

  const isNarrando = queuePosition === 0;
  const isNaFila = queuePosition > 0;

  const carregar = useMutation({
    mutationFn: () => fnObter({ data: { artigoId: artigo.id } }),
    onSuccess: (r) => {
      if (r) setAudioUrl(r.url);
    },
  });

  const excluir = useMutation({
    mutationFn: () => fnExcluir({ data: { artigoId: artigo.id } }),
    onSuccess: () => {
      setAudioUrl(null);
      toast.success("Narração removida");
      qc.invalidateQueries({ queryKey: ["admin-narracoes"] });
      qc.removeQueries({ queryKey: ["vade-mecum", "artigo", artigo.id] });
      qc.invalidateQueries({ queryKey: ["vade-mecum"] });
    },
  });

  const abrirPreview = async () => {
    try {
      const r = await fnPreview({ data: { artigoId: artigo.id } });
      setPreviewText(r.texto);
      setShowPreview(true);
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    }
  };

  const busy = carregar.isPending || excluir.isPending || isNarrando;

  // Barra de progresso simulada para o item narrando
  const [progresso, setProgresso] = useState(0);
  const tInicio = useRef<number>(0);
  useEffect(() => {
    if (!isNarrando) {
      if (progresso > 0) setProgresso(0);
      return;
    }
    tInicio.current = Date.now();
    setProgresso(2);
    const chars = Math.max(60, artigo.texto.length);
    const etaMs = 2500 + chars * 35;
    const id = setInterval(() => {
      const decorrido = Date.now() - tInicio.current;
      const pct = Math.min(95, Math.round((decorrido / etaMs) * 100));
      setProgresso(pct);
    }, 150);
    return () => clearInterval(id);
  }, [isNarrando, artigo.texto.length]);

  const segs = isNarrando ? Math.max(1, Math.round((Date.now() - tInicio.current) / 1000)) : 0;

  const isRecomendado = artigo.relevancia === "alta" || artigo.relevancia === "muito_alta";

  return (
    <li className="px-3 py-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm shrink-0">Art. {artigo.numero}</span>
          {isRecomendado && (
            <Star
              className={`h-3 w-3 shrink-0 ${
                artigo.relevancia === "muito_alta" ? "fill-primary text-primary" : "text-primary"
              }`}
            />
          )}
          {artigo.tem_narracao && !isNarrando && (
            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          {isNaFila && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
              fila #{queuePosition}
            </span>
          )}
          <p className="text-xs text-muted-foreground truncate">{artigo.texto}</p>
        </div>

        {isNarrando && (
          <div className="mt-1.5">
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-gold transition-[width] duration-150"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>narrando… {segs}s</span>
              <span>{progresso}%</span>
            </div>
          </div>
        )}

        {audioUrl && !isNarrando && (
          <audio controls src={audioUrl} className="mt-1.5 w-full h-8" />
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={abrirPreview}
          title="Ver texto"
          className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>

        <button
          disabled={busy || !artigo.tem_narracao || !!audioUrl}
          onClick={() => carregar.mutate()}
          title={artigo.tem_narracao ? "Ouvir" : "Sem narração ainda"}
          className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {carregar.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>

        <button
          disabled={isNarrando || isNaFila}
          onClick={onEnqueue}
          title={
            isNarrando
              ? "Narrando agora"
              : isNaFila
                ? `Em fila (#${queuePosition})`
                : artigo.tem_narracao
                  ? "Regerar"
                  : "Narrar"
          }
          className="h-8 px-2 inline-flex items-center gap-1 rounded-md bg-gradient-gold text-gold-foreground text-xs disabled:opacity-50"
        >
          {isNarrando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isNaFila ? (
            <Clock className="h-3.5 w-3.5" />
          ) : artigo.tem_narracao ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </button>

        {artigo.tem_narracao && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("Remover narração deste artigo?")) excluir.mutate();
            }}
            title="Excluir"
            className="h-8 w-8 grid place-items-center rounded-md border border-border text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Texto que será narrado</DialogTitle>
            <DialogDescription>
              Resultado após remover parênteses e normalizar artigo/parágrafo/inciso/alínea.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/50 p-3 rounded-lg max-h-[60vh] overflow-y-auto">
            {previewText}
          </div>
          <p className="text-xs text-muted-foreground">
            {previewText.length} caracteres
          </p>
        </DialogContent>
      </Dialog>
    </li>
  );
}

type LeiItem = {
  id: string;
  nome: string;
  nome_curto: string | null;
  categoria: string | null;
  total_artigos: number | null;
  total_narravel: number;
  narrados: number;
};

const CATEGORIA_LABEL: Record<string, string> = {
  codigo: "Códigos",
  estatuto: "Estatutos",
  lei: "Leis",
  sumula: "Súmulas",
};

function ProgressoLei({
  narrados,
  total,
  className = "",
}: {
  narrados: number;
  total: number;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((narrados / total) * 100) : 0;
  return (
    <div className={className}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
        <span>
          {narrados} de {total} narrados
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-gold transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function LeisLista({
  leis,
  onSelect,
}: {
  leis: LeiItem[];
  onSelect: (id: string) => void;
}) {
  const grupos = leis.reduce<Record<string, LeiItem[]>>((acc, l) => {
    const k = l.categoria || "outros";
    (acc[k] ||= []).push(l);
    return acc;
  }, {});

  const totalNarravel = leis.reduce((s, l) => s + (l.total_narravel ?? 0), 0);
  const totalNarrados = leis.reduce((s, l) => s + (l.narrados ?? 0), 0);

  const ordemCategorias = ["codigo", "estatuto", "lei", "sumula"];
  const categoriasOrdenadas = [
    ...ordemCategorias.filter((k) => grupos[k]),
    ...Object.keys(grupos).filter((k) => !ordemCategorias.includes(k)),
  ];

  return (
    <section className="space-y-6">
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Progresso geral
        </div>
        <ProgressoLei narrados={totalNarrados} total={totalNarravel} />
      </div>

      {categoriasOrdenadas.map((cat) => {
        const items = grupos[cat];
        const catNarr = items.reduce((s, l) => s + (l.narrados ?? 0), 0);
        const catTot = items.reduce((s, l) => s + (l.total_narravel ?? 0), 0);
        return (
          <div key={cat}>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
                {CATEGORIA_LABEL[cat] ?? cat} · {items.length}
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {catNarr}/{catTot}
              </span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((l) => (
                <li key={l.id}>
                  <button
                    onClick={() => onSelect(l.id)}
                    className="w-full text-left p-4 rounded-xl border border-border bg-card hover:border-primary hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display text-base truncate">
                          {l.nome_curto || l.nome}
                        </div>
                        {l.nome_curto && l.nome !== l.nome_curto && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {l.nome}
                          </div>
                        )}
                      </div>
                      {l.narrados >= l.total_narravel && l.total_narravel > 0 && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                          completo
                        </span>
                      )}
                    </div>
                    <ProgressoLei
                      narrados={l.narrados ?? 0}
                      total={l.total_narravel ?? 0}
                      className="mt-3"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {leis.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma lei cadastrada.</p>
      )}
    </section>
  );
}
