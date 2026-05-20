import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Layers,
  Loader2,
  Notebook,
  type LucideIcon,
} from "lucide-react";
import { resumoLivroQueryOptions } from "@/lib/resumos-queries";
import { normalizarTitulo } from "@/lib/titulo";
import { getMateriaAula } from "@/data/aulas-oab";
import { cn } from "@/lib/utils";

type Etapa = "ler" | "flashcards" | "questoes" | "erros" | "simulado";
const ETAPAS_IDS: Etapa[] = ["ler", "flashcards", "questoes", "erros", "simulado"];

// Lazy-loaded etapa views — each loads in its own chunk only when shown
const AulaLerView = lazy(() => import("@/components/aulas/etapas/AulaLerView"));
const FlashcardsView = lazy(() => import("@/components/aulas/etapas/FlashcardsView"));
const QuestoesView = lazy(() => import("@/components/aulas/etapas/QuestoesView"));
const ErrosCapituloView = lazy(() => import("@/components/aulas/etapas/ErrosCapituloView"));
const SimuladoView = lazy(() => import("@/components/aulas/etapas/SimuladoView"));

export const Route = createFileRoute("/_app/aulas/$materia/$livroId/$ordem")({
  validateSearch: (search: Record<string, unknown>) => {
    const e = search.etapa;
    return {
      etapa: typeof e === "string" && (ETAPAS_IDS as string[]).includes(e)
        ? (e as Etapa)
        : ("ler" as Etapa),
    };
  },
  head: ({ params }) => {
    const m = getMateriaAula(params.materia);
    return {
      meta: [
        { title: `Aula ${params.ordem} · ${m?.nome ?? "OAB na Risca"}` },
        { name: "description", content: `Aula ${params.ordem} de ${m?.nome ?? "OAB"} — leia, pratique com flashcards, questões e simulado.` },
      ],
    };
  },
  loader: ({ context, params }) => {
    const mat = getMateriaAula(params.materia);
    if (!mat) throw notFound();
    context.queryClient.ensureQueryData(resumoLivroQueryOptions(params.livroId));
    return { materia: mat };
  },
  component: AulaCapitulo,
  notFoundComponent: () => <div className="p-8">Não encontrado.</div>,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">{error.message}</div>
  ),
});

const ETAPAS: { id: Etapa; label: string; icon: LucideIcon }[] = [
  { id: "ler", label: "Aula", icon: BookOpen },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "questoes", label: "Questões", icon: CheckCircle2 },
  { id: "erros", label: "Erros", icon: Notebook },
  { id: "simulado", label: "Simulado", icon: GraduationCap },
];

function EtapaFallback() {
  return (
    <div className="py-16 text-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-gold" />
      <p className="text-sm">Carregando…</p>
    </div>
  );
}

