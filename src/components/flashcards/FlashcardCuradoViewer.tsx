import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Lightbulb, BookOpen, Sparkles, RotateCw } from "lucide-react";
import type { FlashcardCurado } from "@/lib/flashcards-curados.functions";
import { Button } from "@/components/ui/button";

export function FlashcardCuradoViewer({
  cards,
  onClose,
}: {
  cards: FlashcardCurado[];
  onClose?: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Nenhum flashcard disponível ainda.
      </div>
    );
  }

  const card = cards[idx];
  const prox = () => {
    if (idx < cards.length - 1) {
      setFlipped(false);
      setIdx(idx + 1);
    }
  };
  const ant = () => {
    if (idx > 0) {
      setFlipped(false);
      setIdx(idx - 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {card.capitulo_titulo ?? card.livro_titulo}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {idx + 1} / {cards.length}
        </span>
      </div>

      {/* Card flip */}
      <div className="relative" style={{ perspective: "1500px" }}>
        <motion.div
          className="relative w-full min-h-[360px] md:min-h-[420px]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Frente */}
          <div
            className="absolute inset-0 rounded-2xl border border-gold/20 bg-gradient-toga text-primary-foreground p-6 md:p-8 flex flex-col"
            style={{ backfaceVisibility: "hidden" }}
            onClick={() => setFlipped(true)}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold">
                {card.area ?? "Direito"}
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-xl md:text-2xl font-display leading-snug">
                {card.frente}
              </p>
            </div>
            <p className="text-[11px] text-primary-foreground/60 text-center mt-4 inline-flex items-center justify-center gap-1.5">
              <RotateCw className="h-3 w-3" /> Toque para ver a resposta
            </p>
          </div>

          {/* Verso */}
          <div
            className="absolute inset-0 rounded-2xl border border-gold/30 bg-card p-5 md:p-6 overflow-y-auto"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
            onClick={() => setFlipped(false)}
          >
            <div className="space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold mb-1.5">
                  Resposta
                </p>
                <p className="text-base md:text-lg font-medium leading-snug">{card.verso}</p>
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
                <div className="rounded-xl bg-gold/10 border border-gold/25 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gold font-semibold mb-1.5 inline-flex items-center gap-1">
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
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={ant} disabled={idx === 0} size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setFlipped((f) => !f)}>
          <RotateCw className="h-4 w-4 mr-1" /> Virar
        </Button>
        <Button onClick={prox} disabled={idx === cards.length - 1} size="sm">
          Próximo <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Progress dots */}
      <AnimatePresence>
        <div className="flex justify-center gap-1 flex-wrap">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIdx(i);
                setFlipped(false);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-gold" : "w-1.5 bg-muted hover:bg-muted-foreground/40"
              }`}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
