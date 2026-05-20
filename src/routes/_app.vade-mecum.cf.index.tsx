import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, ChevronRight, Landmark, ScrollText } from "lucide-react";
import brasao from "@/assets/brasao-republica.png";

export const Route = createFileRoute("/_app/vade-mecum/cf/")({
  head: () => ({
    meta: [
      { title: "Constituição Federal — Vade Mecum" },
      { name: "description", content: "Constituição Federal de 1988 e Ato das Disposições Constitucionais Transitórias (ADCT)." },
    ],
  }),
  component: CfSelecaoPage,
});

function CfSelecaoPage() {
  return (
    <div className="pb-24">
      {/* Header dourado com brasão */}
      <header className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.22] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(70% 60% at 50% 0%, color-mix(in oklab, var(--gold) 35%, transparent), transparent 65%), radial-gradient(50% 70% at 0% 100%, color-mix(in oklab, var(--primary) 40%, transparent), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative px-4 md:px-8 pt-5 pb-6">
          <div className="flex flex-col items-center text-center">
            <img
              src={brasao}
              alt="Brasão da República"
              width={80}
              height={80}
              className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-[0_0_22px_color-mix(in_oklab,var(--gold)_30%,transparent)]"
              loading="eager"
            />
            <h1 className="font-display font-semibold text-[18px] sm:text-[22px] md:text-[26px] tracking-[0.04em] mt-2.5 leading-tight uppercase">
              Constituição Federal
            </h1>
            <p className="text-[12.5px] text-muted-foreground mt-1.5">1988</p>
            <a
              href="https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 mt-2.5 text-[12px] text-gold hover:text-gold/80 transition-colors font-medium"
            >
              <ExternalLink className="h-3 w-3" />
              Ver no Planalto
            </a>
            <div className="mt-4 w-24 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          </div>
        </div>
      </header>

      {/* Opções */}
      <section className="px-4 md:px-8 mt-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-3">
          Escolha o que ler
        </p>

        <div className="space-y-3">
          <Link
            to="/vade-mecum/cf/$parte"
            params={{ parte: "principal" }}
            className="group relative block overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-card to-card/60 p-5 hover:border-gold/60 hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <span
              aria-hidden
              className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/10 blur-2xl pointer-events-none"
            />
            <div className="relative flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gold/25 to-primary/20 border border-gold/40 grid place-items-center shrink-0 text-gold">
                <Landmark className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/90 font-semibold">
                  Carta Magna
                </p>
                <h3 className="font-display font-semibold text-[18px] leading-tight mt-1">
                  Constituição Federal
                </h3>
                <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">
                  Corpo principal da CF/88 — Arts. 1º ao 250.
                </p>
                <p className="text-[11px] text-gold/80 font-medium mt-2">250 artigos</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </div>
          </Link>

          <Link
            to="/vade-mecum/cf/$parte"
            params={{ parte: "adct" }}
            className="group relative block overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/60 p-5 hover:border-gold/40 hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <div className="relative flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-secondary/60 border border-border/60 grid place-items-center shrink-0 text-foreground/80">
                <ScrollText className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/85 font-semibold">
                  Disposições Transitórias
                </p>
                <h3 className="font-display font-semibold text-[18px] leading-tight mt-1">
                  ADCT
                </h3>
                <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">
                  Ato das Disposições Constitucionais Transitórias.
                </p>
                <p className="text-[11px] text-gold/80 font-medium mt-2">145 artigos</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
