import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROVAS_OAB_CATALOGO, type ProvaListItem } from "@/data/provas-oab-catalogo";

export const Route = createFileRoute("/_app/provas/")({
  head: () => ({
    meta: [
      { title: "Provas OAB — Edital, Prova e Gabarito | OAB na Risca" },
      {
        name: "description",
        content:
          "Catálogo completo dos Exames de Ordem Unificado: baixe edital, prova e gabarito oficiais da OAB de todas as edições.",
      },
    ],
  }),
  component: ProvasPage,
});

function ProvasPage() {
  const { data = PROVAS_OAB_CATALOGO, error } = useQuery<ProvaListItem[]>({
    queryKey: ["provas-oab", "lista"],
    initialData: PROVAS_OAB_CATALOGO,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provas_oab")
        .select("id, numero, titulo, ano, edital_url, prova_1fase_url, gabarito_1fase_url")
        .order("numero", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProvaListItem[];
    },
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="pb-10 space-y-6 md:space-y-8">
      <header className="px-4 pt-4 md:px-10 md:pt-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-gold text-gold-foreground grid place-items-center shadow-md">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Provas OAB</h1>
            <p className="text-sm text-muted-foreground">Edital, prova e gabarito de todos os exames oficiais.</p>
          </div>
        </div>
      </header>

      <section className="px-4 md:px-10">
        {error && data.length === 0 && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Não foi possível carregar as provas. Tente novamente em instantes.
          </div>
        )}
        {data.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Ainda não há provas catalogadas. Rode o seed do catálogo (server function <code>seedProvasOab</code>).
          </div>
        )}

        {data.length > 0 && (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {data.map((p) => (
              <li key={p.id}>
                <Link
                  to="/provas/$numero"
                  params={{ numero: String(p.numero) }}
                  className="block rounded-2xl border border-border bg-card hover:bg-accent hover:border-primary/40 transition-colors p-4 h-full"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-3xl font-bold tracking-tight text-foreground">
                      {p.numero}º
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.titulo}</div>
                  {p.ano && (
                    <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      {p.ano}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.edital_url && (
                      <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-foreground">Edital</span>
                    )}
                    {p.prova_1fase_url && (
                      <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-foreground">Prova</span>
                    )}
                    {p.gabarito_1fase_url && (
                      <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-foreground">Gabarito</span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
