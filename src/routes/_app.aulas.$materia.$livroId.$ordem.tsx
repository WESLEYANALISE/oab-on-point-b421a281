import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  Loader2,
  Notebook,
  RotateCcw,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { resumoLivroQueryOptions } from "@/lib/resumos-queries";
import { normalizarTitulo } from "@/lib/titulo";
import { getMateriaAula } from "@/data/aulas-oab";
import {
  gerarAulaCapitulo,
  listarCadernoErros,
  obterFlashcardsCapitulo,
  obterQuestoesCapitulo,
  obterSimuladoCapitulo,
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

type Etapa = "ler" | "flashcards" | "questoes" | "erros" | "simulado";
const ETAPAS: { id: Etapa; label: string; icon: LucideIcon }[] = [
  { id: "ler", label: "Aula", icon: BookOpen },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "questoes", label: "Questões", icon: CheckCircle2 },
  { id: "erros", label: "Erros", icon: Notebook },
  { id: "simulado", label: "Simulado", icon: GraduationCap },
];

function AulaCapitulo() {
  const { materia, livroId, ordem } = Route.useParams();
  const { materia: mat } = Route.useLoaderData();
  const ordemNum = Number(ordem);
  const { data } = useSuspenseQuery(resumoLivroQueryOptions(livroId));

  const [etapa, setEtapa] = useState<Etapa>("ler");
  const [feitas, setFeitas] = useState<Record<Etapa, boolean>>({
    ler: false,
    flashcards: false,
    questoes: false,
    erros: false,
    simulado: false,
  });
  const marcarFeita = (e: Etapa) => setFeitas((p) => ({ ...p, [e]: true }));

  // estado das partes da aula (controlado aqui para o header mostrar)
  const [parteIdx, setParteIdx] = useState(0);
  const [totalPartes, setTotalPartes] = useState(0);
  const [parteTitulo, setParteTitulo] = useState<string>("");

  const capitulos = data?.capitulos ?? [];
  const atual = useMemo(
    () => capitulos.find((c) => c.ordem === ordemNum),
    [capitulos, ordemNum],
  );
  const idx = atual ? capitulos.findIndex((c) => c.id === atual.id) : -1;
  const prev = idx > 0 ? capitulos[idx - 1] : null;
  const next = idx >= 0 && idx < capitulos.length - 1 ? capitulos[idx + 1] : null;

  const etapaAtual = ETAPAS.find((e) => e.id === etapa)!;
  const EtapaIcon = etapaAtual.icon;

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
    <div className="pb-36">
      {/* HEADER */}
      <header className="relative px-4 md:px-8 pt-5 pb-5 overflow-hidden border-b border-border bg-card/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, var(--gold) 14%, transparent), transparent 70%), radial-gradient(50% 60% at 100% 100%, color-mix(in oklab, var(--gold) 8%, transparent), transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80">
            {mat.nome} · Aula {atual.ordem} de {capitulos.length}
          </p>
          <h1 className="font-display leading-[1.15] mt-1 text-foreground text-[clamp(1rem,4.4vw,1.5rem)] max-w-[34ch] break-words hyphens-auto">
            {normalizarTitulo(atual.titulo)}
          </h1>

          {etapa === "ler" && totalPartes > 0 ? (
            <PartesHeader
              total={totalPartes}
              atual={parteIdx}
              tituloParte={parteTitulo}
              onPick={(i) => setParteIdx(i)}
            />
          ) : (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1">
              <EtapaIcon className="h-3.5 w-3.5 text-gold" />
              <span className="text-[11px] uppercase tracking-wider text-gold font-semibold">
                {etapaAtual.label}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="px-4 md:px-8 max-w-3xl mx-auto pt-5">
        <div key={etapa} className="animate-tab-fade">
          {etapa === "ler" && (
            <AulaLerView
              livroId={livroId}
              ordem={ordemNum}
              parteIdx={parteIdx}
              onParteIdx={setParteIdx}
              onMeta={(total, titulo) => {
                setTotalPartes(total);
                setParteTitulo(titulo);
              }}
              onConcluir={() => {
                marcarFeita("ler");
                setEtapa("flashcards");
              }}
            />
          )}
          {etapa === "flashcards" && (
            <FlashcardsView
              livroId={livroId}
              ordem={ordemNum}
              onConcluir={() => {
                marcarFeita("flashcards");
                setEtapa("questoes");
              }}
            />
          )}
          {etapa === "questoes" && (
            <QuestoesView
              livroId={livroId}
              ordem={ordemNum}
              onConcluir={() => {
                marcarFeita("questoes");
                setEtapa("erros");
              }}
            />
          )}
          {etapa === "erros" && (
            <ErrosCapituloView
              livroId={livroId}
              ordem={ordemNum}
              onConcluir={() => {
                marcarFeita("erros");
                setEtapa("simulado");
              }}
            />
          )}
          {etapa === "simulado" && (
            <SimuladoView
              livroId={livroId}
              ordem={ordemNum}
              onConcluir={() => marcarFeita("simulado")}
            />
          )}
        </div>
      </div>

      {/* RODAPÉ */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-3xl mx-auto px-3 pt-2.5 pb-2">
          <EtapasFooter etapa={etapa} feitas={feitas} onPick={setEtapa} />
          <div className="mt-2 grid grid-cols-3 gap-2">
            {prev ? (
              <Link
                to="/aulas/$materia/$livroId/$ordem"
                params={{ materia, livroId, ordem: String(prev.ordem) }}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 hover:border-gold/40 transition px-2.5 py-1.5 min-w-0"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-gold shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  Anterior
                </span>
              </Link>
            ) : (
              <span />
            )}
            <Link
              to="/aulas/$materia/$livroId"
              params={{ materia, livroId }}
              className="flex items-center justify-center rounded-lg border border-border bg-card/60 hover:border-gold/40 text-[10px] uppercase tracking-wider text-muted-foreground px-2.5 py-1.5"
            >
              Trilha
            </Link>
            {next ? (
              <Link
                to="/aulas/$materia/$livroId/$ordem"
                params={{ materia, livroId, ordem: String(next.ordem) }}
                className="flex items-center justify-end gap-1.5 rounded-lg border border-border bg-card/60 hover:border-gold/40 transition px-2.5 py-1.5 min-w-0"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  Próxima
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

// ------------ Header das partes ------------
function PartesHeader({
  total,
  atual,
  tituloParte,
  onPick,
}: {
  total: number;
  atual: number;
  tituloParte: string;
  onPick: (i: number) => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gold font-semibold">
          {atual === 0 ? "Introdução" : `Parte ${atual} de ${total - 1}`}
        </span>
        <span className="text-[10px] text-muted-foreground truncate ml-2 max-w-[60%] text-right">
          {tituloParte}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const done = i < atual;
          const active = i === atual;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              aria-label={`Ir para parte ${i}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                done && "bg-gold",
                active && "bg-gold/80 step-walker",
                !done && !active && "bg-border/70 hover:bg-border",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// ------------ Rodapé de etapas ------------
function EtapasFooter({
  etapa,
  feitas,
  onPick,
}: {
  etapa: Etapa;
  feitas: Record<Etapa, boolean>;
  onPick: (e: Etapa) => void;
}) {
  const atualIdx = ETAPAS.findIndex((e) => e.id === etapa);
  return (
    <ol className="grid grid-cols-5 gap-1">
      {ETAPAS.map((e, i) => {
        const Icon = e.icon;
        const done = feitas[e.id];
        const active = i === atualIdx;
        const isNext = i === atualIdx + 1;
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onPick(e.id)}
              className={cn(
                "w-full flex flex-col items-center gap-1 py-1.5 rounded-lg transition",
                active && "bg-gold/10",
              )}
              aria-current={active ? "step" : undefined}
            >
              <span
                className={cn(
                  "h-8 w-8 rounded-full grid place-items-center border-2 transition-all duration-300",
                  done && "bg-gold border-gold text-background",
                  !done && active && "border-gold bg-background text-gold scale-110",
                  !done && !active && !isNext && "border-border bg-background text-muted-foreground",
                  !done && isNext && "border-gold/40 bg-background text-gold/80 step-next-hint",
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span
                className={cn(
                  "text-[9px] uppercase tracking-wider leading-none",
                  active ? "text-gold font-semibold" : done ? "text-foreground/80" : "text-muted-foreground",
                )}
              >
                {e.label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ------------ Aula estruturada (aba "Aula") ------------
function AulaLerView({
  livroId,
  ordem,
  parteIdx,
  onParteIdx,
  onMeta,
  onConcluir,
}: {
  livroId: string;
  ordem: number;
  parteIdx: number;
  onParteIdx: (i: number) => void;
  onMeta: (total: number, titulo: string) => void;
  onConcluir: () => void;
}) {
  const fn = useServerFn(gerarAulaCapitulo);
  const q = useQuery({
    queryKey: ["aula-estruturada", livroId, ordem],
    queryFn: () => fn({ data: { resumo_livro_id: livroId, ordem } }),
    staleTime: 60 * 60_000,
    retry: 0,
  });
  const [verExemplo, setVerExemplo] = useState(false);

  const aula = q.data?.aula;
  const total = aula ? aula.partes.length + 1 : 0;
  const tituloAtual = useMemo(() => {
    if (!aula) return "";
    if (parteIdx === 0) return "Vamos começar";
    return aula.partes[parteIdx - 1]?.titulo ?? "";
  }, [aula, parteIdx]);

  useEffect(() => {
    if (total > 0) onMeta(total, tituloAtual);
  }, [total, tituloAtual, onMeta]);

  if (q.isPending) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3 text-gold" />
        <p className="text-sm">Preparando sua aula…</p>
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          Pode levar alguns segundos na primeira vez.
        </p>
      </div>
    );
  }
  if (q.error || !aula) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Não foi possível gerar a aula agora.
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

  const ehIntro = parteIdx === 0;
  const parte = ehIntro ? null : aula.partes[parteIdx - 1];
  const ultimaParte = parteIdx === total - 1;
  const ehFechamento = ultimaParte && !!aula.fechamento;

  const irPara = (i: number) => {
    setVerExemplo(false);
    onParteIdx(Math.max(0, Math.min(total - 1, i)));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div key={parteIdx} className="animate-tab-fade py-2">
      {ehIntro ? (
        <div className="rounded-2xl border border-gold/30 bg-gradient-toga p-6 shadow-lg shadow-black/20">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-background/60 px-3 py-1 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-[10px] uppercase tracking-wider text-gold font-semibold">
              Bem-vindo(a) à aula
            </span>
          </div>
          <p className="text-base md:text-lg leading-relaxed text-foreground whitespace-pre-wrap">
            {aula.introducao}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-5">
            {aula.partes.length} {aula.partes.length === 1 ? "parte" : "partes"} pela frente
          </p>
        </div>
      ) : (
        <article className="space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-semibold">
              Parte {parteIdx} de {aula.partes.length}
            </p>
            <h2 className="font-display text-xl md:text-2xl mt-1 leading-tight text-foreground">
              {parte!.titulo}
            </h2>
            {parte!.resumo_curto && (
              <p className="text-sm text-muted-foreground mt-1.5 italic">
                {parte!.resumo_curto}
              </p>
            )}
          </div>

          <div className="markdown-body max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
              {parte!.conteudo_markdown}
            </ReactMarkdown>
          </div>

          {parte!.exemplo_pratico && (
            <div>
              {!verExemplo ? (
                <button
                  type="button"
                  onClick={() => setVerExemplo(true)}
                  className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gold border border-gold/40 rounded-full px-3.5 py-1.5 hover:bg-gold/10 transition"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Ver exemplo prático
                </button>
              ) : (
                <div className="animate-fade-in rounded-xl border-l-2 border-gold bg-muted/30 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-gold/80 mb-1.5">
                    Exemplo prático
                  </p>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {parte!.exemplo_pratico}
                  </p>
                </div>
              )}
            </div>
          )}

          {parte!.pontos_chave && parte!.pontos_chave.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gold mb-2 inline-flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Pontos-chave
              </p>
              <ul className="space-y-1.5">
                {parte!.pontos_chave.map((b, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/90 leading-snug">
                    <span className="text-gold mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ehFechamento && (
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gold mb-1.5">
                Fechamento
              </p>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {aula.fechamento}
              </p>
            </div>
          )}
        </article>
      )}

      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={parteIdx === 0}
          onClick={() => irPara(parteIdx - 1)}
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30 inline-flex items-center gap-1.5 px-3 py-2"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        {ultimaParte ? (
          <button
            type="button"
            onClick={onConcluir}
            className="text-xs uppercase tracking-wider inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-gold/40 bg-gradient-toga text-gold"
          >
            <CheckCircle2 className="h-4 w-4" /> Concluir → Flashcards
          </button>
        ) : (
          <button
            type="button"
            onClick={() => irPara(parteIdx + 1)}
            className="text-xs uppercase tracking-wider inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gold/40 bg-gradient-toga text-gold"
          >
            {parteIdx === 0 ? "Começar" : "Próxima parte"} <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function EtapaConcluirCta({
  onConcluir,
  label,
}: {
  onConcluir: () => void;
  label: string;
}) {
  return (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={onConcluir}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-wider px-5 py-2.5 rounded-full border border-gold/40 bg-gradient-toga text-gold"
      >
        <CheckCircle2 className="h-4 w-4" /> {label}
      </button>
    </div>
  );
}


// ------------ Flashcards ------------
function FlashcardsView({
  livroId,
  ordem,
  onConcluir,
}: {
  livroId: string;
  ordem: number;
  onConcluir: () => void;
}) {
  const fn = useServerFn(obterFlashcardsCapitulo);
  const q = useQuery({
    queryKey: ["aula-fc", livroId, ordem],
    queryFn: () => fn({ data: { resumo_livro_id: livroId, ordem } }),
    staleTime: 60 * 60_000,
    retry: 0,
  });
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [verExemplo, setVerExemplo] = useState(false);

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
  const ultimo = i >= cards.length - 1;

  return (
    <div className="py-2">
      <div className="text-[11px] text-muted-foreground text-center mb-3">
        {i + 1} de {cards.length}
      </div>

      <div className="flip-perspective">
        <div
          className={cn(
            "flip-card relative w-full min-h-[260px] rounded-2xl",
            flip && "is-flipped",
          )}
        >
          {/* Frente */}
          <button
            type="button"
            onClick={() => setFlip(true)}
            aria-label="Virar para a resposta"
            className="flip-face w-full min-h-[260px] rounded-2xl border border-border bg-card p-6 text-left shadow-lg shadow-black/20 hover:border-gold/50 transition-colors flex flex-col"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold/80 mb-3">
              Pergunta
            </p>
            <p className="text-base md:text-lg text-foreground leading-relaxed whitespace-pre-wrap flex-1">
              {card.frente}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-4 inline-flex items-center gap-1.5">
              <RotateCcw className="h-3 w-3" /> Tocar para virar
            </p>
          </button>

          {/* Verso — toque em qualquer lugar vira de volta */}
          <div
            role="button"
            tabIndex={flip ? 0 : -1}
            aria-label="Virar para a pergunta"
            onClick={() => {
              setFlip(false);
              setVerExemplo(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setFlip(false);
                setVerExemplo(false);
              }
            }}
            className="flip-face flip-face--back w-full min-h-[260px] rounded-2xl border border-gold/40 bg-card p-6 text-left shadow-lg shadow-black/30 flex flex-col cursor-pointer hover:border-gold/60 transition-colors"
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-gold mb-3">
              Resposta
            </p>
            <p className="text-base md:text-lg text-foreground leading-relaxed whitespace-pre-wrap">
              {card.verso}
            </p>

            {card.exemplo && (
              <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                {!verExemplo ? (
                  <button
                    type="button"
                    onClick={() => setVerExemplo(true)}
                    className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-gold border border-gold/40 rounded-full px-3 py-1.5 hover:bg-gold/10 transition"
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Ver exemplo
                  </button>
                ) : (
                  <div className="animate-fade-in rounded-xl border-l-2 border-gold bg-muted/30 px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-gold/80 mb-1">
                      Exemplo prático
                    </p>
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {card.exemplo}
                    </p>
                  </div>
                )}
              </div>
            )}

            <p className="mt-auto pt-3 text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
              <RotateCcw className="h-3 w-3" /> Tocar para virar
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={i === 0}
          onClick={() => {
            setFlip(false);
            setVerExemplo(false);
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
            setVerExemplo(false);
            setI(0);
          }}
          className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground px-3 py-2 inline-flex items-center gap-1"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Recomeçar
        </button>
        <button
          type="button"
          disabled={ultimo}
          onClick={() => {
            setFlip(false);
            setVerExemplo(false);
            setI((v) => Math.min(cards.length - 1, v + 1));
          }}
          className="flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-30 px-3 py-2"
        >
          Próximo <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      {ultimo && (
        <EtapaConcluirCta onConcluir={onConcluir} label="Ir para questões" />
      )}
    </div>
  );
}

// ------------ Questões ------------
type Resp = { escolha: string; correta: string; acertou: boolean; just: string };

function QuestoesView({
  livroId,
  ordem,
  onConcluir,
}: {
  livroId: string;
  ordem: number;
  onConcluir: () => void;
}) {
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
  const [finalizado, setFinalizado] = useState(false);

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

  if (finalizado) {
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
        <div className="flex flex-col items-center gap-2 mt-5">
          <button
            type="button"
            onClick={() => {
              setRespostas({});
              setI(0);
              setFinalizado(false);
            }}
            className="text-xs uppercase tracking-wider border border-border rounded-full px-4 py-2 hover:border-gold/40"
          >
            Refazer
          </button>
          <EtapaConcluirCta onConcluir={onConcluir} label="Ver caderno de erros" />
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
          onClick={() => {
            if (i === total - 1) setFinalizado(true);
            else setI((v) => v + 1);
          }}
          className="text-xs uppercase tracking-wider inline-flex items-center gap-1 px-4 py-2 rounded-full border border-gold/40 bg-gradient-toga text-gold disabled:opacity-30"
        >
          {i === total - 1 ? "Finalizar" : "Próxima"}{" "}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ------------ Caderno de Erros (do capítulo) ------------
function ErrosCapituloView({
  livroId,
  ordem,
  onConcluir,
}: {
  livroId: string;
  ordem: number;
  onConcluir: () => void;
}) {
  const fn = useServerFn(listarCadernoErros);
  const q = useQuery({
    queryKey: ["caderno-erros-capitulo", livroId, ordem],
    queryFn: () => fn(),
    staleTime: 30_000,
  });

  if (q.isPending) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-gold" />
        <p className="text-sm">Carregando erros…</p>
      </div>
    );
  }
  if (q.error) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Não foi possível carregar.
      </div>
    );
  }

  const erros = (q.data?.erros ?? []).filter(
    (e) => e.resumo_livro_id === livroId && e.ordem === ordem,
  );

  if (!erros.length) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Sem erros neste capítulo. Boa!
        </p>
        <EtapaConcluirCta onConcluir={onConcluir} label="Ir para o simulado" />
      </div>
    );
  }

  return (
    <div className="py-2 space-y-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {erros.length} questão(ões) errada(s) deste capítulo
      </p>
      {erros.map((e) => {
        const alts = (e.alternativas_snapshot ?? {}) as Record<string, string>;
        return (
          <div key={e.id} className="rounded-2xl border border-destructive/30 bg-card p-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">
              {e.enunciado_snapshot}
            </p>
            <ul className="space-y-1.5 mb-3">
              {(["A", "B", "C", "D", "E"] as const).map((l) => {
                const t = alts[l];
                if (!t) return null;
                const correta = l === e.alternativa_correta;
                const escolhida = l === e.alternativa_escolhida;
                return (
                  <li
                    key={l}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm flex gap-2 items-start",
                      correta && "border-emerald-500/60 bg-emerald-500/10",
                      escolhida && !correta && "border-destructive/60 bg-destructive/10",
                      !correta && !escolhida && "border-border opacity-70",
                    )}
                  >
                    <span className="font-display font-bold text-xs">{l}.</span>
                    <span>{t}</span>
                  </li>
                );
              })}
            </ul>
            {e.justificativa_snapshot && (
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
                {e.justificativa_snapshot}
              </p>
            )}
          </div>
        );
      })}
      <EtapaConcluirCta onConcluir={onConcluir} label="Ir para o simulado" />
    </div>
  );
}

// ------------ Simulado ------------
function SimuladoView({
  livroId,
  ordem,
  onConcluir,
}: {
  livroId: string;
  ordem: number;
  onConcluir: () => void;
}) {
  const fn = useServerFn(obterSimuladoCapitulo);
  const q = useQuery({
    queryKey: ["aula-sim", livroId, ordem],
    queryFn: () => fn({ data: { resumo_livro_id: livroId, ordem } }),
    staleTime: 60 * 60_000,
    retry: 0,
  });
  const [iniciado, setIniciado] = useState(false);
  const [i, setI] = useState(0);
  const [escolhas, setEscolhas] = useState<Record<number, string>>({});
  const [finalizado, setFinalizado] = useState(false);

  if (q.isPending) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-gold" />
        <p className="text-sm">Gerando simulado…</p>
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

  if (!iniciado) {
    return (
      <div className="py-10 text-center">
        <GraduationCap className="h-10 w-10 text-gold mx-auto mb-3" />
        <p className="font-display text-lg mb-1">Simulado do capítulo</p>
        <p className="text-sm text-muted-foreground mb-5">
          {questoes.length} questões estilo OAB. Você vê o gabarito só no fim.
        </p>
        <button
          type="button"
          onClick={() => setIniciado(true)}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider px-5 py-2.5 rounded-full border border-gold/40 bg-gradient-toga text-gold"
        >
          Começar simulado
        </button>
      </div>
    );
  }

  const total = questoes.length;

  if (finalizado) {
    const acertos = questoes.reduce(
      (acc, q, idx) =>
        escolhas[idx] && escolhas[idx].toUpperCase() === q.correta ? acc + 1 : acc,
      0,
    );
    return (
      <div className="py-6">
        <div className="text-center mb-6">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Resultado do simulado
          </p>
          <p className="font-display text-5xl text-gold mt-2">
            {acertos}/{total}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {Math.round((acertos / total) * 100)}% de aproveitamento
          </p>
        </div>
        <div className="space-y-3">
          {questoes.map((qu, idx) => {
            const esc = escolhas[idx];
            const ok = esc?.toUpperCase() === qu.correta;
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border p-4",
                  ok ? "border-emerald-500/40 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5",
                )}
              >
                <p className="text-[10px] uppercase tracking-wider mb-1 inline-flex items-center gap-1">
                  {ok ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Acertou
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      Errou — sua: {esc ?? "—"} · gabarito: {qu.correta}
                    </>
                  )}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap mb-2">
                  {qu.enunciado}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">
                  {qu.justificativa}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEscolhas({});
              setI(0);
              setFinalizado(false);
            }}
            className="text-xs uppercase tracking-wider border border-border rounded-full px-4 py-2 hover:border-gold/40"
          >
            Refazer
          </button>
          <button
            type="button"
            onClick={onConcluir}
            className="text-xs uppercase tracking-wider px-4 py-2 rounded-full border border-gold/40 bg-gradient-toga text-gold inline-flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" /> Concluir aula
          </button>
        </div>
      </div>
    );
  }

  const atual = questoes[i];
  const escolhida = escolhas[i];

  return (
    <div className="py-2">
      <div className="text-[11px] text-muted-foreground text-center mb-3">
        Simulado · Questão {i + 1} de {total}
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
          const sel = escolhida === letra;
          return (
            <li key={letra}>
              <button
                type="button"
                onClick={() => setEscolhas((p) => ({ ...p, [i]: letra }))}
                className={cn(
                  "w-full text-left rounded-xl border p-3 flex gap-3 items-start transition",
                  sel ? "border-gold/60 bg-gold/5" : "border-border hover:border-gold/40",
                )}
              >
                <span
                  className={cn(
                    "h-7 w-7 rounded-full grid place-items-center text-xs font-display font-bold shrink-0 border",
                    sel ? "bg-gold text-background border-gold" : "border-border text-muted-foreground",
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
          disabled={!escolhida}
          onClick={() => {
            if (i === total - 1) setFinalizado(true);
            else setI((v) => v + 1);
          }}
          className="text-xs uppercase tracking-wider inline-flex items-center gap-1 px-4 py-2 rounded-full border border-gold/40 bg-gradient-toga text-gold disabled:opacity-30"
        >
          {i === total - 1 ? "Finalizar" : "Próxima"}{" "}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
