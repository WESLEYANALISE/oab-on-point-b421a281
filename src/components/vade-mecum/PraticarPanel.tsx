import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  gerarQuestoesArtigo,
  gerarFlashcardsArtigo,
  salvarTentativa,
  getHistoricoArtigo,
} from "@/lib/artigo-pratica.functions";
import { Brain, Layers, X, ChevronRight, History, Check, Trophy, RotateCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Questao = {
  tipo: "multipla" | "vf";
  enunciado: string;
  alternativas: string[];
  correta: number;
  explicacao: string;
  dificuldade?: "basico" | "intermediario" | "avancado";
};
type Flashcard = { frente: string; verso: string; exemplo: string };

type ArtigoMin = { id: string; numero: string | null; texto: string; lei_id?: string };

/** Painel mostrado dentro do conteúdo do Sheet quando funcTab === "praticar". */
export function PraticarPanel({
  artigo,
  leiId,
  userId,
}: {
  artigo: ArtigoMin;
  leiId: string | null;
  userId: string | null;
}) {
  const [modo, setModo] = useState<null | "questoes" | "flashcards">(null);

  return (
    <div className="relative">
      {modo === null && <EscolhaModo onPick={setModo} />}
      {modo === "questoes" && (
        <QuestoesView
          artigo={artigo}
          leiId={leiId}
          userId={userId}
          onClose={() => setModo(null)}
        />
      )}
      {modo === "flashcards" && (
        <FlashcardsView artigo={artigo} onClose={() => setModo(null)} />
      )}
    </div>
  );
}

function EscolhaModo({ onPick }: { onPick: (m: "questoes" | "flashcards") => void }) {
  return (
    <div className="animate-fade-in pt-2 pb-6">
      <div className="text-center mb-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold/90 font-semibold">Praticar</p>
        <h3 className="font-display font-bold text-xl mt-1">Como quer treinar?</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          A Profa. Ana gera tudo pra você. Escolha o modo.
        </p>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onPick("questoes")}
          className="w-full p-4 rounded-2xl bg-gradient-to-br from-gold/15 to-amber-700/10 border border-gold/40 text-left active:scale-[0.99] transition flex items-center gap-4"
        >
          <span className="h-12 w-12 rounded-xl bg-gradient-to-br from-gold to-amber-600 grid place-items-center text-black shadow-lg shrink-0">
            <Brain className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-foreground">Questões</span>
            <span className="block text-[12px] text-muted-foreground mt-0.5">
              Múltipla escolha + V/F, do básico ao nível OAB.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-gold shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => onPick("flashcards")}
          className="w-full p-4 rounded-2xl bg-card/60 border border-border/70 text-left active:scale-[0.99] transition flex items-center gap-4"
        >
          <span className="h-12 w-12 rounded-xl bg-card border border-border grid place-items-center text-gold shrink-0">
            <Layers className="h-6 w-6" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-foreground">Flashcards</span>
            <span className="block text-[12px] text-muted-foreground mt-0.5">
              Pergunta, resposta com flip e exemplo prático.
            </span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </button>
      </div>
    </div>
  );
}

// =========================== QUESTÕES ===========================

