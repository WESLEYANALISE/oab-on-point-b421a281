import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Brain, ChevronRight, Loader2 } from "lucide-react";
import {
  listarAreasFlashcardsCurados,
  listarLivrosDaAreaFlashcards,
  listarCapitulosFlashcards,
  listarCardsDoCapitulo,
} from "@/lib/flashcards-curados.functions";
import { FlashcardCuradoViewer } from "@/components/flashcards/FlashcardCuradoViewer";

export const Route = createFileRoute("/_app/flashcards-tema")({
  head: () => ({
    meta: [
      { title: "Flashcards por tema — OAB na Risca" },
      {
        name: "description",
        content: "Flashcards intuitivos por área e capítulo, com explicação e exemplos práticos. Estude para a OAB no formato pergunta–resposta.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    area: typeof s.area === "string" ? s.area : undefined,
    livro: typeof s.livro === "string" ? s.livro : undefined,
    capitulo: typeof s.capitulo === "string" ? s.capitulo : undefined,
  }),
  component: FlashcardsTema,
});

function FlashcardsTema() {
  const { area, livro, capitulo } = Route.useSearch();
  const navigate = Route.useNavigate();

  if (capitulo) return <CapituloView capituloId={capitulo} backTo={() => navigate({ to: "/flashcards-tema", search: { area, livro } })} />;
  if (livro) return <LivroView livroId={livro} backTo={() => navigate({ to: "/flashcards-tema", search: { area } })} onCap={(id) => navigate({ to: "/flashcards-tema", search: { area, livro, capitulo: id } })} />;
  if (area) return <AreaView area={area} backTo={() => navigate({ to: "/flashcards-tema" })} onLivro={(id) => navigate({ to: "/flashcards-tema", search: { area, livro: id } })} />;
  return <AreasView onArea={(a) => navigate({ to: "/flashcards-tema", search: { area: a } })} />;
}

function Header({ title, sub }: { title: string; sub?: string; back?: () => void }) {
  return (
    <header className="mb-5">
      <h1 className="font-display text-2xl md:text-3xl">{title}</h1>
      {sub && <p className="text-sm text-muted-foreground mt-1">{sub}</p>}
    </header>
  );
}


function AreasView({ onArea }: { onArea: (area: string) => void }) {
  const fn = useServerFn(listarAreasFlashcardsCurados);
  const { data, isLoading } = useQuery({
    queryKey: ["fc-tema-areas"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Header title="Flashcards por tema" sub="Escolha uma área para começar" />
        <Link to="/flashcards" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          Minha revisão
        </Link>
      </div>
      {isLoading ? (
        <Loading />
      ) : !data || data.length === 0 ? (
        <Empty msg="Nenhum tema disponível ainda. Volte em breve!" />
      ) : (
        <ul className="grid gap-2">
          {data.map((a) => (
            <li key={a.area}>
              <button
                onClick={() => onArea(a.area)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/40 transition text-left"
              >
                <div className="h-10 w-10 rounded-lg bg-gradient-gold grid place-items-center text-gold-foreground">
                  <Brain className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.area}</p>
                  <p className="text-xs text-muted-foreground">{a.total} flashcards</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AreaView({ area, backTo, onLivro }: { area: string; backTo: () => void; onLivro: (id: string) => void }) {
  const fn = useServerFn(listarLivrosDaAreaFlashcards);
  const { data, isLoading } = useQuery({
    queryKey: ["fc-tema-livros", area],
    queryFn: () => fn({ data: { area } }),
    staleTime: 60_000,
  });
  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <Header title={area} sub="Escolha um livro" back={backTo} />
      {isLoading ? <Loading /> : !data || data.length === 0 ? <Empty msg="Sem livros nesta área." /> : (
        <ul className="grid gap-2">
          {data.map((l) => (
            <li key={l.id}>
              <button
                onClick={() => onLivro(l.id)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/40 transition text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{l.titulo}</p>
                  <p className="text-xs text-muted-foreground">{l.total} flashcards</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LivroView({ livroId, backTo, onCap }: { livroId: string; backTo: () => void; onCap: (id: string) => void }) {
  const fn = useServerFn(listarCapitulosFlashcards);
  const { data, isLoading } = useQuery({
    queryKey: ["fc-tema-caps", livroId],
    queryFn: () => fn({ data: { resumo_livro_id: livroId } }),
    staleTime: 60_000,
  });
  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      <Header title="Capítulos" sub="Escolha por onde começar" back={backTo} />
      {isLoading ? <Loading /> : !data || data.length === 0 ? <Empty msg="Sem capítulos." /> : (
        <ul className="grid gap-2">
          {data.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onCap(c.id)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/40 transition text-left"
              >
                <div className="h-9 w-9 rounded-lg bg-muted grid place-items-center text-xs tabular-nums font-semibold">
                  {c.ordem + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.titulo}</p>
                  <p className="text-xs text-muted-foreground">{c.total} flashcards</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CapituloView({ capituloId, backTo }: { capituloId: string; backTo: () => void }) {
  const fn = useServerFn(listarCardsDoCapitulo);
  const { data, isLoading } = useQuery({
    queryKey: ["fc-tema-cards", capituloId],
    queryFn: () => fn({ data: { resumo_capitulo_id: capituloId } }),
    staleTime: 60_000,
  });
  return (
    <div className="px-4 md:px-8 py-6 max-w-2xl mx-auto">
      <button onClick={backTo} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      {isLoading ? <Loading /> : <FlashcardCuradoViewer cards={data ?? []} />}
    </div>
  );
}

function Loading() {
  return (
    <div className="py-12 text-center text-muted-foreground inline-flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
    </div>
  );
}
function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-muted-foreground py-12 text-center">{msg}</p>;
}
