import { type ReactNode } from "react";
import authBg from "@/assets/auth-bg.jpg";

export function AuthShell({
  title, subtitle, children, footer,
}: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-screen relative bg-background text-foreground overflow-hidden">
      <img
        src={authBg}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.18_0.07_18)/0.75] via-[oklch(0.13_0.04_18)/0.85] to-[oklch(0.09_0.02_18)/0.96]" />
      <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-primary/40 blur-3xl pointer-events-none" />

      <div className="relative min-h-screen flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/15 border border-gold/35 text-gold text-[10px] uppercase tracking-[0.22em] font-semibold">
              OAB na Risca
            </div>
            <h1 className="mt-4 font-display font-semibold text-3xl md:text-4xl tracking-tight text-primary-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-primary-foreground/70 leading-relaxed">{subtitle}</p>
            )}
          </div>

          <div className="rounded-3xl border border-gold/15 bg-[oklch(0.13_0.04_18)/0.7] backdrop-blur-xl p-5 md:p-7 shadow-2xl shadow-black/60">
            {children}
          </div>

          {footer && <div className="mt-5 text-center text-sm text-primary-foreground/70">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
