import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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

  const { data: leis } = useQuery({
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
      <Link
        to="/admin"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ChevronLeft className="h-4 w-4" /> Admin
      </Link>

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

      {!leiId && <LeisLista leis={leis ?? []} onSelect={(id) => { setLeiId(id); setPage(0); setBusca(""); }} />}

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

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar por número ou texto"
              className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm"
            />
          </div>

          {isFetching && !artigos && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}

          <ul className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
            {(artigos?.items ?? []).map((a) => (
              <ArtigoRow key={a.id} artigo={a} />
            ))}
            {artigos && artigos.items.length === 0 && (
              <li className="p-6 text-sm text-muted-foreground">Nenhum artigo encontrado.</li>
            )}
          </ul>

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

  return (
    <li className="p-4 flex flex-col sm:flex-row gap-3 sm:items-start">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display text-base">Art. {artigo.numero}</span>
          {artigo.tem_narracao && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              narrado
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{artigo.texto}</p>

        {audioUrl && (
          <audio controls src={audioUrl} className="mt-2 w-full max-w-md" />
        )}
      </div>

      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          onClick={abrirPreview}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent"
        >
          <Eye className="h-3.5 w-3.5" /> Texto
        </button>

        {artigo.tem_narracao && !audioUrl && (
          <button
            disabled={busy}
            onClick={() => carregar.mutate()}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-accent"
          >
            <Play className="h-3.5 w-3.5" /> Ouvir
          </button>
        )}

        <button
          disabled={busy}
          onClick={() => gerar.mutate()}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-gradient-gold text-gold-foreground disabled:opacity-50"
        >
          {gerar.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : artigo.tem_narracao ? (
            <RefreshCw className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
          {artigo.tem_narracao ? "Regerar" : "Narrar"}
        </button>

        {artigo.tem_narracao && (
          <button
            disabled={busy}
            onClick={() => {
              if (confirm("Remover narração deste artigo?")) excluir.mutate();
            }}
            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-border text-destructive hover:bg-destructive/10"
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