function AulaCapitulo() {
  const { materia, livroId, ordem } = Route.useParams();
  const { etapa: etapaInicial } = Route.useSearch();
  const { materia: mat } = Route.useLoaderData();
  const ordemNum = Number(ordem);
  const { data } = useSuspenseQuery(resumoLivroQueryOptions(livroId));

  const [etapa, setEtapa] = useState<Etapa>(etapaInicial);
  useEffect(() => {
    setEtapa(etapaInicial);
  }, [etapaInicial]);
  const [feitas, setFeitas] = useState<Record<Etapa, boolean>>({
    ler: false,
    flashcards: false,
    questoes: false,
    erros: false,
    simulado: false,
  });
  const marcarFeita = (e: Etapa) => setFeitas((p) => ({ ...p, [e]: true }));

  // estado das partes da aula (controlado aqui para o header mostrar)
  const [parteIdx, setParteIdx] = useState(0);
  const [totalPartes, setTotalPartes] = useState(0);
  const [parteTitulo, setParteTitulo] = useState<string>("");

  const capitulos = data?.capitulos ?? [];
  const atual = useMemo(
    () => capitulos.find((c) => c.ordem === ordemNum),
    [capitulos, ordemNum],
  );
  const idx = atual ? capitulos.findIndex((c) => c.id === atual.id) : -1;
  const prev = idx > 0 ? capitulos[idx - 1] : null;
  const next = idx >= 0 && idx < capitulos.length - 1 ? capitulos[idx + 1] : null;

  const etapaAtual = ETAPAS.find((e) => e.id === etapa)!;
  const EtapaIcon = etapaAtual.icon;

  // marcar quais etapas dispensam o uso de feitas (linter)
  void feitas;

  if (!atual) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        Aula não encontrada.{" "}
        <Link
          to="/aulas/$materia/$livroId"
          params={{ materia, livroId }}
          className="underline"
        >
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* HEADER */}
      <header className="relative px-4 md:px-8 pt-5 pb-5 overflow-hidden border-b border-border bg-card/40">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 0% 0%, color-mix(in oklab, var(--gold) 14%, transparent), transparent 70%), radial-gradient(50% 60% at 100% 100%, color-mix(in oklab, var(--gold) 8%, transparent), transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80">
            {mat.nome} · Aula {atual.ordem} de {capitulos.length}
          </p>
          <h1 className="font-display leading-[1.15] mt-1 text-foreground text-[clamp(1rem,4.4vw,1.5rem)] max-w-[34ch] break-words hyphens-auto">
            {normalizarTitulo(atual.titulo)}
          </h1>

          {etapa === "ler" && totalPartes > 0 ? (
            <PartesHeader
              total={totalPartes}
              atual={parteIdx}
              tituloParte={parteTitulo}
              onPick={(i) => setParteIdx(i)}
            />
          ) : (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1">
              <EtapaIcon className="h-3.5 w-3.5 text-gold" />
              <span className="text-[11px] uppercase tracking-wider text-gold font-semibold">
                {etapaAtual.label}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* CONTEÚDO */}
      <div className="px-4 md:px-8 max-w-3xl mx-auto pt-5">
        <div key={etapa} className="animate-tab-fade">
          <Suspense fallback={<EtapaFallback />}>
            {etapa === "ler" && (
              <AulaLerView
                livroId={livroId}
                ordem={ordemNum}
                parteIdx={parteIdx}
                onParteIdx={setParteIdx}
                onMeta={(total, titulo) => {
                  setTotalPartes(total);
                  setParteTitulo(titulo);
                }}
                onConcluir={() => {
                  marcarFeita("ler");
                  setEtapa("flashcards");
                }}
              />
            )}
            {etapa === "flashcards" && (
              <FlashcardsView
                livroId={livroId}
                ordem={ordemNum}
                onConcluir={() => {
                  marcarFeita("flashcards");
                  setEtapa("questoes");
                }}
              />
            )}
            {etapa === "questoes" && (
              <QuestoesView
                livroId={livroId}
                ordem={ordemNum}
                onConcluir={() => {
                  marcarFeita("questoes");
                  setEtapa("erros");
                }}
              />
            )}
            {etapa === "erros" && (
              <ErrosCapituloView
                livroId={livroId}
                ordem={ordemNum}
                onConcluir={() => {
                  marcarFeita("erros");
                  setEtapa("simulado");
                }}
              />
            )}
            {etapa === "simulado" && (
              <SimuladoView
                livroId={livroId}
                ordem={ordemNum}
                onConcluir={() => marcarFeita("simulado")}
              />
            )}
          </Suspense>
        </div>
      </div>

      {/* RODAPÉ */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-3xl mx-auto px-3 pt-2.5 pb-2">
          <div className="grid grid-cols-3 gap-2">
            {prev ? (
              <Link
                to="/aulas/$materia/$livroId/$ordem"
                params={{ materia, livroId, ordem: String(prev.ordem) }}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card/60 hover:border-gold/40 transition px-2.5 py-1.5 min-w-0"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-gold shrink-0" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  Anterior
                </span>
              </Link>
            ) : (
              <span />
            )}
            <Link
              to="/aulas/$materia/$livroId"
              params={{ materia, livroId }}
              className="flex items-center justify-center rounded-lg border border-border bg-card/60 hover:border-gold/40 text-[10px] uppercase tracking-wider text-muted-foreground px-2.5 py-1.5"
            >
              Trilha
            </Link>
            {next ? (
              <Link
                to="/aulas/$materia/$livroId/$ordem"
                params={{ materia, livroId, ordem: String(next.ordem) }}
                className="flex items-center justify-end gap-1.5 rounded-lg border border-border bg-card/60 hover:border-gold/40 transition px-2.5 py-1.5 min-w-0"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                  Próxima
                </span>
                <ChevronRight className="h-3.5 w-3.5 text-gold shrink-0" />
              </Link>
            ) : (
              <span />
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}

// ------------ Header das partes ------------
function PartesHeader({
  total,
  atual,
  tituloParte,
  onPick,
}: {
  total: number;
  atual: number;
  tituloParte: string;
  onPick: (i: number) => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gold font-semibold">
          {atual === 0 ? "Introdução" : `Parte ${atual} de ${total - 1}`}
        </span>
        <span className="text-[10px] text-muted-foreground truncate ml-2 max-w-[60%] text-right">
          {tituloParte}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const done = i < atual;
          const active = i === atual;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPick(i)}
              aria-label={`Ir para parte ${i}`}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                done && "bg-gold",
                active && "bg-gold/80 step-walker",
                !done && !active && "bg-border/70 hover:bg-border",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
