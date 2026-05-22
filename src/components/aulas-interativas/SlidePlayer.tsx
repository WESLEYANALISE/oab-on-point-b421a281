import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  CheckCircle2,
  MessageCircleQuestion,
  Lightbulb,
  AlertTriangle,
  Target,
  Sparkles,
  ArrowRight,
  Eye,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, useNavigate } from "@tanstack/react-router";
import type { SlideRow, QuizJson, ParTermo, DicaItem } from "@/lib/aulas-interativas.functions";

type Props = {
  slides: SlideRow[];
  tituloAula: string;
  voltarHref: string;
  proximaAulaHref?: string;
  proximaAulaTitulo?: string;
  slideInicial?: number;
  onProgresso?: (slideIdx: number, concluida: boolean) => void;
};

const TIPOS_INTERATIVOS = new Set(["ligar_termos"]);

export function SlidePlayer({
  slides,
  tituloAula,
  voltarHref,
  proximaAulaHref,
  proximaAulaTitulo,
  slideInicial = 0,
  onProgresso,
}: Props) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(Math.min(slideInicial, slides.length - 1));
  const [saindo, setSaindo] = useState<null | "proxima" | "concluir">(null);
  const [concluidos, setConcluidos] = useState<Set<string>>(new Set());
  const total = slides.length;
  const slide = slides[idx];

  const marcarConcluido = useCallback((id: string) => {
    setConcluidos((s) => {
      if (s.has(id)) return s;
      const n = new Set(s);
      n.add(id);
      return n;
    });
  }, []);

  const proximoBloqueado =
    !!slide && TIPOS_INTERATIVOS.has(slide.tipo) && !concluidos.has(slide.id);

  const proximo = useCallback(() => {
    if (proximoBloqueado) return;
    setIdx((i) => Math.min(total - 1, i + 1));
  }, [total, proximoBloqueado]);

  const anterior = useCallback(() => {
    setIdx((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    onProgresso?.(idx, idx === total - 1);
  }, [idx, total, onProgresso]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        proximo();
      }
      if (e.key === "ArrowLeft") anterior();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [proximo, anterior]);

  function irParaProximaAula() {
    if (!proximaAulaHref) return;
    setSaindo("proxima");
    setTimeout(() => navigate({ to: proximaAulaHref }), 480);
  }

  if (!slide) return null;
  const ehUltimo = idx === total - 1;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={false}
      animate={
        saindo === "proxima"
          ? { x: "-100%", opacity: 0 }
          : { x: 0, opacity: 1 }
      }
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 md:px-8 py-3 border-b border-border">
        <Link
          to={voltarHref}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-accent"
          aria-label="Sair da aula"
        >
          <X className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Aula interativa</p>
          <p className="font-display text-sm md:text-base truncate">{tituloAula}</p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {idx + 1} / {total}
        </p>
      </header>

      {/* Barra de progresso */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-gradient-gold transition-all duration-500"
          style={{ width: `${((idx + 1) / total) * 100}%` }}
        />
      </div>

      {/* Slide */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <SlideRenderer
              slide={slide}
              onResponderQuiz={proximo}
              onConcluir={() => marcarConcluido(slide.id)}
              proximaAulaHref={proximaAulaHref}
              proximaAulaTitulo={proximaAulaTitulo}
              onIrProximaAula={irParaProximaAula}
              voltarHref={voltarHref}
              ehUltimo={ehUltimo}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <footer className="border-t border-border px-4 md:px-8 py-3 flex items-center gap-3">
        <button
          onClick={anterior}
          disabled={idx === 0}
          className="h-11 w-11 rounded-full border border-border grid place-items-center disabled:opacity-30 hover:bg-accent"
          aria-label="Slide anterior"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Link
          to="/assistente"
          className="hidden md:inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <MessageCircleQuestion className="h-4 w-4" />
          Perguntar à Profa. Ana
        </Link>
        <div className="flex-1" />
        {ehUltimo ? (
          proximaAulaHref ? (
            <button
              onClick={irParaProximaAula}
              className="h-11 px-5 rounded-full bg-gradient-gold text-gold-foreground font-display text-sm inline-flex items-center gap-2 hover:opacity-95"
            >
              Próxima aula
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to={voltarHref}
              className="h-11 px-5 rounded-full bg-gradient-gold text-gold-foreground font-display text-sm inline-flex items-center gap-2 hover:opacity-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir curso
            </Link>
          )
        ) : (
          <button
            onClick={proximo}
            disabled={proximoBloqueado}
            className="h-11 px-5 rounded-full bg-gradient-toga text-primary-foreground font-display text-sm inline-flex items-center gap-2 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </motion.div>
  );
}

function MD({ children, className }: { children: string; className?: string }) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <>{children}</>,
          strong: ({ children }) => <strong className="text-gold font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-muted text-xs">{children}</code>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </span>
  );
}

function RamoMapa({ ramo }: { ramo: { titulo?: string; descricao?: string } }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-display text-base text-gold mb-1">{ramo.titulo}</h3>
      {ramo.descricao && <p className="text-sm text-muted-foreground leading-relaxed">{ramo.descricao}</p>}
    </div>
  );
}

