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
  Trash2,
  Eye,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  excluirNarracao,
  gerarNarracaoArtigo,
  listarArtigosParaNarrar,
  listarLeisNarracao,
  obterNarracao,
  previewTextoNarracao,
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

function AdminNarracoes() {
  const fnLeis = useServerFn(listarLeisNarracao);
  const fnArtigos = useServerFn(listarArtigosParaNarrar);

  const [leiId, setLeiId] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [page, setPage] = useState(0);
  const [soFaltantes, setSoFaltantes] = useState(true);

  const { data: leis, isLoading: leisLoading } = useQuery({
    queryKey: ["admin-narracoes", "leis"],
    queryFn: () => fnLeis(),
  });

  const { data: artigos, isFetching } = useQuery({
    queryKey: ["admin-narracoes", "artigos", leiId, busca, page],
    queryFn: () =>
      fnArtigos({ data: { leiId, busca, page, pageSize: 50 } }),
    enabled: !!leiId,
  });

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

      {!leiId && !leisLoading && <LeisLista leis={leis ?? []} onSelect={(id) => { setLeiId(id); setPage(0); setBusca(""); }} />}

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
            return (
              <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
                {itens.map((a) => (
                  <ArtigoRow key={a.id} artigo={a} />
                ))}
                {artigos && itens.length === 0 && (
                  <li className="p-4 text-sm text-muted-foreground text-center">
                    {soFaltantes ? "Todos os artigos desta página já foram narrados." : "Nenhum artigo encontrado."}
                  </li>
                )}
              </ul>
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

type Artigo = {
  id: string;
  numero: string;
  texto: string;
  ordem: number;
  tem_narracao: boolean;
};

function ArtigoRow({ artigo }: { artigo: Artigo }) {
  const qc = useQueryClient();
  const fnGerar = useServerFn(gerarNarracaoArtigo);
  const fnObter = useServerFn(obterNarracao);
  const fnExcluir = useServerFn(excluirNarracao);
  const fnPreview = useServerFn(previewTextoNarracao);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState<string>("");

  const gerar = useMutation({
    mutationFn: () => fnGerar({ data: { artigoId: artigo.id, voz: "Kore" } }),
    onSuccess: (r) => {
      setAudioUrl(r.url);
      toast.success("Narração gerada!");
      qc.invalidateQueries({ queryKey: ["admin-narracoes"] });
      qc.removeQueries({ queryKey: ["vade-mecum", "artigo", artigo.id] });
      qc.invalidateQueries({ queryKey: ["vade-mecum"] });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao gerar"),
  });

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

  const busy = gerar.isPending || carregar.isPending || excluir.isPending;

  // Progresso simulado durante a geração: estimativa baseada no tamanho do
  // texto (Gemini TTS ≈ 80 chars/s de áudio + overhead). Sobe até 95% e
  // estaciona aguardando o término real.
  const [progresso, setProgresso] = useState(0);
  const tInicio = useRef<number>(0);
  useEffect(() => {
    if (!gerar.isPending) {
      if (progresso > 0) setProgresso(0);
      return;
    }
    tInicio.current = Date.now();
    setProgresso(2);
    const chars = Math.max(60, artigo.texto.length);
    const etaMs = 2500 + chars * 35; // estimativa
    const id = setInterval(() => {
      const decorrido = Date.now() - tInicio.current;
      const pct = Math.min(95, Math.round((decorrido / etaMs) * 100));
      setProgresso(pct);
    }, 150);
    return () => clearInterval(id);
  }, [gerar.isPending, artigo.texto.length]);

  const segs = gerar.isPending ? Math.max(1, Math.round((Date.now() - tInicio.current) / 1000)) : 0;

  return (
    <li className="px-3 py-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm shrink-0">Art. {artigo.numero}</span>
          {artigo.tem_narracao && !gerar.isPending && (
            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
          )}
          <p className="text-xs text-muted-foreground truncate">{artigo.texto}</p>
        </div>

        {gerar.isPending && (
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

        {audioUrl && !gerar.isPending && (
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

        {artigo.tem_narracao && !audioUrl && (
          <button
            disabled={busy}
            onClick={() => carregar.mutate()}
            title="Ouvir"
            className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          disabled={busy}
          onClick={() => gerar.mutate()}
          title={artigo.tem_narracao ? "Regerar" : "Narrar"}
          className="h-8 px-2 inline-flex items-center gap-1 rounded-md bg-gradient-gold text-gold-foreground text-xs disabled:opacity-50"
        >
          {gerar.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
