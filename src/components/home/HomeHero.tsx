import { Link } from "@tanstack/react-router";
import { Sparkles, Calendar } from "lucide-react";
import { CountdownExame } from "@/components/shared/CountdownExame";

const EXAM_LABEL = "Domingo, 23 de setembro de 2026";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      <div className="relative bg-gradient-toga text-primary-foreground">
        {/* texture */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* glow */}
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-primary/40 blur-3xl pointer-events-none" />

        <div className="relative px-5 md:px-10 pt-6 pb-7 md:py-12 max-w-6xl">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold text-[10px] uppercase tracking-[0.18em] font-semibold shadow-[0_0_24px_-8px_oklch(0.78_0.13_80/0.6)]">
              <Sparkles className="h-3 w-3" /> 42º Exame · 1ª fase
            </div>
            <Link
              to="/reta-final"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-foreground/10 border border-primary-foreground/25 text-primary-foreground text-xs font-medium hover:bg-primary-foreground/20 active:scale-95 transition"
            >
              <Calendar className="h-3.5 w-3.5" /> Calendário
            </Link>
          </div>

          <p className="text-[10px] uppercase tracking-[0.24em] text-primary-foreground/70 font-semibold mb-3">
            Faltam para o exame
          </p>
          <CountdownExame light hero />

          <div className="mt-6 pt-5 border-t border-primary-foreground/15 flex items-center gap-2.5 text-primary-foreground/85">
            <div className="h-6 w-6 rounded-full bg-gold/15 border border-gold/30 grid place-items-center">
              <Calendar className="h-3 w-3 text-gold" />
            </div>
            <p className="font-display text-sm md:text-base tracking-tight">{EXAM_LABEL}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
