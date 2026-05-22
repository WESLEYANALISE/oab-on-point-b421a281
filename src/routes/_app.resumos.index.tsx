import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useMemo } from "react";
import { z } from "zod";
import { FileText, BookOpen, ChevronRight, FolderOpen } from "lucide-react";
import { listarLivrosComResumo } from "@/lib/resumos.functions";
import { cn } from "@/lib/utils";
import { supabaseImage, supabaseImageSrcSet } from "@/lib/supabase-image";

// Ordem cronológica de incidência na 1ª fase da OAB + emoji/gradiente
// (mesma paleta dos cards de matérias na home)
const AREA_META: Record<string, { ordem: number; emoji: string; cor: string }> = {
  "Ética": { ordem: 1, emoji: "⚖️", cor: "from-primary to-primary/70" },
  "Ética Profissional": { ordem: 1, emoji: "⚖️", cor: "from-primary to-primary/70" },
  "Filosofia do Direito": { ordem: 2, emoji: "🧠", cor: "from-secondary to-secondary/70" },
  "Filosofia": { ordem: 2, emoji: "🧠", cor: "from-secondary to-secondary/70" },
  "Direitos Humanos": { ordem: 3, emoji: "🕊️", cor: "from-primary to-primary/70" },
  "Direito Constitucional": { ordem: 4, emoji: "📜", cor: "from-secondary to-secondary/70" },
  "Direito Internacional": { ordem: 5, emoji: "🌍", cor: "from-primary to-primary/70" },
  "Direito Tributário": { ordem: 6, emoji: "💰", cor: "from-secondary to-secondary/70" },
  "Direito Financeiro": { ordem: 7, emoji: "🏦", cor: "from-primary to-primary/70" },
  "Direito Administrativo": { ordem: 8, emoji: "🏛️", cor: "from-secondary to-secondary/70" },
  "Direito Ambiental": { ordem: 9, emoji: "🌿", cor: "from-primary to-primary/70" },
  "Direito Civil": { ordem: 10, emoji: "📚", cor: "from-secondary to-secondary/70" },
  "Direito Processual Civil": { ordem: 11, emoji: "🧾", cor: "from-primary to-primary/70" },
  "Processo Civil": { ordem: 11, emoji: "🧾", cor: "from-primary to-primary/70" },
  "Direito do Consumidor": { ordem: 12, emoji: "🛒", cor: "from-secondary to-secondary/70" },
  "Direito Empresarial": { ordem: 13, emoji: "🏢", cor: "from-primary to-primary/70" },
  "Direito Concorrencial": { ordem: 14, emoji: "📈", cor: "from-secondary to-secondary/70" },
  "ECA": { ordem: 15, emoji: "🧒", cor: "from-primary to-primary/70" },
  "ECA — Criança e Adolescente": { ordem: 15, emoji: "🧒", cor: "from-primary to-primary/70" },
  "Direito Penal": { ordem: 16, emoji: "🔒", cor: "from-secondary to-secondary/70" },
  "Direito Processual Penal": { ordem: 17, emoji: "🛡️", cor: "from-primary to-primary/70" },
  "Processo Penal": { ordem: 17, emoji: "🛡️", cor: "from-primary to-primary/70" },
  "Direito do Trabalho": { ordem: 18, emoji: "👷", cor: "from-secondary to-secondary/70" },
  "Direito Processual do Trabalho": { ordem: 19, emoji: "📂", cor: "from-primary to-primary/70" },
  "Processo do Trabalho": { ordem: 19, emoji: "📂", cor: "from-primary to-primary/70" },
};

function metaPara(nome: string, idx: number) {
  const m = AREA_META[nome];
  if (m) return m;
  // fallback: alterna gradiente, ordena depois das conhecidas
  return {
    ordem: 100 + idx,
    emoji: "📖",
    cor: idx % 2 === 0 ? "from-primary to-primary/70" : "from-secondary to-secondary/70",
  };
}

const searchSchema = z.object({
  area: z.string().optional(),
});

const resumosQueryOptions = (fn: () => Promise<Awaited<ReturnType<typeof listarLivrosComResumo>>>) =>
  queryOptions({
    queryKey: ["resumos-publico"],
    queryFn: fn,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

export const Route = createFileRoute("/_app/resumos/")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(resumosQueryOptions(() => listarLivrosComResumo()));
  },
  head: () => ({
    meta: [
      { title: "Resumos — OAB na Risca" },
      { name: "description", content: "Resumos didáticos dos livros da biblioteca, capítulo por capítulo." },
    ],
  }),
  component: ResumosIndex,
});

