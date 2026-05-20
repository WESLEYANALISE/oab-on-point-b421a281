import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, Loader2, XCircle } from "lucide-react";
import { obterSimuladoCapitulo } from "@/lib/aulas-trilha.functions";
import { cn } from "@/lib/utils";

export default function SimuladoView({
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
