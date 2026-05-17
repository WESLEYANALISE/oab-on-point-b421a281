import { createFileRoute, Link } from "@tanstack/react-router";
import { NoticiaCard } from "@/components/shared/NoticiaCard";
import { getNoticias } from "@/data/noticias";

export const Route = createFileRoute("/_app/noticias")({
  head: () => ({
    meta: [
      { title: "Notícias OAB — STF, STJ, Legislação | OAB na Risca" },
      { name: "description", content: "Notícias jurídicas e do Exame de Ordem: STF, STJ, mudanças na lei, edital e carreira." },
    ],
  }),
  component: NoticiasPage,
});

function NoticiasPage() {
  const noticias = getNoticias();
  const categorias = Array.from(new Set(noticias.map((n) => n.categoria)));
  return (
    <div className="px-4 md:px-10 py-8 md:py-12 max-w-6xl">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mb-2">Atualidades jurídicas</p>
        <h1 className="font-display text-4xl md:text-5xl leading-tight">Notícias para quem vai fazer OAB</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl">
          STF, STJ, novas leis, edital do Exame de Ordem e dicas de carreira — tudo curado pensando no que cai na prova.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6">
        {["Todas", ...categorias].map((c) => (
          <button key={c} className="px-3 py-1.5 text-xs font-semibold rounded-full bg-muted hover:bg-accent transition-colors">
            {c}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {noticias.map((n) => <NoticiaCard key={n.id} noticia={n} />)}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10">
        <Link to="/app" className="hover:underline">Voltar ao início</Link>
      </p>
    </div>
  );
}
