import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import estudosImg from "@/assets/biblio-estudos.jpg";
import classicosImg from "@/assets/biblio-classicos.jpg";
import oratoriaImg from "@/assets/biblio-oratoria.jpg";
import liderancaImg from "@/assets/biblio-lideranca.jpg";
import politicaImg from "@/assets/biblio-politica.jpg";
import foraDaTogaImg from "@/assets/biblio-fora-da-toga.jpg";

const BIBLIOTECAS = [
  { slug: "estudos", title: "Biblioteca de Estudos", subtitle: "Resumos e materiais por área", table: "BIBLIOTECA-ESTUDOS", cover: estudosImg },
  { slug: "classicos", title: "Clássicos do Direito", subtitle: "Obras fundamentais", table: "BIBLIOTECA-CLASSICOS", cover: classicosImg },
  { slug: "oratoria", title: "Oratória", subtitle: "Comunicação e argumentação", table: "BIBLIOTECA-ORATORIA", cover: oratoriaImg },
  { slug: "lideranca", title: "Liderança", subtitle: "Gestão e influência", table: "BIBLIOTECA-LIDERANÇA", cover: liderancaImg },
  { slug: "politica", title: "Política", subtitle: "Pensamento político e jurídico", table: "BIBLIOTECA-POLITICA", cover: politicaImg },
  { slug: "fora-da-toga", title: "Fora da Toga", subtitle: "Leituras complementares", table: "BIBLIOTECA-FORA-DA-TOGA", cover: foraDaTogaImg },
] as const;

export const Route = createFileRoute("/_app/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca · OAB na Risca" }] }),
  component: BibliotecaHub,
});

function BibliotecaHub() {
  const navigate = useNavigate();
  const { data: counts } = useQuery({
    queryKey: ["biblioteca-counts"],
    queryFn: async () => {
      const out: Record<string, number> = {};
      await Promise.all(
        BIBLIOTECAS.map(async (b) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { count } = await (supabase as any).from(b.table).select("id", { count: "exact", head: true });
          out[b.slug] = count ?? 0;
        }),
      );
      return out;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header próprio da biblioteca */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="p-2 -ml-2 rounded-full hover:bg-muted"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground leading-tight">Biblioteca</h1>
            <p className="text-xs text-muted-foreground">Livros, resumos e leituras</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-3">
        <ul className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card">
          {BIBLIOTECAS.map((b) => (
            <li key={b.slug}>
              <Link
                to="/biblioteca/$slug"
                params={{ slug: b.slug }}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
              >
                <img
                  src={b.cover}
                  alt={b.title}
                  width={64}
                  height={64}
                  loading="lazy"
                  decoding="async"
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-border"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground leading-tight">{b.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.subtitle}</div>
                  <div className="text-[11px] text-muted-foreground/80 mt-1">
                    {counts?.[b.slug] ?? "—"} livros
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