function SlideRenderer({
  slide,
  onResponderQuiz,
  onConcluir,
  proximaAulaHref,
  proximaAulaTitulo,
  onIrProximaAula,
  voltarHref,
  ehUltimo,
}: {
  slide: SlideRow;
  onResponderQuiz: () => void;
  onConcluir: () => void;
  proximaAulaHref?: string;
  proximaAulaTitulo?: string;
  onIrProximaAula: () => void;
  voltarHref: string;
  ehUltimo: boolean;
}) {
  const c = slide.conteudo ?? {};
  const titulo = c.titulo ?? "";
  const objetivos = Array.isArray((c as any).objetivos) ? ((c as any).objetivos as string[]) : [];
  const bullets = Array.isArray(c.bullets) ? c.bullets : objetivos;

  if (slide.tipo === "quiz" && slide.quiz_json) {
    return <SlideQuiz quiz={slide.quiz_json} titulo={titulo} onAvancar={onResponderQuiz} />;
  }

  if (slide.tipo === "ligar_termos") {
    return <SlideLigarTermos titulo={titulo} pares={(c.pares ?? []) as ParTermo[]} onConcluir={onConcluir} />;
  }

  if (slide.tipo === "dicas") {
    return <SlideDicas titulo={titulo} dicas={(c.dicas ?? []) as DicaItem[]} />;
  }

  if (slide.tipo === "caso_pratico") {
    return (
      <SlideCasoPratico
        titulo={titulo}
        enunciado={(c.enunciado ?? c.texto ?? "") as string}
        pergunta={(c.pergunta ?? "") as string}
        analise={(c.analise ?? c.destaque ?? "") as string}
      />
    );
  }

  if (slide.tipo === "mapa_mental") {
    const pdfUrl = (c as any).pdf_url as string | undefined;
    const central = ((c as any).central ?? titulo) as string;
    const ramos = Array.isArray((c as any).ramos) ? ((c as any).ramos as { titulo?: string; descricao?: string }[]) : [];
    return (
      <div className="min-h-full px-4 md:px-8 py-6 flex flex-col">
        <p className="text-xs uppercase tracking-widest text-gold mb-2">Mapa mental</p>
        <h2 className="font-display text-2xl md:text-3xl mb-4">{titulo || "Mapa mental"}</h2>
        {pdfUrl ? (
          <div className="flex-1 min-h-[60vh] rounded-xl border border-border overflow-hidden bg-card">
            <object data={pdfUrl} type="application/pdf" className="w-full h-full min-h-[60vh]">
              <iframe src={pdfUrl} title={titulo} className="w-full h-full min-h-[60vh]" />
            </object>
          </div>
        ) : ramos.length > 0 ? (
          <div className="max-w-4xl mx-auto w-full flex-1 grid place-items-center py-4">
            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6 items-center w-full">
              <div className="space-y-3">
                {ramos.slice(0, 2).map((ramo, i) => <RamoMapa key={i} ramo={ramo} />)}
              </div>
              <div className="rounded-2xl border border-gold/40 bg-gold/10 px-6 py-5 text-center shadow-glow">
                <p className="font-display text-xl text-gold">{central}</p>
              </div>
              <div className="space-y-3">
                {ramos.slice(2, 4).map((ramo, i) => <RamoMapa key={i + 2} ramo={ramo} />)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Mapa não disponível.</p>
        )}
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center self-start gap-2 text-xs text-gold hover:underline"
          >
            Abrir em nova aba
          </a>
        )}
      </div>
    );
  }

  if (slide.tipo === "capa") {
    return (
      <div className="min-h-full grid place-items-center px-6 py-10">
        <div className="max-w-2xl text-center">
          <p className="text-xs uppercase tracking-widest text-gold mb-3">Aula interativa</p>
          <h1 className="font-display text-3xl md:text-5xl leading-tight mb-6">{titulo}</h1>
          {bullets.length > 0 && (
            <div className="mt-8 text-left bg-card border border-border rounded-2xl p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Ao final você saberá:
              </p>
              <ul className="space-y-2">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 text-gold mt-1 shrink-0" />
                    <MD>{b}</MD>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (slide.tipo === "comparativo" && c.colunas) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h2 className="font-display text-2xl md:text-3xl mb-6">{titulo}</h2>
        <div className={`grid gap-4 ${c.colunas.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
          {c.colunas.map((col, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-lg mb-3 text-gold">{col.titulo}</h3>
              <ul className="space-y-2">
                {col.itens.map((it, j) => (
                  <li key={j} className="text-sm flex items-start gap-2">
                    <span className="text-gold">•</span>
                    <MD>{it}</MD>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.tipo === "esquema" && c.bullets) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-xs uppercase tracking-widest text-gold mb-2">Esquema</p>
        <h2 className="font-display text-2xl md:text-3xl mb-6">{titulo}</h2>
        <ol className="space-y-3">
          {c.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              <span className="h-7 w-7 rounded-full bg-gradient-gold text-gold-foreground grid place-items-center text-sm font-display shrink-0">
                {i + 1}
              </span>
              <MD className="text-sm md:text-base">{b}</MD>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // conceito / exemplo / resumo / conclusao
  const ehConclusao = slide.tipo === "conclusao";
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {slide.tipo === "exemplo" && (
        <p className="text-xs uppercase tracking-widest text-gold mb-2">Exemplo prático</p>
      )}
      {slide.tipo === "resumo" && (
        <p className="text-xs uppercase tracking-widest text-gold mb-2">O que vimos</p>
      )}
      {ehConclusao && (
        <p className="text-xs uppercase tracking-widest text-gold mb-2">Conclusão</p>
      )}
      <h2 className="font-display text-2xl md:text-3xl mb-6">{titulo}</h2>

      {slide.imagem_url && (
        <img
          src={slide.imagem_url}
          alt=""
          className="rounded-xl border border-border w-full mb-6"
        />
      )}

      {c.texto && (
        <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-strong:text-gold">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.texto}</ReactMarkdown>
        </div>
      )}

      {c.bullets && c.bullets.length > 0 && (
        <ul className="mt-6 space-y-2">
          {c.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm md:text-base">
              <span className="text-gold mt-1">•</span>
              <MD>{b}</MD>
            </li>
          ))}
        </ul>
      )}

      {c.destaque && (
        <div className="mt-6 rounded-xl border-l-4 border-gold bg-gold/5 p-4 text-sm md:text-base">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.destaque}</ReactMarkdown>
        </div>
      )}

      {ehConclusao && ehUltimo && (
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          {proximaAulaHref ? (
            <button
              onClick={onIrProximaAula}
              className="h-12 px-6 rounded-full bg-gradient-gold text-gold-foreground font-display text-sm inline-flex items-center justify-center gap-2 hover:opacity-95"
            >
              Próxima aula
              {proximaAulaTitulo && (
                <span className="hidden sm:inline opacity-80 max-w-[14ch] truncate">
                  — {proximaAulaTitulo}
                </span>
              )}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              to={voltarHref}
              className="h-12 px-6 rounded-full bg-gradient-gold text-gold-foreground font-display text-sm inline-flex items-center justify-center gap-2 hover:opacity-95"
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir curso
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Slide: Ligar Termos
   ============================================================ */
function SlideLigarTermos({
  titulo,
  pares,
  onConcluir,
}: {
  titulo: string;
  pares: ParTermo[];
  onConcluir: () => void;
}) {
  const paresValidos = useMemo(
    () => (pares ?? []).filter((p) => p?.termo && p?.definicao).slice(0, 6),
    [pares],
  );

  const ordemTermos = useMemo(() => shuffle(paresValidos.map((_, i) => i)), [paresValidos]);
  const ordemDefs = useMemo(() => shuffle(paresValidos.map((_, i) => i)), [paresValidos]);

  const [termoSel, setTermoSel] = useState<number | null>(null);
  const [defSel, setDefSel] = useState<number | null>(null);
  const [acertados, setAcertados] = useState<Set<number>>(new Set());
  const [erro, setErro] = useState<{ termo: number; def: number } | null>(null);

  useEffect(() => {
    if (termoSel === null || defSel === null) return;
    if (termoSel === defSel) {
      setAcertados((s) => {
        const n = new Set(s);
        n.add(termoSel);
        return n;
      });
      setTermoSel(null);
      setDefSel(null);
    } else {
      setErro({ termo: termoSel, def: defSel });
      const t = setTimeout(() => {
        setErro(null);
        setTermoSel(null);
        setDefSel(null);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [termoSel, defSel]);

  useEffect(() => {
    if (paresValidos.length > 0 && acertados.size === paresValidos.length) {
      onConcluir();
    }
  }, [acertados.size, paresValidos.length, onConcluir]);

  if (paresValidos.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-muted-foreground">Atividade indisponível.</p>
      </div>
    );
  }

  const completo = acertados.size === paresValidos.length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-xs uppercase tracking-widest text-gold mb-2">Ligar termos</p>
      <h2 className="font-display text-2xl md:text-3xl mb-2">{titulo || "Associe termo e definição"}</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Toque em um <strong>termo</strong> e depois na sua <strong>definição</strong>.{" "}
        {acertados.size}/{paresValidos.length} acertos.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Termos</p>
          {ordemTermos.map((origIdx) => {
            const acertou = acertados.has(origIdx);
            const sel = termoSel === origIdx;
            const errou = erro?.termo === origIdx;
            return (
              <button
                key={origIdx}
                disabled={acertou}
                onClick={() => setTermoSel(origIdx)}
                className={`w-full text-left rounded-xl border p-3 text-sm transition-all ${
                  acertou
                    ? "border-emerald-500 bg-emerald-500/10 opacity-70"
                    : errou
                      ? "border-red-500 bg-red-500/10 animate-pulse"
                      : sel
                        ? "border-gold bg-gold/10"
                        : "border-border hover:bg-accent"
                }`}
              >
                <span className="font-display">{paresValidos[origIdx].termo}</span>
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Definições</p>
          {ordemDefs.map((origIdx) => {
            const acertou = acertados.has(origIdx);
            const sel = defSel === origIdx;
            const errou = erro?.def === origIdx;
            return (
              <button
                key={origIdx}
                disabled={acertou}
                onClick={() => setDefSel(origIdx)}
                className={`w-full text-left rounded-xl border p-3 text-sm transition-all ${
                  acertou
                    ? "border-emerald-500 bg-emerald-500/10 opacity-70"
                    : errou
                      ? "border-red-500 bg-red-500/10 animate-pulse"
                      : sel
                        ? "border-gold bg-gold/10"
                        : "border-border hover:bg-accent"
                }`}
              >
                <MD>{paresValidos[origIdx].definicao}</MD>
              </button>
            );
          })}
        </div>
      </div>

      {completo && (
        <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Tudo certo! Pode avançar.
        </div>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============================================================
   Slide: Dicas
   ============================================================ */
function SlideDicas({ titulo, dicas }: { titulo: string; dicas: DicaItem[] }) {
  const items = (dicas ?? []).filter((d) => d?.texto).slice(0, 6);
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-xs uppercase tracking-widest text-gold mb-2 inline-flex items-center gap-1">
        <Sparkles className="h-3.5 w-3.5" /> Dicas de prova
      </p>
      <h2 className="font-display text-2xl md:text-3xl mb-6">{titulo || "Antes do quiz, fixe isto"}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((d, i) => {
          const Icon =
            d.tipo === "atencao" ? AlertTriangle : d.tipo === "alvo" ? Target : d.tipo === "estrela" ? Sparkles : Lightbulb;
          const cor =
            d.tipo === "atencao"
              ? "text-amber-400 border-amber-500/30 bg-amber-500/5"
              : d.tipo === "alvo"
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5"
                : d.tipo === "estrela"
                  ? "text-fuchsia-400 border-fuchsia-500/30 bg-fuchsia-500/5"
                  : "text-gold border-gold/30 bg-gold/5";
          return (
            <div key={i} className={`rounded-xl border p-4 ${cor}`}>
              <Icon className="h-5 w-5 mb-2" />
              <div className="text-sm text-foreground leading-relaxed">
                <MD>{d.texto}</MD>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Slide: Caso Prático
   ============================================================ */
function SlideCasoPratico({
  titulo,
  enunciado,
  pergunta,
  analise,
}: {
  titulo: string;
  enunciado: string;
  pergunta: string;
  analise: string;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <p className="text-xs uppercase tracking-widest text-gold mb-2">Caso prático</p>
      <h2 className="font-display text-2xl md:text-3xl mb-6">{titulo || "Aplique no caso"}</h2>

      {enunciado && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Enunciado</p>
          <div className="text-sm md:text-base leading-relaxed prose prose-invert max-w-none prose-strong:text-gold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{enunciado}</ReactMarkdown>
          </div>
        </div>
      )}

      {pergunta && (
        <div className="rounded-xl border-l-4 border-gold bg-gold/5 p-4 mb-4 text-sm md:text-base">
          <MD>{pergunta}</MD>
        </div>
      )}

      {!aberto && analise && (
        <button
          onClick={() => setAberto(true)}
          className="h-11 px-5 rounded-full bg-gradient-toga text-primary-foreground font-display text-sm inline-flex items-center gap-2 hover:opacity-95"
        >
          <Eye className="h-4 w-4" />
          Ver análise
        </button>
      )}

      <AnimatePresence>
        {aberto && analise && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-card p-5 mt-2">
              <p className="text-[11px] uppercase tracking-widest text-gold mb-2">Análise</p>
              <div className="text-sm md:text-base leading-relaxed prose prose-invert max-w-none prose-strong:text-gold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{analise}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   Slide: Quiz
   ============================================================ */
function SlideQuiz({
  quiz,
  titulo,
  onAvancar,
}: {
  quiz: QuizJson;
  titulo: string;
  onAvancar: () => void;
}) {
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const acertou = escolhida === quiz.correta;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-xs uppercase tracking-widest text-gold mb-2">Teste rápido</p>
      <h2 className="font-display text-2xl mb-6">{titulo || "Teste rápido"}</h2>
      <p className="text-base md:text-lg mb-6">{quiz.pergunta}</p>

      <div className="space-y-2">
        {quiz.alternativas.map((alt) => {
          const ehEscolhida = escolhida === alt.letra;
          const ehCorreta = alt.letra === quiz.correta;
          const mostrar = escolhida !== null;
          const cor =
            mostrar && ehCorreta
              ? "border-emerald-500 bg-emerald-500/10"
              : mostrar && ehEscolhida && !ehCorreta
                ? "border-red-500 bg-red-500/10"
                : "border-border hover:bg-accent";
          return (
            <button
              key={alt.letra}
              disabled={escolhida !== null}
              onClick={() => setEscolhida(alt.letra)}
              className={`w-full text-left flex items-start gap-3 rounded-xl border p-4 transition-colors ${cor}`}
            >
              <span className="h-7 w-7 rounded-full bg-card border border-border grid place-items-center text-sm font-display shrink-0">
                {alt.letra}
              </span>
              <span className="text-sm">{alt.texto}</span>
            </button>
          );
        })}
      </div>

      {escolhida && (
        <div className="mt-6 rounded-xl border border-border bg-card p-4">
          <p className="font-display text-sm mb-1">
            {acertou ? "✅ Correto!" : "❌ Quase. A alternativa correta é " + quiz.correta + "."}
          </p>
          <p className="text-sm text-muted-foreground">{quiz.explicacao}</p>
          <button
            onClick={onAvancar}
            className="mt-4 h-10 px-4 rounded-full bg-gradient-toga text-primary-foreground text-sm inline-flex items-center gap-2"
          >
            Continuar <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
