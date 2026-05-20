import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { gerarAulaCapitulo } from "@/lib/aulas-trilha.functions";

export default function AulaLerView({
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