function QuestoesView({
  artigo,
  leiId,
  userId,
  onClose,
}: {
  artigo: ArtigoMin;
  leiId: string | null;
  userId: string | null;
  onClose: () => void;
}) {
  const gerar = useServerFn(gerarQuestoesArtigo);
  const salvar = useServerFn(salvarTentativa);
  const getHist = useServerFn(getHistoricoArtigo);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pratica-questoes", artigo.id],
    queryFn: () => gerar({ data: { artigoId: artigo.id } }),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const [histAberto, setHistAberto] = useState(false);
  const histQ = useQuery({
    enabled: !!userId && histAberto,
    queryKey: ["pratica-historico", artigo.id, userId],
    queryFn: () => getHist({ data: { artigoId: artigo.id } }),
  });

  const itens = (data?.itens as Questao[] | undefined) ?? [];
  const [idx, setIdx] = useState(0);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [respostas, setRespostas] = useState<{ i: number; escolha: number; correta: boolean }[]>([]);
  const [fim, setFim] = useState(false);

  useEffect(() => {
    setIdx(0); setEscolha(null); setRespostas([]); setFim(false);
  }, [data]);

  const q = itens[idx];
  const total = itens.length;
  const acertos = respostas.filter((r) => r.correta).length;

  const responder = (i: number) => {
    if (escolha !== null || !q) return;
    setEscolha(i);
    const ok = i === q.correta;
    setRespostas((prev) => [...prev, { i: idx, escolha: i, correta: ok }]);
  };

  const proxima = async () => {
    if (idx + 1 >= total) {
      setFim(true);
      if (userId && leiId) {
        try {
          await salvar({
            data: {
              artigoId: artigo.id,
              leiId,
              modo: "questoes",
              acertos: respostas.filter((r) => r.correta).length,
              total,
              respostas,
            },
          });
        } catch (e: any) {
          console.error(e);
        }
      }
      return;
    }
    setIdx((n) => n + 1);
    setEscolha(null);
  };

  const refazer = () => {
    setIdx(0); setEscolha(null); setRespostas([]); setFim(false);
  };

  if (isLoading) {
    return <LoadingProfa msg="Profa. Ana está preparando suas questões…" />;
  }
  if (error) {
    return (
      <ErroPratica
        msg={(error as Error).message}
        onRetry={() => refetch()}
        onBack={onClose}
      />
    );
  }
  if (total === 0) {
    return <ErroPratica msg="Não foi possível gerar questões." onRetry={() => refetch()} onBack={onClose} />;
  }

  if (fim) {
    const pct = Math.round((acertos / total) * 100);
    return (
      <div className="animate-fade-in pt-2 pb-6 text-center">
        <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-gold to-amber-600 grid place-items-center text-black shadow-xl">
          <Trophy className="h-10 w-10" />
        </div>
        <h3 className="font-display font-bold text-2xl mt-4">{acertos} de {total}</h3>
        <p className="text-sm text-muted-foreground mt-1">Você acertou {pct}%</p>
        <div className="mt-6 grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <button
            onClick={refazer}
            className="h-11 rounded-xl bg-card border border-border/70 text-sm font-semibold flex items-center justify-center gap-2 active:scale-95"
          >
            <RotateCw className="h-4 w-4" /> Refazer
          </button>
          <button
            onClick={onClose}
            className="h-11 rounded-xl bg-gradient-to-br from-gold to-amber-600 text-black text-sm font-semibold active:scale-95"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onClose}
          className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition"
        >
          ‹ Voltar
        </button>
        <div className="text-xs font-semibold text-muted-foreground">
          {idx + 1} / {total}
        </div>
        <button
          onClick={() => setHistAberto((v) => !v)}
          className="h-8 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 bg-card/60 border border-border/70 text-gold hover:bg-card"
        >
          <History className="h-3.5 w-3.5" /> Histórico
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 rounded-full bg-card overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-gold to-amber-500 transition-all"
          style={{ width: `${((idx + (escolha !== null ? 1 : 0)) / total) * 100}%` }}
        />
      </div>

      {/* Histórico inline */}
      {histAberto && (
        <HistoricoMini data={histQ.data?.tentativas ?? []} loading={histQ.isLoading} userId={userId} />
      )}

      {/* Questão */}
      <div key={idx} className="animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-gold/80">
            {q.tipo === "vf" ? "Verdadeiro ou falso" : "Múltipla escolha"}
          </span>
          {q.dificuldade && (
            <span className={`text-[10px] uppercase tracking-widest font-semibold ${
              q.dificuldade === "basico" ? "text-emerald-400/80"
              : q.dificuldade === "intermediario" ? "text-amber-400/80"
              : "text-rose-400/80"
            }`}>
              · {q.dificuldade === "basico" ? "Básico" : q.dificuldade === "intermediario" ? "Intermediário" : "Avançado"}
            </span>
          )}
        </div>
        <p className="text-[15px] leading-relaxed font-medium mb-4">{q.enunciado}</p>
        <div className="space-y-2">
          {q.alternativas.map((alt, i) => {
            const respondida = escolha !== null;
            const ehCorreta = i === q.correta;
            const ehEscolha = i === escolha;
            const base = "w-full text-left p-3 rounded-xl border text-[14px] transition-all flex items-start gap-3";
            let cls = "bg-card/40 border-border/60 text-foreground hover:bg-card/70 active:scale-[0.99]";
            if (respondida) {
              if (ehCorreta) cls = "bg-emerald-500/15 border-emerald-500/60 text-emerald-100";
              else if (ehEscolha) cls = "bg-rose-500/15 border-rose-500/60 text-rose-100";
              else cls = "bg-card/30 border-border/50 text-muted-foreground opacity-70";
            }
            return (
              <button
                key={i}
                disabled={respondida}
                onClick={() => responder(i)}
                className={`${base} ${cls}`}
              >
                <span className={`h-6 w-6 rounded-full border grid place-items-center text-[11px] font-bold shrink-0 ${
                  respondida && ehCorreta ? "bg-emerald-500 border-emerald-500 text-black"
                  : respondida && ehEscolha ? "bg-rose-500 border-rose-500 text-white"
                  : "border-border/60"
                }`}>
                  {respondida && ehCorreta ? <Check className="h-3.5 w-3.5" />
                  : respondida && ehEscolha ? <X className="h-3.5 w-3.5" />
                  : String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 leading-snug">{alt}</span>
              </button>
            );
          })}
        </div>

        {/* Explicação */}
        {escolha !== null && (
          <div className="mt-4 p-3.5 rounded-xl bg-gold/10 border border-gold/30 animate-fade-in">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-gold">Profa. Ana</span>
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/90">{q.explicacao}</p>
            <button
              onClick={proxima}
              className="mt-3 w-full h-11 rounded-xl bg-gradient-to-br from-gold to-amber-600 text-black font-semibold text-sm active:scale-95 transition"
            >
              {idx + 1 >= total ? "Ver resultado" : "Próxima"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoricoMini({
  data,
  loading,
  userId,
}: {
  data: { id: string; modo: string; acertos: number; total: number; concluido_em: string | null }[];
  loading: boolean;
  userId: string | null;
}) {
  if (!userId) {
    return (
      <div className="mb-4 p-3 rounded-xl bg-card/40 border border-border/60 text-[12px] text-muted-foreground text-center">
        Entre na sua conta pra ver seu histórico.
      </div>
    );
  }
  if (loading) {
    return <div className="mb-4 h-16 rounded-xl bg-card/40 animate-pulse" />;
  }
  if (!data.length) {
    return (
      <div className="mb-4 p-3 rounded-xl bg-card/40 border border-border/60 text-[12px] text-muted-foreground text-center">
        Você ainda não praticou esse artigo.
      </div>
    );
  }
  const max = Math.max(...data.map((d) => d.total || 1));
  return (
    <div className="mb-4 p-3 rounded-xl bg-card/40 border border-border/60">
      <div className="flex items-end justify-between gap-1.5 h-16">
        {data.slice().reverse().map((d) => {
          const pct = d.total ? d.acertos / d.total : 0;
          const h = (d.total / max) * 100;
          return (
            <div key={d.id} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-card rounded-sm overflow-hidden relative" style={{ height: `${h}%`, minHeight: 8 }}>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gold to-amber-500" style={{ height: `${pct * 100}%` }} />
              </div>
              <span className="text-[9px] text-muted-foreground">{Math.round(pct * 100)}%</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2">
        Última: <span className="text-foreground font-semibold">{data[0].acertos}/{data[0].total}</span> ·{" "}
        {data[0].concluido_em ? new Date(data[0].concluido_em).toLocaleDateString("pt-BR") : "—"}
      </p>
    </div>
  );
}

// =========================== FLASHCARDS ===========================

function FlashcardsView({
  artigo,
  onClose,
}: {
  artigo: ArtigoMin;
  onClose: () => void;
}) {
  const gerar = useServerFn(gerarFlashcardsArtigo);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["pratica-flashcards", artigo.id],
    queryFn: () => gerar({ data: { artigoId: artigo.id } }),
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
  const itens = (data?.itens as Flashcard[] | undefined) ?? [];
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);

  useEffect(() => { setIdx(0); setFlip(false); }, [data]);

  if (isLoading) return <LoadingProfa msg="Profa. Ana está preparando seus flashcards…" />;
  if (error) return <ErroPratica msg={(error as Error).message} onRetry={() => refetch()} onBack={onClose} />;
  if (itens.length === 0) return <ErroPratica msg="Não foi possível gerar flashcards." onRetry={() => refetch()} onBack={onClose} />;

  const c = itens[idx];
  const total = itens.length;
  const ultimo = idx + 1 >= total;

  const next = () => {
    if (ultimo) {
      toast.success("Você revisou todos os cards!");
      onClose();
      return;
    }
    setFlip(false);
    setTimeout(() => setIdx((n) => n + 1), 150);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background animate-fade-in flex flex-col">
      {/* Header com botão de fechar */}
      <div
        className="flex items-center justify-between px-4 border-b border-border/60"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: "12px" }}
      >
        <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-gold">
          Flashcards
        </div>
        <div className="text-xs font-semibold text-muted-foreground">{idx + 1} / {total}</div>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="h-9 w-9 -mr-2 grid place-items-center rounded-full hover:bg-card transition active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-4 pt-3">
        <div className="h-1.5 rounded-full bg-card overflow-hidden">
          <div className="h-full bg-gradient-to-r from-gold to-amber-500 transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col">
        <div
          className="cursor-pointer select-none"
          onClick={() => setFlip((f) => !f)}
          style={{ perspective: "1200px" }}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{
              transformStyle: "preserve-3d",
              transform: flip ? "rotateY(180deg)" : "rotateY(0deg)",
              minHeight: "280px",
            }}
          >
            {/* Frente */}
            <div
              className="absolute inset-0 rounded-2xl p-6 bg-gradient-to-br from-card to-card/60 border border-border/70 flex flex-col items-center justify-center text-center"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gold/80 mb-3">Pergunta</span>
              <p className="font-display font-semibold text-[18px] leading-snug">{c.frente}</p>
              <span className="mt-6 text-[11px] text-muted-foreground">toque para virar</span>
            </div>
            {/* Verso */}
            <div
              className="absolute inset-0 rounded-2xl p-6 bg-gradient-to-br from-gold/15 to-amber-700/10 border border-gold/50 flex flex-col items-center justify-center text-center"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gold mb-3">Resposta</span>
              <p className="text-[15px] leading-relaxed text-foreground">{c.verso}</p>
            </div>
          </div>
        </div>

        {flip && (
          <div className="mt-4 p-3.5 rounded-xl bg-card/40 border border-border/60 animate-fade-in">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-amber-400">Exemplo prático</span>
            </div>
            <p className="text-[13px] leading-relaxed text-foreground/85">{c.exemplo}</p>
          </div>
        )}
      </div>

      {/* Footer com botão próximo */}
      <div
        className="px-4 pt-3 border-t border-border/60 bg-background"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
      >
        <button
          onClick={next}
          className="w-full h-12 rounded-xl bg-gradient-to-br from-gold to-amber-600 text-black font-semibold active:scale-95 transition flex items-center justify-center gap-2"
        >
          {ultimo ? "Concluir" : "Próximo"} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// =========================== Helpers UI ===========================

function LoadingProfa({ msg }: { msg: string }) {
  return (
    <div className="py-16 text-center animate-fade-in">
      <div className="h-14 w-14 mx-auto rounded-full bg-gradient-to-br from-gold to-amber-600 grid place-items-center text-black shadow-lg animate-pulse">
        <Sparkles className="h-6 w-6" />
      </div>
      <p className="mt-4 text-sm font-medium">{msg}</p>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
        <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: "0.15s" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: "0.3s" }} />
      </div>
    </div>
  );
}

function ErroPratica({ msg, onRetry, onBack }: { msg: string; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="py-12 text-center animate-fade-in">
      <p className="text-sm font-medium text-rose-300">Não foi possível carregar</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{msg}</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <button onClick={onBack} className="h-9 px-4 rounded-lg bg-card border border-border/70 text-xs font-semibold">
          Voltar
        </button>
        <button onClick={onRetry} className="h-9 px-4 rounded-lg bg-gradient-to-br from-gold to-amber-600 text-black text-xs font-semibold">
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
