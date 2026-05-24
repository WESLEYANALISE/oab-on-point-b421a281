import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, Filter, ListChecks, Sparkles } from "lucide-react";
import {
  listarAreasFlashcardsCurados,
  listarCardsDaArea,
  type FlashcardCurado,
} from "@/lib/flashcards-curados.functions";
import { FlashcardCuradoViewer } from "@/components/flashcards/FlashcardCuradoViewer";
import { MateriaGlyph } from "@/components/aulas/MateriaGlyph";
import { areaToMateriaId, areaAccent } from "@/lib/flashcards-area-icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const areasQO = () =>
  queryOptions({
    queryKey: ["flashcards", "tema-areas"],
    queryFn: async () => {
      // Server fn não pode ser chamada diretamente no client com tipos corretos,
      // mas o fetch interno funciona; chamamos via wrapper a partir do componente.
      // Placeholder: substituído por wrapper que usa useServerFn.
      return [] as Array<{ area: string; total: number }>;
    },
    staleTime: 5 * 60_000,
  });

const cardsAreaQO = (area: string) =>
  queryOptions({
    queryKey: ["flashcards", "tema-cards-area", area],
    queryFn: async () => [] as FlashcardCurado[],
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/_app/flashcards-tema")({
  head: () => ({
    meta: [
      { title: "Flashcards por tema — OAB na Risca" },
      {
        name: "description",
        content: "Flashcards por área com explicação e exemplos práticos. Estude para a OAB no formato pergunta–resposta.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    area: typeof s.area === "string" ? s.area : undefined,
    caps: typeof s.caps === "string" ? s.caps : undefined,
  }),
  component: FlashcardsTema,
});

function FlashcardsTema() {
  const { area } = Route.useSearch();
  if (area) return <AreaPlayerView area={area} />;
  return <AreasView />;
}

/* ============================ Áreas ============================ */

const listVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
};

function AreasView() {
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const listAreasFn = useServerFn(listarAreasFlashcardsCurados);
  const listCardsFn = useServerFn(listarCardsDaArea);

  const { data: areas } = useSuspenseQuery({
    ...areasQO(),
    queryFn: () => listAreasFn(),
  });

  function prefetchArea(area: string) {
    qc.prefetchQuery({
      ...cardsAreaQO(area),
      queryFn: () => listCardsFn({ data: { area, limit: 500 } }),
    });
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between mb-5"
      >
        <div>
          <h1 className="font-display text-2xl md:text-3xl">Flashcards por tema</h1>
          <p className="text-sm text-muted-foreground mt-1">Escolha uma área para começar</p>
        </div>
        <Link to="/flashcards" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0">
          Minha revisão
        </Link>
      </motion.div>

      {areas.length === 0 ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-muted-foreground py-12 text-center"
        >
          Nenhum tema disponível ainda. Volte em breve!
        </motion.p>
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="grid gap-2.5"
        >
          {areas.map((a) => {
            const mid = areaToMateriaId(a.area);
            const accent = areaAccent(a.area);
            return (
              <motion.li key={a.area} variants={itemVariants}>
                <button
                  onClick={() => navigate({ to: "/flashcards-tema", search: { area: a.area } })}
                  onMouseEnter={() => prefetchArea(a.area)}
                  onTouchStart={() => prefetchArea(a.area)}
                  className="group w-full h-20 flex items-center gap-3 px-3 rounded-2xl border bg-card hover:bg-accent/40 active:scale-[0.985] transition text-left relative overflow-hidden"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${accent}14`,
                  }}
                >
                  <div
                    className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl pointer-events-none transition-opacity group-hover:opacity-50"
                    style={{ background: accent }}
                    aria-hidden
                  />
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-muted/40 grid place-items-center relative">
                    <MateriaGlyph materiaId={mid} className="h-12 w-12" />
                  </div>
                  <div className="flex-1 min-w-0 relative">
                    <p className="text-sm font-semibold truncate">{a.area}</p>
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
                      <Sparkles className="h-3 w-3" style={{ color: accent }} />
                      {a.total} flashcards
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
}

/* ============================ Player da área ============================ */

function AreaPlayerView({ area }: { area: string }) {
  const navigate = Route.useNavigate();
  const { caps } = Route.useSearch();
  const listCardsFn = useServerFn(listarCardsDaArea);

  const { data: cards } = useSuspenseQuery({
    ...cardsAreaQO(area),
    queryFn: () => listCardsFn({ data: { area, limit: 500 } }),
  });

  // Capítulos derivados dos próprios cards (sem nova request).
  const capitulos = useMemo(() => {
    const map = new Map<string, { id: string; titulo: string; total: number }>();
    for (const c of cards) {
      const cur = map.get(c.resumo_capitulo_id) ?? {
        id: c.resumo_capitulo_id,
        titulo: c.capitulo_titulo ?? "Capítulo",
        total: 0,
      };
      cur.total++;
      map.set(c.resumo_capitulo_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [cards]);

  const selectedIds = useMemo(() => {
    if (!caps) return new Set<string>();
    return new Set(caps.split(",").filter(Boolean));
  }, [caps]);

  const usingSelection = selectedIds.size > 0;

  const visibleCards = useMemo(() => {
    if (!usingSelection) return cards;
    return cards.filter((c) => selectedIds.has(c.resumo_capitulo_id));
  }, [cards, selectedIds, usingSelection]);

  const accent = areaAccent(area);
  const mid = areaToMateriaId(area);

  function setMode(mode: "todos" | "selecionar") {
    if (mode === "todos") {
      navigate({ to: "/flashcards-tema", search: { area } });
    }
  }

  function toggleCap(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const csv = Array.from(next).join(",");
    navigate({
      to: "/flashcards-tema",
      search: { area, caps: csv.length ? csv : undefined },
    });
  }

  function clearSelection() {
    navigate({ to: "/flashcards-tema", search: { area } });
  }

  function selectAll() {
    const csv = capitulos.map((c) => c.id).join(",");
    navigate({ to: "/flashcards-tema", search: { area, caps: csv || undefined } });
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-5"
      >
        <button
          onClick={() => navigate({ to: "/flashcards-tema" })}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Áreas
        </button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-muted/40 grid place-items-center shrink-0">
            <MateriaGlyph materiaId={mid} className="h-10 w-10" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-2xl md:text-3xl truncate">{area}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {visibleCards.length} flashcards
              {usingSelection && ` · ${selectedIds.size} de ${capitulos.length} capítulos`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Toggle Todos / Selecionar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-5 flex items-center gap-2"
      >
        <div className="relative grid grid-cols-2 rounded-full border bg-muted/40 p-1 flex-1 max-w-[280px]">
          <button
            onClick={() => setMode("todos")}
            className={`relative z-10 text-xs font-semibold py-1.5 rounded-full transition ${!usingSelection ? "text-primary-foreground" : "text-muted-foreground"}`}
          >
            Todos
          </button>
          <SelectChaptersSheet
            capitulos={capitulos}
            selected={selectedIds}
            onToggle={toggleCap}
            onClear={clearSelection}
            onAll={selectAll}
            trigger={
              <button
                className={`relative z-10 text-xs font-semibold py-1.5 rounded-full transition inline-flex items-center justify-center gap-1 ${usingSelection ? "text-primary-foreground" : "text-muted-foreground"}`}
              >
                <Filter className="h-3 w-3" />
                Selecionar
              </button>
            }
          />
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full"
            style={{
              left: usingSelection ? "calc(50% + 0px)" : "4px",
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              boxShadow: `0 6px 18px -6px ${accent}aa`,
            }}
            aria-hidden
          />
        </div>
        {usingSelection && (
          <button
            onClick={clearSelection}
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            limpar
          </button>
        )}
      </motion.div>

      {/* Viewer */}
      {visibleCards.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          Nenhum flashcard com os filtros atuais.
        </motion.div>
      ) : (
        <motion.div
          key={usingSelection ? `sel-${selectedIds.size}` : "todos"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FlashcardCuradoViewer cards={visibleCards} accent={accent} />
        </motion.div>
      )}
    </div>
  );
}

function SelectChaptersSheet({
  capitulos,
  selected,
  onToggle,
  onClear,
  onAll,
  trigger,
}: {
  capitulos: Array<{ id: string; titulo: string; total: number }>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  onAll: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="inline-flex items-center gap-2">
            <ListChecks className="h-4 w-4" /> Selecionar capítulos
          </SheetTitle>
        </SheetHeader>
        <div className="flex items-center gap-2 mt-3 mb-3">
          <Button variant="outline" size="sm" onClick={onAll}>Selecionar todos</Button>
          <Button variant="ghost" size="sm" onClick={onClear}>Limpar</Button>
          <div className="ml-auto text-xs text-muted-foreground">
            {selected.size}/{capitulos.length}
          </div>
        </div>
        <ul className="space-y-1.5 overflow-y-auto max-h-[55vh] pr-1">
          {capitulos.map((c) => {
            const checked = selected.has(c.id);
            return (
              <li key={c.id}>
                <label
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${checked ? "bg-accent/40 border-gold/40" : "bg-card hover:bg-accent/30"}`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => onToggle(c.id)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.titulo}</p>
                    <p className="text-[11px] text-muted-foreground">{c.total} flashcards</p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <Button className="w-full" onClick={() => setOpen(false)}>Pronto</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
