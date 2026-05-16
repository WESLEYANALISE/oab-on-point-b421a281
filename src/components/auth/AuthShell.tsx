import { type ReactNode } from "react";

export function AuthShell({
  title, subtitle, children, footer,
}: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen relative bg-gradient-toga text-foreground overflow-hidden">
      <div className="absolute inset-0 bg-background/20" />
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-gold/10 to-transparent pointer-events-none" />

      <div className="relative min-h-screen flex items-center justify-center px-5 py-8 md:py-16">
        <div className="w-full max-w-[430px]">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl border border-gold/35 bg-background/65 shadow-xl shadow-black/30">
              <span className="font-display text-3xl font-extrabold text-gold">O</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/45 border border-gold/30 text-gold text-[10px] uppercase tracking-[0.22em] font-semibold">
              OAB na Risca
            </div>
            <h1 className="mt-4 font-display font-extrabold text-3xl md:text-4xl text-primary-foreground text-balance">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-sm md:text-base text-primary-foreground/78 leading-relaxed text-balance">{subtitle}</p>
            )}
          </div>

          <div className="rounded-3xl border border-gold/20 bg-background/82 p-5 md:p-6 shadow-2xl shadow-black/45">
            {children}
          </div>

          {footer && <div className="mt-5 text-center text-sm text-primary-foreground/70">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
