import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Notebook } from "lucide-react";

export const Route = createFileRoute("/_app/oab/caderno-erros")({
  head: () => ({ meta: [{ title: "Caderno de erros · 1ª Fase — OAB na Risca" }] }),
  component: CadernoErrosPage,
});

function CadernoErrosPage() {
  return (
    <div className="pb-16">
      <header className="px-4 pt-5 pb-7 md:px-8 bg-gradient-toga text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <Link to="/oab/primeira-fase" className="relative inline-flex items-center gap-1.5 text-[12px] text-primary-foreground/80 hover:text-primary-foreground mb-3">
          <ArrowLeft className="h-3.5 w-3.5" /> 1ª Fase
        </Link>
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold mb-2">Revisão personalizada</p>
        <h1 className="font-display font-semibold text-3xl md:text-4xl leading-tight tracking-tight">Caderno de erros</h1>
        <p className="mt-2 text-[13px] text-primary-foreground/80 max-w-xl">Todas as questões que você errou ficam reunidas aqui para revisão direcionada.</p>
      </header>

      <div className="px-4 md:px-8 mt-8">
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gold/12 border border-gold/25 items-center justify-center mb-3">
            <Notebook className="h-5 w-5 text-gold" />
          </div>
          <p className="font-display font-semibold text-lg">Seu caderno está vazio</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Resolva simulados e questões para começar a alimentar automaticamente seu caderno de erros.
          </p>
          <Link to="/simulados" className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full bg-gold text-gold-foreground text-[13px] font-semibold hover:bg-gold/90 transition">
            Ir para simulados
          </Link>
        </div>
      </div>
    </div>
  );
}
