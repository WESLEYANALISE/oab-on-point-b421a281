import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, ChevronRight, Scale } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ESTATUTOS_DESTAQUE, ESTATUTOS_SLUGS } from "@/lib/vade-mecum-data";

export const Route = createFileRoute("/_app/vade-mecum/estatutos/")({
  head: () => ({
    meta: [
      { title: "Estatutos — Vade Mecum" },
      { name: "description", content: "Os 10 estatutos mais cobrados, organizados para consulta rápida." },
    ],
  }),
  component: EstatutosListPage,
});

type LeiRow = {
  slug: string;
  nome: string;
  nome_curto: string | null;
  total_artigos: number;
};

function EstatutosListPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["vade-mecum", "estatutos", "lista"],
    queryFn: async (): Promise<LeiRow[]> => {
      const { data, error } = await supabase
        .from("vade_mecum_leis")
        .select("slug, nome, nome_curto, total_artigos")
        .in("slug", ESTATUTOS_SLUGS);
      if (error) throw error;
      // ordenar pela ordem de destaque
      const order = new Map(ESTATUTOS_SLUGS.map((s, i) => [s, i]));
      return (data ?? []).slice().sort(
        (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
      );
    },
  });

  return (
    <div className="pb-20">
      <header className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(60% 80% at 20% 0%, color-mix(in oklab, var(--gold) 40%, transparent), transparent 60%), radial-gradient(50% 70% at 100% 100%, color-mix(in oklab, var(--primary) 50%, transparent), transparent 60%)",
          }}
        />
        <div className="relative px-4 md:px-8 pt-5 pb-7">
          <Link
            to="/vade-mecum"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Vade Mecum
          </Link>
          <div className="mt-4 flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gold/30 to-primary/30 border border-gold/30 grid place-items-center shrink-0">
              <ShieldCheck className="h-6 w-6 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold/90 font-semibold">
                Vade Mecum
              </p>
              <h1 className="font-display font-semibold text-[28px] md:text-[36px] leading-[1.05] tracking-tight mt-1">
                Estatutos
              </h1>
              <p className="text-sm md:text-[15px] text-muted-foreground mt-1.5 max-w-xl">
                Os 10 estatutos mais cobrados em prova, em ordem de relevância.
              </p>
            </div>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 mt-8">
        <ol className="relative border-l-2 border-primary/20 ml-3 space-y-3">
          {(isLoading ? Array.from({ length: 10 }) : data ?? []).map((row, i) => {
            const lei = row as LeiRow | undefined;
            return (
              <li key={lei?.slug ?? i} className="pl-5 relative group">
                <span className="absolute -left-[7px] top-4 h-3 w-3 rounded-full bg-primary border-2 border-background shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_25%,transparent)]" />
                {lei ? (
                  <Link
                    to="/vade-mecum/estatutos/$slug"
                    params={{ slug: lei.slug }}
                    className="w-full text-left rounded-2xl border border-border bg-gradient-to-br from-card to-card/60 hover:from-primary/10 hover:to-card hover:border-primary/40 active:scale-[0.98] transition-all shadow-sm px-3.5 py-3 flex items-center gap-3 cursor-pointer"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Scale className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-primary/80 font-semibold truncate">
                        Estatuto · {String(i + 1).padStart(2, "0")}
                      </p>
                      <p className="text-[14px] font-semibold leading-tight truncate text-foreground">
                        {ESTATUTOS_DESTAQUE.find((e) => e.slug === lei.slug)?.rotulo ?? lei.nome_curto ?? lei.nome}
                      </p>
                    </div>
                    <span className="text-[11px] text-primary font-semibold shrink-0">
                      {lei.total_artigos.toLocaleString("pt-BR")} arts.
                    </span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-card/40 px-3.5 py-3 h-[64px] animate-pulse" />
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
