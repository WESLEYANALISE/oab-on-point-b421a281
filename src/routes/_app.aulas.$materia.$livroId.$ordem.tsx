import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useLayoutEffect, useRef } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RotateCcw,
  XCircle,
  Notebook,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { resumoLivroQueryOptions } from "@/lib/resumos-queries";
import { normalizarTitulo } from "@/lib/titulo";
import { getMateriaAula } from "@/data/aulas-oab";
import {
  obterFlashcardsCapitulo,
  obterQuestoesCapitulo,
  registrarRespostaCapitulo,
} from "@/lib/aulas-trilha.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/aulas/$materia/$livroId/$ordem")({
  loader: ({ context, params }) => {
    const mat = getMateriaAula(params.materia);
    if (!mat) throw notFound();
    context.queryClient.ensureQueryData(resumoLivroQueryOptions(params.livroId));
    return { materia: mat };
  },
  component: AulaCapitulo,
  notFoundComponent: () => <div className="p-8">Não encontrado.</div>,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">{error.message}</div>
  ),
});

type Aba = "ler" | "flashcards" | "questoes";
const ABAS: { id: Aba; label: string }[] = [
  { id: "ler", label: "Ler" },
  { id: "flashcards", label: "Flashcards" },
  { id: "questoes", label: "Questões" },
];

