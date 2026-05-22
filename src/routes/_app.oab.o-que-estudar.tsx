import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  ChevronDown,
  Sparkles,
  Search,
  BookOpen,
  Target,
} from "lucide-react";
import { MATERIAS_OAB_46, EDITAL_FONTE, type Materia } from "@/data/oab-materias-46";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/oab/o-que-estudar")({
  head: () => ({
    meta: [
      { title: "O que estudar — Edital do 46º Exame OAB" },
      {
        name: "description",
        content:
          "Conteúdo programático oficial do 46º Exame de Ordem Unificado: matérias, peso típico em questões e tópicos extraídos do edital da FGV/OAB.",
      },
    ],
  }),
  component: OQueEstudarPage,
});

function OQueEstudarPage() {
  const [query, setQuery] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);

  const materiasFiltradas = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MATERIAS_OAB_46;
    return MATERIAS_OAB_46.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        m.topicosChave.some((t) => t.toLowerCase().includes(q)) ||
        m.programa.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query]);

  const totalMin = MATERIAS_OAB_46.reduce((s, m) => s + m.questoes.min, 0);
  const totalMax = MATERIAS_OAB_46.reduce((s, m) => s + m.questoes.max, 0);
  const maxBar = Math.max(...MATERIAS_OAB_46.map((m) => m.questoes.max));

  return (
    <div className="pb-16">
      {/* Header */}
      <header className="px-4 pt-5 pb-6 bg-gradient-toga text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold mb-2">
          O que estudar
        </p>
        <h1 className="font-display font-bold text-[26px] md:text-[34px] leading-[1.1] tracking-tight mb-2">
          Matérias do {EDITAL_FONTE.exame}
        </h1>
        <p className="text-[13px] md:text-sm text-primary-foreground/80 leading-snug max-w-prose">
          Conteúdo programático completo, direto do edital oficial da FGV/OAB.
          Veja quanto cada matéria pesa na 1ª fase e onde focar seus estudos.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={EDITAL_FONTE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-gold text-[11px] font-semibold hover:bg-gold/25 transition"
          >
            <FileText className="h-3 w-3" /> Edital oficial (PDF)
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={EDITAL_FONTE.pagina}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/25 text-primary-foreground text-[11px] font-medium hover:bg-primary-foreground/20 transition"
          >
            <ExternalLink className="h-3 w-3" /> oab.org.br
          </a>
        </div>
      </header>

      {/* Resumo da prova */}
      <section className="px-4 mt-6">
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/30 grid place-items-center shrink-0">
              <Target className="h-4 w-4 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
                1ª Fase — Prova Objetiva
              </p>
              <h2 className="font-display font-semibold text-[18px] leading-tight tracking-tight">
                80 questões · {MATERIAS_OAB_46.length} matérias
              </h2>
              <p className="text-[13px] text-muted-foreground leading-snug mt-1">
                Para aprovação é necessário acertar pelo menos 40 questões (50%).
                Distribuição média histórica entre {totalMin}–{totalMax} questões
                por matéria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Distribuição visual */}
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="font-display font-semibold text-[16px] tracking-tight">
            Peso por matéria
          </h2>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-3">
          {MATERIAS_OAB_46.map((m) => {
            const pct = (m.questoes.max / maxBar) * 100;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setAberta(m.id);
                  document.getElementById(`materia-${m.id}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
                className="w-full text-left group"
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="text-[12.5px] font-medium leading-snug truncate group-hover:text-gold transition">
                    {m.nome}
                  </span>
                  <span className="text-[11px] tabular-nums text-muted-foreground shrink-0">
                    {m.questoes.min === m.questoes.max
                      ? `${m.questoes.min}`
                      : `${m.questoes.min}–${m.questoes.max}`}{" "}
                    q
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full bg-gradient-to-r", m.cor)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Busca */}
      <section className="px-4 mt-7">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-gold" />
          <h2 className="font-display font-semibold text-[16px] tracking-tight">
            Conteúdo programático
          </h2>
        </div>
        <div className="relative mb-4">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Buscar matéria ou tópico (ex: tutela, ICMS, jornada)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-card text-[13px] placeholder:text-muted-foreground focus:outline-none focus:border-gold/50 focus:ring-2 focus:ring-gold/15"
          />
        </div>

        <div className="space-y-3">
          {materiasFiltradas.length === 0 && (
            <p className="text-center text-[13px] text-muted-foreground py-8">
              Nenhuma matéria ou tópico encontrado.
            </p>
          )}
          {materiasFiltradas.map((m) => (
            <MateriaCard
              key={m.id}
              materia={m}
              aberta={aberta === m.id}
              onToggle={() => setAberta(aberta === m.id ? null : m.id)}
            />
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground leading-snug mt-6 text-center">
          Conteúdo extraído do Anexo II do Edital de Abertura do{" "}
          {EDITAL_FONTE.exame}, publicado em {EDITAL_FONTE.publicado} pelo
          Conselho Federal da OAB/FGV.
        </p>
      </section>
    </div>
  );
}

function MateriaCard({
  materia,
  aberta,
  onToggle,
}: {
  materia: Materia;
  aberta: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      id={`materia-${materia.id}`}
      className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm scroll-mt-4"
    >
      <button
        onClick={onToggle}
        className="w-full p-4 md:p-5 flex items-start gap-3 text-left hover:bg-accent/40 transition-colors"
      >
        <div
          className={cn(
            "h-11 w-11 rounded-xl bg-gradient-to-br grid place-items-center shrink-0 text-white shadow-sm",
            materia.cor,
          )}
        >
          <span className="font-display font-bold text-[15px] tabular-nums">
            {materia.questoes.min === materia.questoes.max
              ? materia.questoes.min
              : `${materia.questoes.min}–${materia.questoes.max}`}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-[15px] leading-tight tracking-tight">
            {materia.nome}
          </h3>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            {materia.questoes.min === materia.questoes.max
              ? `${materia.questoes.min} questões em média`
              : `${materia.questoes.min} a ${materia.questoes.max} questões na 1ª fase`}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {materia.topicosChave.slice(0, aberta ? undefined : 3).map((t) => (
              <span
                key={t}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/60 border border-border text-[10.5px] text-muted-foreground"
              >
                {t}
              </span>
            ))}
            {!aberta && materia.topicosChave.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/40 text-[10.5px] text-muted-foreground">
                +{materia.topicosChave.length - 3}
              </span>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground mt-1 shrink-0 transition-transform",
            aberta && "rotate-180",
          )}
        />
      </button>

      {aberta && (
        <div className="px-4 md:px-5 pb-5 pt-1 border-t border-border bg-muted/20 animate-fade-in">
          <p className="text-[10.5px] uppercase tracking-[0.18em] text-gold/90 font-semibold mt-4 mb-2">
            Conteúdo programático oficial
          </p>
          <ol className="space-y-1.5">
            {materia.programa.map((item, i) => (
              <li key={i} className="flex gap-2 text-[12.5px] leading-snug">
                <span className="text-gold/70 tabular-nums shrink-0">
                  {String(i + 1).padStart(2, "0")}.
                </span>
                <span className="text-foreground/85">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
