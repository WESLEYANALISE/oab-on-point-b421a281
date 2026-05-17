import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Notebook, CheckCircle2, Circle, Trash2, BookOpen, Filter } from "lucide-react";
import { listarErros, marcarRevisado, apagarErro } from "@/lib/caderno-erros.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/oab/caderno-erros")({
  head: () => ({ meta: [{ title: "Caderno de erros · 1ª Fase — OAB na Risca" }] }),
  component: CadernoErrosPage,
});

function CadernoErrosPage() {
  const router = useRouter();
  const listar = useServerFn(listarErros);
  const marcar = useServerFn(marcarRevisado);
  const apagar = useServerFn(apagarErro);

  const [materia, setMateria] = useState<string | undefined>(undefined);
  const [somentePendentes, setSomentePendentes] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["caderno-erros", materia, somentePendentes],
    queryFn: () => listar({ data: { materia, somenteNaoRevisados: somentePendentes } }),
  });

  const erros = data?.erros ?? [];
  const porMateria = data?.porMateria ?? {};
  const materias = Object.keys(porMateria).sort();

  return (
    <div className="pb-16">
      <header className="px-4 pt-5 pb-7 md:px-8 bg-gradient-toga text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <Link to="/oab/primeira-fase" className="relative inline-flex items-center gap-1.5 text-[12px] text-primary-foreground/80 hover:text-primary-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> 1ª Fase
        </Link>
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold mb-2">Revisão personalizada</p>
        <h1 className="font-display font-semibold text-3xl md:text-4xl leading-tight tracking-tight">Caderno de erros</h1>
        <p className="mt-2 text-[13px] text-primary-foreground/80 max-w-xl">
          Cada questão que você erra vira um flashcard automático na sua fila de revisão.
        </p>
        <div className="mt-4 flex gap-2 flex-wrap text-[12px]">
          <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
            {data?.totalGeral ?? 0} erros no total
          </span>
          <span className="px-2.5 py-1 rounded-full bg-gold/20 border border-gold/30 text-gold">
            {data?.pendentesGeral ?? 0} pendentes de revisão
          </span>
          <Link to="/flashcards" className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 hover:bg-white/25 transition inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> Revisar flashcards
          </Link>
        </div>
      </header>

      <div className="px-4 md:px-8 mt-6 space-y-5">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtros:
          </div>
          <button
            onClick={() => setMateria(undefined)}
            className={`px-3 py-1.5 rounded-full text-[12px] border transition ${
              !materia ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted/60"
            }`}
          >
            Todas matérias
          </button>
          {materias.map((m) => (
            <button
              key={m}
              onClick={() => setMateria(m)}
              className={`px-3 py-1.5 rounded-full text-[12px] border transition ${
                materia === m ? "bg-foreground text-background border-foreground" : "border-border hover:bg-muted/60"
              }`}
            >
              {m} <span className="opacity-60">({porMateria[m].pendentes}/{porMateria[m].total})</span>
            </button>
          ))}
          <button
            onClick={() => setSomentePendentes((v) => !v)}
            className={`ml-auto px-3 py-1.5 rounded-full text-[12px] border transition ${
              somentePendentes ? "bg-gold text-gold-foreground border-gold" : "border-border hover:bg-muted/60"
            }`}
          >
            {somentePendentes ? "Mostrando só pendentes" : "Só pendentes"}
          </button>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando seus erros…</div>
        ) : erros.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
            <div className="inline-flex h-12 w-12 rounded-2xl bg-gold/12 border border-gold/25 items-center justify-center mb-3">
              <Notebook className="h-5 w-5 text-gold" />
            </div>
            <p className="font-display font-semibold text-lg">
              {data?.totalGeral === 0 ? "Seu caderno está vazio" : "Nada com esses filtros"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              {data?.totalGeral === 0
                ? "Resolva simulados para começar a alimentar automaticamente seu caderno de erros."
                : "Tente ajustar matéria ou desativar o filtro de pendentes."}
            </p>
            {data?.totalGeral === 0 && (
              <Link to="/simulados" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-gold text-gold-foreground text-[13px] font-semibold hover:bg-gold/90 transition">
                Ir para simulados
              </Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {erros.map((e) => {
              const expandido = aberto === e.id;
              return (
                <li key={e.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setAberto(expandido ? null : e.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition"
                  >
                    {e.revisado_em ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-1 shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
                        <span className="font-semibold text-foreground">Q{e.numero}</span>
                        {e.materia && <span>· {e.materia}</span>}
                        {e.simulado_titulo && <span className="truncate">· {e.simulado_titulo}</span>}
                      </div>
                      <p className="text-[13px] line-clamp-2">{e.enunciado || "—"}</p>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-destructive/12 text-destructive font-semibold">
                          Marcou {e.alternativa_marcada ?? "—"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 font-semibold">
                          Correta {e.resposta_correta}
                        </span>
                      </div>
                    </div>
                  </button>
                  {expandido && (
                    <div className="px-4 pb-4 pt-1 border-t border-border/60 bg-muted/20 space-y-3 text-[13px]">
                      <div className="space-y-1.5">
                        {(["A", "B", "C", "D"] as const).map((letra) => {
                          const txt = e.alternativas[letra];
                          if (!txt) return null;
                          const isCorreta = letra === e.resposta_correta;
                          const isMarcada = letra === e.alternativa_marcada;
                          return (
                            <div
                              key={letra}
                              className={`px-3 py-2 rounded-lg border ${
                                isCorreta
                                  ? "border-emerald-500/40 bg-emerald-500/8"
                                  : isMarcada
                                  ? "border-destructive/40 bg-destructive/8"
                                  : "border-border bg-background"
                              }`}
                            >
                              <span className="font-semibold mr-1.5">{letra})</span>
                              {txt}
                            </div>
                          );
                        })}
                      </div>
                      {e.justificativa && (
                        <div className="rounded-lg border border-border bg-background p-3">
                          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">
                            Justificativa
                          </p>
                          <p>{e.justificativa}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={async () => {
                            await marcar({ data: { id: e.id, revisado: !e.revisado_em } });
                            toast.success(e.revisado_em ? "Reaberto" : "Marcado como revisado");
                            refetch();
                            router.invalidate();
                          }}
                          className="px-3 py-1.5 rounded-full text-[12px] font-semibold bg-foreground text-background hover:opacity-90 transition"
                        >
                          {e.revisado_em ? "Reabrir" : "Marcar revisado"}
                        </button>
                        {e.flashcard_id && (
                          <Link
                            to="/flashcards"
                            className="px-3 py-1.5 rounded-full text-[12px] font-semibold border border-gold text-gold hover:bg-gold/10 transition"
                          >
                            Ir para o flashcard
                          </Link>
                        )}
                        <button
                          onClick={async () => {
                            if (!confirm("Remover esta questão do caderno?")) return;
                            await apagar({ data: { id: e.id } });
                            toast.success("Removido");
                            refetch();
                          }}
                          className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remover
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