function AulaCapitulo() {
  const { materia, livroId, ordem } = Route.useParams();
  const { materia: mat } = Route.useLoaderData();
  const ordemNum = Number(ordem);
  const { data } = useSuspenseQuery(resumoLivroQueryOptions(livroId));

  const [aba, setAba] = useState<Aba>("ler");
  const capitulos = data?.capitulos ?? [];
  const atual = useMemo(
    () => capitulos.find((c) => c.ordem === ordemNum),
    [capitulos, ordemNum],
  );
  const idx = atual ? capitulos.findIndex((c) => c.id === atual.id) : -1;
  const prev = idx > 0 ? capitulos[idx - 1] : null;
  const next = idx >= 0 && idx < capitulos.length - 1 ? capitulos[idx + 1] : null;

  if (!atual) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        Aula não encontrada.{" "}
        <Link
          to="/aulas/$materia/$livroId"
          params={{ materia, livroId }}
          className="underline"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-28">
      <header
        className={cn(
          "relative px-4 md:px-8 pt-4 pb-5 bg-gradient-to-br text-primary-foreground",
          mat.cor,
        )}
      >
        <Link
          to="/aulas/$materia/$livroId"
          params={{ materia, livroId }}
          className="inline-flex items-center gap-1.5 text-[12px] text-white/85 hover:text-white mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/70">
          {mat.nome} · Aula {atual.ordem} de {capitulos.length}
        </p>
        <h1 className="font-display text-xl md:text-2xl leading-tight mt-1">
          {normalizarTitulo(atual.titulo)}
        </h1>
      </header>

      <div className="px-4 md:px-8 max-w-3xl mx-auto pt-4">
        <TabsSwitch aba={aba} setAba={setAba} />

        <div key={aba} className="animate-tab-fade">
          {aba === "ler" && (
            <article className="markdown-body max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {atual.conteudo_markdown ?? ""}
              </ReactMarkdown>
            </article>
          )}
          {aba === "flashcards" && (
            <FlashcardsView livroId={livroId} ordem={ordemNum} />
          )}
          {aba === "questoes" && (
            <QuestoesView livroId={livroId} ordem={ordemNum} />
          )}
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-3xl mx-auto px-3 py-2.5 grid grid-cols-3 gap-2">
          {prev ? (
            <Link
              to="/aulas/$materia/$livroId/$ordem"
              params={{ materia, livroId, ordem: String(prev.ordem) }}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/60 hover:border-gold/40 transition px-3 py-2 min-w-0"
            >
              <ChevronLeft className="h-4 w-4 text-gold shrink-0" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Anterior
              </span>
            </Link>
          ) : (
            <span />
          )}
          <Link
            to="/caderno-erros"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-gold/40 bg-gradient-toga text-gold font-display font-semibold text-xs uppercase tracking-wider px-3 py-2"
          >
            <Notebook className="h-4 w-4" />
            <span className="hidden sm:inline">Caderno</span>
          </Link>
          {next ? (
            <Link
              to="/aulas/$materia/$livroId/$ordem"
              params={{ materia, livroId, ordem: String(next.ordem) }}
              className="flex items-center justify-end gap-2 rounded-xl border border-border bg-card/60 hover:border-gold/40 transition px-3 py-2 min-w-0"
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Próxima
              </span>
              <ChevronRight className="h-4 w-4 text-gold shrink-0" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </nav>
    </div>
  );
}

// ------------ Tabs ------------
function TabsSwitch({ aba, setAba }: { aba: Aba; setAba: (a: Aba) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<Aba, HTMLButtonElement | null>>({
    ler: null,
    flashcards: null,
    questoes: null,
  });
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    const btn = btnRefs.current[aba];
    const wrap = containerRef.current;
    if (!btn || !wrap) return;
    const w = wrap.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setIndicator({ left: b.left - w.left, width: b.width });
  }, [aba]);
  return (
    <div
      ref={containerRef}
      role="tablist"
      className="relative mb-5 flex w-full items-center gap-1 rounded-full border border-border bg-card/60 p-1"
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full bg-gradient-toga transition-[left,width] duration-300 ease-out"
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
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setAba(t.id)}
            className={cn(
              "relative z-10 flex-1 text-center px-3 py-1.5 text-xs md:text-sm font-display font-semibold rounded-full transition-colors",
              active ? "text-gold" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ------------ Flashcards ------------
function FlashcardsView({ livroId, ordem }: { livroId: string; ordem: number }) {
  const fn = useServerFn(obterFlashcardsCapitulo);
  const q = useQuery({
    queryKey: ["aula-fc", livroId, ordem],
    queryFn: () => fn({ data: { resumo_livro_id: livroId, ordem } }),
    staleTime: 60 * 60_000,
    retry: 0,
  });
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);

  if (q.isPending) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-gold" />
        <p className="text-sm">Gerando flashcards…</p>
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Não foi possível gerar agora.
        </p>
        <button
          type="button"
          onClick={() => q.refetch()}
          className="text-xs uppercase tracking-wider text-gold border border-gold/40 rounded-full px-4 py-1.5"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  const cards = q.data?.cards ?? [];
  if (!cards.length) return null;
  const card = cards[i];

  return (
    <div className="py-2">
      <div className="text-[11px] text-muted-foreground text-center mb-3">
        {i + 1} de {cards.length}
      </div>
      <button
        type="button"
        onClick={() => setFlip((f) => !f)}
        className="w-full min-h-[220px] rounded-2xl border border-gold/30 bg-gradient-to-br from-[oklch(0.28_0.07_18)] to-[oklch(0.19_0.04_18)] p-6 text-left hover:border-gold/60 transition shadow-lg shadow-black/30"
      >
        <p className="text-[10px] uppercase tracking-wider text-gold/80 mb-2">
          {flip ? "Resposta" : "Pergunta"}
        </p>
        <p className="text-base md:text-lg text-primary-foreground leading-relaxed whitespace-pre-wrap">
          {flip ? card.verso : card.frente}
        </p>
        <p className="text-[10px] text-white/40 mt-4">Tocar para virar</p>
      </button>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => {
            setFlip(false);
            setI((v) => Math.max(0, v - 1));
          }}
          className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30 px-3 py-2"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <button
          type="button"
          onClick={() => {
            setFlip(false);
            setI(0);
          }}
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground px-3 py-2 inline-flex items-center gap-1"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Recomeçar
        </button>
        <button
          type="button"
          disabled={i >= cards.length - 1}
          onClick={() => {
            setFlip(false);
            setI((v) => Math.min(cards.length - 1, v + 1));
          }}
          className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30 px-3 py-2"
        >
          Próximo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ------------ Questões ------------
type Resp = { escolha: string; correta: string; acertou: boolean; just: string };

function QuestoesView({ livroId, ordem }: { livroId: string; ordem: number }) {
  const fnQ = useServerFn(obterQuestoesCapitulo);
  const fnR = useServerFn(registrarRespostaCapitulo);
  const q = useQuery({
    queryKey: ["aula-q", livroId, ordem],
    queryFn: () => fnQ({ data: { resumo_livro_id: livroId, ordem } }),
    staleTime: 60 * 60_000,
    retry: 0,
  });
  const [i, setI] = useState(0);
  const [respostas, setRespostas] = useState<Record<number, Resp>>({});
  const [submitting, setSubmitting] = useState(false);

  if (q.isPending) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-gold" />
        <p className="text-sm">Gerando questões…</p>
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Não foi possível gerar agora.
        </p>
        <button
          type="button"
          onClick={() => q.refetch()}
          className="text-xs uppercase tracking-wider text-gold border border-gold/40 rounded-full px-4 py-1.5"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
  const questoes = q.data?.questoes ?? [];
  if (!questoes.length) return null;

  const total = questoes.length;
  const concluiu = Object.keys(respostas).length === total;
  const acertos = Object.values(respostas).filter((r) => r.acertou).length;
  const atual = questoes[i];
  const respAtual = respostas[i];

  async function responder(letra: string) {
    if (respAtual || submitting) return;
    setSubmitting(true);
    try {
      const r = await fnR({
        data: {
          resumo_livro_id: livroId,
          ordem,
          questao_idx: i,
          alternativa_escolhida: letra,
        },
      });
      setRespostas((p) => ({
        ...p,
        [i]: {
          escolha: letra,
          correta: r.correta,
          acertou: r.acertou,
          just: r.justificativa,
        },
      }));
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  if (concluiu && i >= total) {
    return (
      <div className="py-10 text-center">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Resultado
        </p>
        <p className="font-display text-4xl text-gold mt-2">
          {acertos}/{total}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {acertos === total
            ? "Perfeito!"
            : `${total - acertos} questões foram para o caderno de erros.`}
        </p>
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            type="button"
            onClick={() => {
              setRespostas({});
              setI(0);
            }}
            className="text-xs uppercase tracking-wider border border-border rounded-full px-4 py-2 hover:border-gold/40"
          >
            Refazer
          </button>
          <Link
            to="/caderno-erros"
            className="text-xs uppercase tracking-wider border border-gold/40 bg-gradient-toga text-gold rounded-full px-4 py-2"
          >
            Ver caderno
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="text-[11px] text-muted-foreground text-center mb-3">
        Questão {i + 1} de {total}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 mb-3">
        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">
          {atual.enunciado}
        </p>
      </div>
      <ul className="space-y-2">
        {(["A", "B", "C", "D", "E"] as const).map((letra) => {
          const texto = (atual.alternativas as any)[letra];
          if (!texto) return null;
          const isEscolhida = respAtual?.escolha === letra;
          const isCorreta = respAtual && letra === respAtual.correta;
          const isErrada = isEscolhida && !respAtual?.acertou;
          return (
            <li key={letra}>
              <button
                type="button"
                disabled={!!respAtual || submitting}
                onClick={() => responder(letra)}
                className={cn(
                  "w-full text-left rounded-xl border p-3 flex gap-3 items-start transition",
                  !respAtual && "border-border hover:border-gold/40 hover:bg-card",
                  isCorreta && "border-emerald-500/60 bg-emerald-500/10",
                  isErrada && "border-destructive/60 bg-destructive/10",
                  respAtual && !isCorreta && !isEscolhida && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "h-7 w-7 rounded-full grid place-items-center text-xs font-display font-bold shrink-0 border",
                    isCorreta && "bg-emerald-500 text-white border-emerald-500",
                    isErrada && "bg-destructive text-white border-destructive",
                    !respAtual && "border-border text-muted-foreground",
                  )}
                >
                  {letra}
                </span>
                <span className="text-sm leading-snug">{texto}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {respAtual && (
        <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-[11px] uppercase tracking-wider mb-1 inline-flex items-center gap-1">
            {respAtual.acertou ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Acertou
              </>
            ) : (
              <>
                <XCircle className="h-3.5 w-3.5 text-destructive" /> Errou — gabarito{" "}
                {respAtual.correta}
              </>
            )}
          </p>
          <p className="text-sm leading-relaxed">{respAtual.just}</p>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => setI((v) => Math.max(0, v - 1))}
          className="text-xs uppercase tracking-wider text-muted-foreground disabled:opacity-30 inline-flex items-center gap-1 px-3 py-2"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <button
          type="button"
          disabled={!respAtual}
          onClick={() => setI((v) => v + 1)}
          className="text-xs uppercase tracking-wider inline-flex items-center gap-1 px-4 py-2 rounded-full border border-gold/40 bg-gradient-toga text-gold disabled:opacity-30"
        >
          {i === total - 1 ? "Finalizar" : "Próxima"}{" "}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
