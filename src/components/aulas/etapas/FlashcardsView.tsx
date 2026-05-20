import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { obterFlashcardsCapitulo } from "@/lib/aulas-trilha.functions";
import { cn } from "@/lib/utils";
import { EtapaConcluirCta } from "./EtapaConcluirCta";

export default function FlashcardsView({
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
