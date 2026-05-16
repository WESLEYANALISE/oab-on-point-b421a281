import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/provas/$numero")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.numero}º Exame OAB — Prova, Gabarito e Edital | OAB na Risca` },
    ],
  }),
  component: ProvaDetalhePage,
});

type ProvaFull = {
  id: number;
  numero: number;
  titulo: string;
  ano: number | null;
  oab_source_url: string | null;
  edital_url: string | null;
  prova_1fase_url: string | null;
  gabarito_1fase_url: string | null;
};

function PdfButton({
  href,
  label,
  variant = "default",
}: {
  href?: string | null;
  label: string;
  variant?: "default" | "primary" | "gold";
}) {
  if (!href) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" /> {label}</span>
        <span className="text-xs">indisponível</span>
      </div>
    );
  }
  const base = "flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors border";
  const styles =
    variant === "gold"
      ? "bg-gradient-gold text-gold-foreground border-transparent hover:opacity-90"
      : variant === "primary"
      ? "bg-gradient-toga text-primary-foreground border-transparent hover:opacity-90"
      : "bg-card border-border text-foreground hover:bg-accent";
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${base} ${styles}`}>
      <span className="inline-flex items-center gap-2"><FileText className="h-4 w-4" /> {label}</span>
      <Download className="h-4 w-4 opacity-80" />
    </a>
  );
}

function ProvaDetalhePage() {
  const { numero } = Route.useParams();
  const { data, isLoading, error } = useQuery<ProvaFull | null>({
    queryKey: ["provas-oab", "detalhe", numero],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provas_oab")
        .select("*")
        .eq("numero", Number(numero))
        .maybeSingle();
      if (error) throw error;
      return (data as ProvaFull | null) ?? null;
    },
    staleTime: 5 * 60_000,
  });

  return (
    <div className="pb-10 space-y-6">
      <header className="px-4 pt-4 md:px-10 md:pt-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        )}
        {error && <p className="text-sm text-destructive">Erro ao carregar.</p>}
        {data && (
          <>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{data.titulo}</h1>
            {data.ano && <p className="text-sm text-muted-foreground mt-1">Ano: {data.ano}</p>}
          </>
        )}
      </header>

      {data && (
        <>
          {/* 1ª Fase */}
          <section className="px-4 md:px-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">1ª Fase</h2>
            <div className="grid gap-2 md:grid-cols-3">
              <PdfButton href={data.edital_url} label="Edital" variant="default" />
              <PdfButton href={data.prova_1fase_url} label="Prova" variant="primary" />
              <PdfButton href={data.gabarito_1fase_url} label="Gabarito" variant="gold" />
            </div>
          </section>

          {data.oab_source_url && (
            <div className="px-4 md:px-10 text-xs text-muted-foreground">
              Fonte oficial: <a className="underline" href={data.oab_source_url} target="_blank" rel="noopener noreferrer">examedeordem.oab.org.br</a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
