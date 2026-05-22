import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Check, CheckCircle2, MessageCircleQuestion } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@tanstack/react-router";
import type { SlideRow, QuizJson } from "@/lib/aulas-interativas.functions";

type Props = {
  slides: SlideRow[];
  tituloAula: string;
  voltarHref: string;
  slideInicial?: number;
  onProgresso?: (slideIdx: number, concluida: boolean) => void;
};

export function SlidePlayer({
  slides,
  tituloAula,
  voltarHref,
  slideInicial = 0,
  onProgresso,
}: Props) {
  const [idx, setIdx] = useState(Math.min(slideInicial, slides.length - 1));
  const total = slides.length;
  const slide = slides[idx];

  const proximo = useCallback(() => {
    setIdx((i) => Math.min(total - 1, i + 1));
  }, [total]);

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

  if (!slide) return null;
  const ehUltimo = idx === total - 1;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
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
            <SlideRenderer slide={slide} onResponderQuiz={proximo} />
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
          <Link
            to={voltarHref}
            className="h-11 px-5 rounded-full bg-gradient-gold text-gold-foreground font-display text-sm inline-flex items-center gap-2 hover:opacity-95"
          >
            <CheckCircle2 className="h-4 w-4" />
            Concluir aula
          </Link>
        ) : (
          <button
            onClick={proximo}
            className="h-11 px-5 rounded-full bg-gradient-toga text-primary-foreground font-display text-sm inline-flex items-center gap-2 hover:opacity-95"
          >
            Próximo
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </footer>
    </div>
  );
}

function SlideRenderer({
  slide,
  onResponderQuiz,
}: {
  slide: SlideRow;
  onResponderQuiz: () => void;
}) {
  const c = slide.conteudo ?? {};
  const titulo = c.titulo ?? "";

  if (slide.tipo === "quiz" && slide.quiz_json) {
    return <SlideQuiz quiz={slide.quiz_json} titulo={titulo} onAvancar={onResponderQuiz} />;
  }

  if (slide.tipo === "capa") {
    return (
      <div className="min-h-full grid place-items-center px-6 py-10">
        <div className="max-w-2xl text-center">
          <p className="text-xs uppercase tracking-widest text-gold mb-3">Aula interativa</p>
          <h1 className="font-display text-3xl md:text-5xl leading-tight mb-6">{titulo}</h1>
          {c.bullets && c.bullets.length > 0 && (
            <div className="mt-8 text-left bg-card border border-border rounded-2xl p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                Ao final você saberá:
              </p>
              <ul className="space-y-2">
                {c.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm md:text-base">
                    <Check className="h-4 w-4 text-gold mt-1 shrink-0" />
                    <span>{b}</span>
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
                    <span>{it}</span>
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
              <span className="text-sm md:text-base">{b}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // conceito / exemplo / resumo / conclusao
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {slide.tipo === "exemplo" && (
        <p className="text-xs uppercase tracking-widest text-gold mb-2">Exemplo prático</p>
      )}
      {slide.tipo === "resumo" && (
        <p className="text-xs uppercase tracking-widest text-gold mb-2">O que vimos</p>
      )}
      {slide.tipo === "conclusao" && (
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
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {c.destaque && (
        <div className="mt-6 rounded-xl border-l-4 border-gold bg-gold/5 p-4 text-sm md:text-base">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{c.destaque}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

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
