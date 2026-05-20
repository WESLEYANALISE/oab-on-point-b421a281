import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { listarCadernoErros } from "@/lib/aulas-trilha.functions";
import { cn } from "@/lib/utils";
import { EtapaConcluirCta } from "./EtapaConcluirCta";

export default function ErrosCapituloView({
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
