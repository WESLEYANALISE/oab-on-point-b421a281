import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Layers,
  Notebook,
  Play,
  type LucideIcon,
} from "lucide-react";
import { resumoLivroQueryOptions } from "@/lib/resumos-queries";
import { normalizarTitulo } from "@/lib/titulo";
import { getMateriaAula } from "@/data/aulas-oab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/aulas/$materia/$livroId/")({
  component: TrilhaCapitulos,
});

type EtapaOpt = {
  id: "ler" | "flashcards" | "questoes" | "erros" | "simulado";
  label: string;
  desc: string;
  icon: LucideIcon;
};

const ETAPAS: EtapaOpt[] = [
  { id: "ler", label: "Começar aula", desc: "Conteúdo explicado em partes", icon: Play },
  { id: "flashcards", label: "Flashcards", desc: "Revisão ativa do capítulo", icon: Layers },
  { id: "questoes", label: "Questões", desc: "Treine com perguntas da OAB", icon: CheckCircle2 },
  { id: "erros", label: "Erros", desc: "Reveja o que você errou", icon: Notebook },
  { id: "simulado", label: "Simulado", desc: "Avaliação final da aula", icon: GraduationCap },
];

function TrilhaCapitulos() {
  const { materia, livroId } = Route.useParams();
  const mat = getMateriaAula(materia);
  if (!mat) return <div className="p-8">Matéria não encontrada.</div>;
  const { data } = useSuspenseQuery(resumoLivroQueryOptions(livroId));
  const capitulos = data.capitulos ?? [];
  const [abertaId, setAbertaId] = useState<string | null>(null);

  return (
    <div className="pb-16">
      <header className="relative px-4 md:px-8 pt-5 pb-6 overflow-hidden border-b border-border bg-card/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, var(--gold) 14%, transparent), transparent 70%), radial-gradient(50% 60% at 100% 100%, color-mix(in oklab, var(--gold) 8%, transparent), transparent 70%)",
          }}
        />
        <div className="relative flex items-start gap-3">
          <div className="h-12 w-12 rounded-xl border border-gold/30 bg-gold/10 grid place-items-center text-2xl shrink-0">
            {mat.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80">
              {mat.nome}
            </p>
            <h1 className="font-display font-semibold text-foreground leading-[1.15] mt-1 text-[clamp(1.15rem,4.8vw,1.875rem)] max-w-[24ch] break-words">
              {data.livro.titulo}
            </h1>
            <p className="text-[12px] text-muted-foreground mt-1.5 inline-flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> {capitulos.length} aulas
            </p>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 mt-5 max-w-3xl mx-auto">
        {capitulos.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            Nenhuma aula disponível.
          </p>
        ) : (
          <ol className="relative ml-5 space-y-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-gold/60 before:via-gold/30 before:to-transparent">
            {capitulos.map((c) => {
              const aberta = abertaId === c.id;
              return (
                <li key={c.id} className="relative pl-7">
                  <span className="absolute -left-4 top-4 h-8 w-8 rounded-full bg-gradient-toga border border-gold/50 grid place-items-center text-[11px] font-display font-bold text-gold shadow-[0_4px_14px_-2px_oklch(0.78_0.13_80/0.45)] ring-4 ring-background z-10">
                    {c.ordem}
                  </span>
                  <div
                    className={cn(
                      "rounded-xl border bg-card transition-all shadow-sm shadow-black/10 overflow-hidden",
                      aberta ? "border-gold/50" : "border-border hover:border-gold/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setAbertaId(aberta ? null : c.id)}
                      aria-expanded={aberta}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-semibold">
                          Aula {c.ordem}
                        </p>
                        <p className="font-display text-[15px] md:text-base leading-snug mt-1 break-words text-foreground line-clamp-2">
                          {normalizarTitulo(c.titulo)}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full bg-gold/10 border border-gold/30 grid place-items-center shrink-0 transition-transform duration-300",
                          aberta && "rotate-180 bg-gold text-gold-foreground",
                        )}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-colors",
                            aberta ? "text-gold-foreground" : "text-gold",
                          )}
                        />
                      </div>
                    </button>

                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-out",
                        aberta ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      )}
                    >
                      <div className="overflow-hidden">
                        <ul className="border-t border-border/60 divide-y divide-border/40">
                          {ETAPAS.map((e) => {
                            const Icon = e.icon;
                            const ehAula = e.id === "ler";
                            return (
                              <li key={e.id}>
                                <Link
                                  to="/aulas/$materia/$livroId/$ordem"
                                  params={{ materia, livroId, ordem: String(c.ordem) }}
                                  search={{ etapa: e.id }}
                                  className={cn(
                                    "flex items-center gap-3 px-4 py-3 hover:bg-gold/5 transition group",
                                    ehAula && "bg-gold/[0.04]",
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-9 w-9 rounded-full grid place-items-center shrink-0 border transition",
                                      ehAula
                                        ? "bg-gold border-gold text-gold-foreground"
                                        : "bg-background border-border text-gold group-hover:border-gold/50",
                                    )}
                                  >
                                    <Icon className="h-4 w-4" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className={cn(
                                        "text-sm font-medium leading-tight",
                                        ehAula ? "text-foreground" : "text-foreground/90",
                                      )}
                                    >
                                      {e.label}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      {e.desc}
                                    </p>
                                  </div>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
