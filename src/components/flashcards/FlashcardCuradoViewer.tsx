import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Sparkles,
  RotateCw,
  Bookmark,
} from "lucide-react";
import type { FlashcardCurado } from "@/lib/flashcards-curados.functions";
import { Button } from "@/components/ui/button";

export function FlashcardCuradoViewer({
  cards,
  accent = "#c9a14a",
}: {
  cards: FlashcardCurado[];
  onClose?: () => void;
  accent?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const dirRef = useRef<1 | -1>(1);

  if (cards.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhum flashcard disponível ainda.
      </div>
    );
  }

  const safeIdx = Math.min(idx, cards.length - 1);
  const card = cards[safeIdx];
  const prox = () => {
    if (safeIdx < cards.length - 1) {
      dirRef.current = 1;
      setFlipped(false);
      setIdx(safeIdx + 1);
    }
  };
  const ant = () => {
    if (safeIdx > 0) {
      dirRef.current = -1;
      setFlipped(false);
      setIdx(safeIdx - 1);
    }
  };

  const slideVariants = {
    enter: (dir: 1 | -1) => ({ x: dir * 60, opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: 1 | -1) => ({ x: -dir * 60, opacity: 0, scale: 0.96 }),
  };

  return (
    <div className="space-y-4">
      {/* Header tag capítulo + contador */}
      <div className="flex items-center justify-between gap-3">
        <motion.div
          key={card.capitulo_titulo ?? card.id}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border min-w-0"
          style={{
            color: accent,
            borderColor: `${accent}55`,
            background: `${accent}10`,
          }}
        >
          <Bookmark className="h-3 w-3 shrink-0" />
          <span className="truncate max-w-[200px]">
            {card.capitulo_titulo ?? card.livro_titulo ?? "Capítulo"}
          </span>
        </motion.div>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">
          {safeIdx + 1} / {cards.length}
        </span>
      </div>

      {/* Slide + Flip */}
      <div className="relative" style={{ perspective: "1500px" }}>
        <AnimatePresence mode="wait" custom={dirRef.current}>
          <motion.div
            key={card.id}
            custom={dirRef.current}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 320, damping: 32 },
              opacity: { duration: 0.18 },
              scale: { duration: 0.22 },
            }}
            className="relative w-full min-h-[380px] md:min-h-[440px]"
          >
            <motion.div
              className="relative w-full min-h-[380px] md:min-h-[440px]"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Frente */}
              <div
                className="absolute inset-0 rounded-2xl border bg-gradient-toga text-primary-foreground p-6 md:p-8 flex flex-col cursor-pointer overflow-hidden"
                style={{
                  backfaceVisibility: "hidden",
                  borderColor: `${accent}40`,
                  boxShadow: `0 20px 60px -30px ${accent}80, inset 0 0 0 1px ${accent}25`,
                }}
                onClick={() => setFlipped(true)}
              >
                <div
                  className="absolute -top-20 -right-20 h-56 w-56 rounded-full opacity-25 blur-3xl pointer-events-none"
                  style={{ background: accent }}
                  aria-hidden
                />
                <div className="flex items-center gap-2 mb-4 relative">
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                    style={{ color: accent }}
                  >
                    {card.area ?? "Direito"}
                  </span>
                </div>
                <div className="flex-1 flex items-center justify-center text-center relative">
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    className="text-xl md:text-2xl font-display leading-snug"
                  >
                    {card.frente}
                  </motion.p>
                </div>
                <p className="text-[11px] text-primary-foreground/60 text-center mt-4 inline-flex items-center justify-center gap-1.5 relative">
                  <RotateCw className="h-3 w-3" /> Toque para ver a resposta
                </p>
              </div>

              {/* Verso */}
              <div
                className="absolute inset-0 rounded-2xl border bg-card p-5 md:p-6 overflow-y-auto cursor-pointer"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                  borderColor: `${accent}55`,
                  boxShadow: `0 20px 60px -30px ${accent}60`,
                }}
                onClick={() => setFlipped(false)}
              >
                <div className="space-y-4">
                  <div>
                    <p
                      className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1.5"
                      style={{ color: accent }}
                    >
                      Resposta
                    </p>
                    <p className="text-base md:text-lg font-medium leading-snug">
                      {card.verso}
                    </p>
                  </div>

                  {card.explicacao && (
                    <div className="border-t border-border pt-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-1.5 inline-flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> Explicação
                      </p>
                      <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                        {card.explicacao}
                      </p>
                    </div>
                  )}

                  {card.exemplo && (
                    <div className="rounded-xl bg-primary/5 border border-primary/15 p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1.5 inline-flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Exemplo
                      </p>
                      <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                        {card.exemplo}
                      </p>
                    </div>
                  )}

                  {card.dica && (
                    <div
                      className="rounded-xl p-3 border"
                      style={{
                        background: `${accent}12`,
                        borderColor: `${accent}40`,
                      }}
                    >
                      <p
                        className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-1.5 inline-flex items-center gap-1"
                        style={{ color: accent }}
                      >
                        <Lightbulb className="h-3 w-3" /> Dica
                      </p>
                      <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
                        {card.dica}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={ant} disabled={safeIdx === 0} size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}>
          <RotateCw className="h-4 w-4 mr-1" /> Virar
        </Button>
        <Button onClick={prox} disabled={safeIdx === cards.length - 1} size="sm">
          Próximo <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1 flex-wrap">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              dirRef.current = i > safeIdx ? 1 : -1;
              setIdx(i);
              setFlipped(false);
            }}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === safeIdx ? 24 : 6,
              background: i === safeIdx ? accent : "hsl(var(--muted))",
            }}
            aria-label={`Ir para card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
