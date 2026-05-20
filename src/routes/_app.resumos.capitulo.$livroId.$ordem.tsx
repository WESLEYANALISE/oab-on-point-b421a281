import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef, useLayoutEffect } from "react";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, Type, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { gerarComplementoCapitulo } from "@/lib/capitulo-ai.functions";
import { resumoLivroQueryOptions } from "@/lib/resumos-queries";
import { normalizarTitulo } from "@/lib/titulo";
import { useFontScale } from "@/hooks/use-font-scale";

export const Route = createFileRoute("/_app/resumos/capitulo/$livroId/$ordem")({
  head: ({ params }) => ({
    meta: [
      { title: `Capítulo ${params.ordem} · Resumo OAB` },
      { name: "description", content: `Capítulo ${params.ordem} do resumo com explicação, exemplo prático e termos jurídicos.` },
    ],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(resumoLivroQueryOptions(params.livroId)),
  component: CapituloView,
});

type Aba = "resumo" | "exemplo" | "termos";
const ABAS: { id: Aba; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "exemplo", label: "Exemplo" },
  { id: "termos", label: "Termos" },
];

function CapituloView() {
  const { livroId, ordem } = Route.useParams();
  const ordemNum = Number(ordem);
  const { scale, increase, decrease, canIncrease, canDecrease } = useFontScale();
  const gerarFn = useServerFn(gerarComplementoCapitulo);
  const { data } = useSuspenseQuery(resumoLivroQueryOptions(livroId));

  const [aba, setAba] = useState<Aba>("resumo");
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [pdfDialogAberto, setPdfDialogAberto] = useState(false);
  const [incluirExemplo, setIncluirExemplo] = useState(false);
  const [incluirTermos, setIncluirTermos] = useState(false);

  async function baixarPdf() {
    if (!data || !atual) return;
    setPdfDialogAberto(false);
    setGerandoPdf(true);
    const tid = toast.loading("Preparando seu PDF…");
    try {
      const [{ gerarPdfCapitulo }] = await Promise.all([import("@/lib/pdf-resumo")]);

      let exemplo: string | null = null;
      let termos: string | null = null;

      if (incluirExemplo) {
        toast.loading("Gerando exemplo prático…", { id: tid });
        const r = await gerarFn({
          data: { resumo_livro_id: livroId, ordem: ordemNum, tipo: "exemplo" },
        });
        exemplo = r.conteudo_markdown;
      }
      if (incluirTermos) {
        toast.loading("Gerando termos jurídicos…", { id: tid });
        const r = await gerarFn({
          data: { resumo_livro_id: livroId, ordem: ordemNum, tipo: "termos" },
        });
        termos = r.conteudo_markdown;
      }

      toast.loading("Montando PDF…", { id: tid });
      await gerarPdfCapitulo(
        { titulo: data.livro.titulo, autor: data.livro.autor },
        {
          ordem: atual.ordem,
          titulo: atual.titulo,
          conteudo_markdown: atual.conteudo_markdown,
        },
        data.capitulos.length,
        { exemplo, termos },
      );
      toast.success("PDF baixado!", { id: tid });
    } catch (e: any) {
      toast.error("Não foi possível gerar o PDF.", { id: tid, description: e?.message });
    } finally {
      setGerandoPdf(false);
    }
  }

  // reset para Resumo ao trocar de capítulo
  const ordemRef = useRef(ordemNum);
  if (ordemRef.current !== ordemNum) {
    ordemRef.current = ordemNum;
    if (aba !== "resumo") setAba("resumo");
  }

  const capitulos = data?.capitulos ?? [];
  const atual = useMemo(() => capitulos.find((c) => c.ordem === ordemNum), [capitulos, ordemNum]);
  const idx = atual ? capitulos.findIndex((c) => c.id === atual.id) : -1;
  const prev = idx > 0 ? capitulos[idx - 1] : null;
  const next = idx >= 0 && idx < capitulos.length - 1 ? capitulos[idx + 1] : null;

  const conteudoFormatado = useMemo(() => {
    let md = (atual?.conteudo_markdown ?? "").replace(/\r\n/g, "\n").trim();
    if (!md) return "";
    md = md.replace(/^#\s+.+\n+/, "");
    md = md.replace(
      /(^|\n)((?:Art(?:igo)?\.?\s*\d+[ºoO]?[^\n]{0,400}))(\n|$)/g,
      (_m, pre, frase, post) => `${pre}> ${frase}${post}`,
    );
    return md;
  }, [atual?.conteudo_markdown]);

  const complementoQuery = useQuery({
    queryKey: ["capitulo-ai", livroId, ordemNum, aba],
    queryFn: () =>
      gerarFn({
        data: {
          resumo_livro_id: livroId,
          ordem: ordemNum,
          tipo: aba as "exemplo" | "termos",
        },
      }),
    enabled: aba !== "resumo" && !!atual,
    staleTime: 1000 * 60 * 60,
    retry: 0,
  });



  if (!atual) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        Capítulo não encontrado.{" "}
        <Link to="/resumos/$livroId" params={{ livroId }} className="underline">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-3xl mx-auto">
      <header className="mb-6 pb-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Capítulo {atual.ordem} de {capitulos.length}
          </p>
          <h1 className="font-display text-2xl md:text-4xl leading-tight mt-1 break-words">
            {normalizarTitulo(atual.titulo)}
          </h1>
        </div>
        <div className="md:hidden flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={decrease}
            disabled={!canDecrease}
            aria-label="Diminuir fonte"
            className="h-8 w-8 grid place-items-center rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <Type className="h-3.5 w-3.5 text-muted-foreground" />
          <button
            type="button"
            onClick={increase}
            disabled={!canIncrease}
            aria-label="Aumentar fonte"
            className="h-8 w-8 grid place-items-center rounded-md border border-border bg-card hover:bg-accent disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <TabsSwitch aba={aba} setAba={setAba} />

      <div key={aba} className="animate-tab-fade">
        {aba === "resumo" && (
          <article
            className="markdown-body max-w-none"
            style={{ fontSize: `${scale}rem` }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {conteudoFormatado}
            </ReactMarkdown>
          </article>
        )}

        {aba !== "resumo" && (
          <ComplementoView
            isLoading={complementoQuery.isPending || complementoQuery.isFetching}
            error={complementoQuery.error as Error | null}
            content={complementoQuery.data?.conteudo_markdown ?? ""}
            scale={scale}
            tipo={aba}
            onRetry={() => complementoQuery.refetch()}
          />
        )}
      </div>

      {/* espaçador para o conteúdo não ficar atrás do rodapé fixo */}
      <div className="h-24" aria-hidden />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-md shadow-[0_-6px_22px_-10px_rgba(0,0,0,0.55)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-3xl mx-auto px-3 md:px-6 py-2.5 grid grid-cols-3 items-stretch gap-2">
          {prev ? (
            <Link
              to="/resumos/capitulo/$livroId/$ordem"
              params={{ livroId, ordem: String(prev.ordem) }}
              className="group flex items-center gap-2 rounded-xl border border-border bg-card/60 hover:border-gold/40 hover:bg-card transition px-3 py-2 min-w-0"
            >
              <ChevronLeft className="h-4 w-4 shrink-0 text-gold" />
              <span className="text-left min-w-0 hidden sm:block">
                <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Anterior</span>
                <span className="block text-xs font-display truncate text-foreground">{normalizarTitulo(prev.titulo)}</span>
              </span>
              <span className="sm:hidden text-[10px] uppercase tracking-wider text-muted-foreground">Anterior</span>
            </Link>
          ) : (
            <span aria-hidden />
          )}

          <button
            type="button"
            onClick={() => setPdfDialogAberto(true)}
            disabled={gerandoPdf}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gradient-toga text-gold font-display font-semibold text-xs uppercase tracking-wider px-3 py-2 hover:border-gold/70 hover:shadow-[0_4px_18px_-4px_oklch(0.78_0.13_80/0.6)] transition disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Baixar resumo em PDF"
          >
            {gerandoPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{gerandoPdf ? "Gerando…" : "Baixar PDF"}</span>
            <span className="sm:hidden">PDF</span>
          </button>

          {next ? (
            <Link
              to="/resumos/capitulo/$livroId/$ordem"
              params={{ livroId, ordem: String(next.ordem) }}
              className="group flex items-center gap-2 rounded-xl border border-border bg-card/60 hover:border-gold/40 hover:bg-card transition px-3 py-2 min-w-0 justify-end"
            >
              <span className="text-right min-w-0 hidden sm:block">
                <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Próximo</span>
                <span className="block text-xs font-display truncate text-foreground">{normalizarTitulo(next.titulo)}</span>
              </span>
              <span className="sm:hidden text-[10px] uppercase tracking-wider text-muted-foreground">Próximo</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gold" />
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </div>
      </nav>

      {pdfDialogAberto && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4 animate-tab-fade"
          onClick={() => setPdfDialogAberto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Opções de PDF"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-gold/30 bg-card shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] p-5"
          >
            <h2 className="font-display text-lg text-gold mb-1">Baixar PDF do capítulo</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Inclua complementos gerados por IA, se desejar.
            </p>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 cursor-pointer hover:border-gold/40 transition mb-2">
              <input
                type="checkbox"
                checked={incluirExemplo}
                onChange={(e) => setIncluirExemplo(e.target.checked)}
                className="mt-0.5 accent-[oklch(0.78_0.13_80)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-display font-semibold text-foreground">
                  Exemplo prático
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Situação concreta ilustrando o capítulo.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 cursor-pointer hover:border-gold/40 transition mb-5">
              <input
                type="checkbox"
                checked={incluirTermos}
                onChange={(e) => setIncluirTermos(e.target.checked)}
                className="mt-0.5 accent-[oklch(0.78_0.13_80)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-display font-semibold text-foreground">
                  Termos jurídicos
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  Glossário com 10 a 15 termos detalhados.
                </span>
              </span>
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPdfDialogAberto(false)}
                className="text-xs uppercase tracking-wider px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={baixarPdf}
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-display font-semibold px-4 py-2 rounded-lg border border-gold/50 bg-gradient-toga text-gold hover:border-gold/80 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Baixar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabsSwitch({ aba, setAba }: { aba: Aba; setAba: (a: Aba) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<Aba, HTMLButtonElement | null>>({
    resumo: null,
    exemplo: null,
    termos: null,
  });
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const btn = btnRefs.current[aba];
    const wrap = containerRef.current;
    if (!btn || !wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({ left: btnRect.left - wrapRect.left, width: btnRect.width });
  }, [aba]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Modo de leitura"
      className="relative mb-6 flex w-full items-center gap-1 rounded-full border border-border bg-card/60 p-1 backdrop-blur-sm"
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full bg-gradient-toga shadow-[0_4px_14px_-4px_oklch(0.78_0.13_80/0.55)] transition-[left,width] duration-300 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
      {ABAS.map((t) => {
        const active = aba === t.id;
        return (
          <button
            key={t.id}
            ref={(el) => {
              btnRefs.current[t.id] = el;
            }}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => setAba(t.id)}
            className={`relative z-10 flex-1 text-center px-3 py-1.5 text-xs md:text-sm font-display font-semibold rounded-full transition-colors duration-200 ${
              active ? "text-gold" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function ComplementoView({
  isLoading,
  error,
  content,
  scale,
  tipo,
  onRetry,
}: {
  isLoading: boolean;
  error: Error | null;
  content: string;
  scale: number;
  tipo: "exemplo" | "termos";
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-gold" />
        <p className="text-sm">
          {tipo === "exemplo"
            ? "Gerando exemplo prático com IA…"
            : "Identificando termos jurídicos…"}
        </p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-10 text-center">
        <AlertCircle className="h-5 w-5 mx-auto mb-2 text-destructive" />
        <p className="text-sm text-muted-foreground mb-3">
          Não foi possível gerar agora.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs uppercase tracking-wider text-gold border border-gold/40 hover:bg-gold/10 rounded-full px-4 py-1.5"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  return (
    <article
      className="markdown-body max-w-none"
      style={{ fontSize: `${scale}rem` }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
