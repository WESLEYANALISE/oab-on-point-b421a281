import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Mic, Users, Vote, Briefcase, GraduationCap } from "lucide-react";

const BIBLIOTECAS = [
  { slug: "estudos", title: "Biblioteca de Estudos", table: "BIBLIOTECA-ESTUDOS", icon: GraduationCap, accent: "from-amber-500/20 to-amber-700/10" },
  { slug: "classicos", title: "Clássicos do Direito", table: "BIBLIOTECA-CLASSICOS", icon: BookOpen, accent: "from-indigo-500/20 to-indigo-700/10" },
  { slug: "oratoria", title: "Oratória", table: "BIBLIOTECA-ORATORIA", icon: Mic, accent: "from-rose-500/20 to-rose-700/10" },
  { slug: "lideranca", title: "Liderança", table: "BIBLIOTECA-LIDERANÇA", icon: Users, accent: "from-emerald-500/20 to-emerald-700/10" },
  { slug: "politica", title: "Política", table: "BIBLIOTECA-POLITICA", icon: Vote, accent: "from-sky-500/20 to-sky-700/10" },
  { slug: "fora-da-toga", title: "Fora da Toga", table: "BIBLIOTECA-FORA-DA-TOGA", icon: Briefcase, accent: "from-fuchsia-500/20 to-fuchsia-700/10" },
] as const;

export const Route = createFileRoute("/_app/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca · OAB na Risca" }] }),
  component: BibliotecaHub,
});

function BibliotecaHub() {
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
    <div className="container mx-auto px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1 text-foreground">Biblioteca</h1>
      <p className="text-sm text-muted-foreground mb-6">Livros, resumos e leituras essenciais.</p>
      <div className="grid grid-cols-2 gap-3">
        {BIBLIOTECAS.map((b) => {
          const Icon = b.icon;
          return (
            <Link
              key={b.slug}
              to="/biblioteca/$slug"
              params={{ slug: b.slug }}
              className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${b.accent} p-4 aspect-square flex flex-col justify-between hover:scale-[1.02] transition-transform`}
            >
              <Icon className="w-7 h-7 text-foreground/80" />
              <div>
                <div className="text-sm font-semibold text-foreground leading-tight">{b.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{counts?.[b.slug] ?? "—"} livros</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