const SLUG_LABEL: Record<string, string> = {
  estudos: "Estudos",
  classicos: "Clássicos",
  oratoria: "Oratória",
  lideranca: "Liderança",
  politica: "Política",
  "fora-da-toga": "Fora da Toga",
};

const AREA_SEM = "Sem área";

function ResumosIndex() {
  const { area } = Route.useSearch();
  const navigate = useNavigate({ from: "/resumos" });
  const fn = useServerFn(listarLivrosComResumo);
  const { data } = useQuery(resumosQueryOptions(fn));

  const livros = data ?? [];

  const areas = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of livros) {
      const a = (l.area && l.area.trim()) || AREA_SEM;
      map.set(a, (map.get(a) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([nome, total], i) => ({ nome, total, meta: metaPara(nome, i) }))
      .sort((a, b) => a.meta.ordem - b.meta.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
  }, [livros]);

  const livrosDaArea = useMemo(() => {
    if (!area) return [];
    return livros.filter((l) => ((l.area && l.area.trim()) || AREA_SEM) === area);
  }, [livros, area]);

  const showAreas = !area;

  return (
    <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
      <header className="mb-6">
        {area ? (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5" /> Área
            </p>
            <h1 className="font-display text-3xl md:text-4xl mt-1">{area}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {livrosDaArea.length} {livrosDaArea.length === 1 ? "livro" : "livros"} com resumo.
            </p>
          </>

        ) : (
          <>
            <p className="text-xs uppercase tracking-widest text-muted-foreground inline-flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> Biblioteca
            </p>
            <h1 className="font-display text-3xl md:text-4xl mt-1">Resumos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Escolha uma área para ver os livros disponíveis.
            </p>
          </>
        )}
      </header>

      {!livros.length && (
        <div className="py-16 text-center border border-dashed rounded-xl text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-60" />
          <p>Nenhum resumo disponível ainda.</p>
          <p className="text-xs mt-1">Os resumos aparecem aqui assim que forem gerados.</p>
        </div>
      )}

      {showAreas && areas.length > 0 && (
        <ol className="relative ml-5 space-y-3 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-gold/60 before:via-gold/30 before:to-transparent">
          {areas.map(({ nome, total, meta }, i) => (
            <li key={nome} className="relative pl-7">
              <span className="absolute -left-4 top-4 h-8 w-8 rounded-full bg-gradient-toga border border-gold/50 grid place-items-center text-base shadow-[0_4px_14px_-2px_oklch(0.78_0.13_80/0.45)] ring-4 ring-background z-10">
                {meta.emoji}
              </span>
              <button
                onClick={() => navigate({ search: { area: nome } })}
                className="group block w-full text-left min-h-[80px] rounded-xl border border-gold/15 bg-gradient-to-br from-[oklch(0.28_0.07_18)] to-[oklch(0.19_0.04_18)] p-4 hover:border-gold/40 hover:-translate-y-0.5 transition-all shadow-md shadow-black/30"
              >
                <div className="flex items-center justify-between gap-3 h-full">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-semibold">
                      Área {String(i + 1).padStart(2, "0")}
                    </p>
                    <p className="font-display text-[15px] md:text-base leading-snug mt-1 break-words text-primary-foreground line-clamp-2">
                      {nome}
                    </p>
                    <p className="text-[11px] text-primary-foreground/60 mt-0.5">
                      {total} {total === 1 ? "livro" : "livros"}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gold/15 border border-gold/30 grid place-items-center shrink-0 group-hover:bg-gold transition">
                    <ChevronRight className="h-4 w-4 text-gold group-hover:text-gold-foreground" />
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}

      {!showAreas && (
        <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
          {livrosDaArea.map((l) => (
            <li key={l.id}>
              <Link
                to="/resumos/$livroId"
                params={{ livroId: l.id }}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="w-14 h-20 rounded overflow-hidden bg-muted border border-border flex-shrink-0">
                  {l.capa ? (
                    <img
                      src={supabaseImage(l.capa, { w: 112, q: 78 }) ?? l.capa}
                      srcSet={supabaseImageSrcSet(l.capa, 56, 78)}
                      sizes="56px"
                      alt={l.titulo}
                      loading="lazy"
                      decoding="async"
                      width={56}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {SLUG_LABEL[l.biblioteca_slug] ?? l.biblioteca_slug}
                  </p>
                  <p className="font-sans text-sm font-medium text-foreground line-clamp-2 leading-snug mt-0.5">
                    {l.titulo}
                  </p>
                  {l.autor && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{l.autor}</p>}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {l.capitulos_gerados}/{l.total_capitulos} capítulos
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
