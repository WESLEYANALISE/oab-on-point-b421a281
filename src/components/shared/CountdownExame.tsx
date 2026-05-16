import { useEffect, useState } from "react";

const EXAM_DATE = new Date("2026-09-23T08:00:00-03:00");

function diff() {
  const ms = EXAM_DATE.getTime() - Date.now();
  const d = Math.max(0, Math.floor(ms / 86400000));
  const h = Math.max(0, Math.floor((ms % 86400000) / 3600000));
  const m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  return { d, h, m };
}

type Size = { num: string; gap: string; pad: string; lbl: string };
const SIZES: Record<"default" | "compact" | "hero", Size> = {
  default: { num: "text-3xl md:text-4xl", gap: "gap-2", pad: "px-3 py-2 min-w-[64px]", lbl: "text-[10px]" },
  compact: { num: "text-2xl md:text-3xl", gap: "gap-2", pad: "px-2.5 py-1.5 min-w-[52px]", lbl: "text-[9px]" },
  hero:    { num: "text-[32px] md:text-5xl", gap: "gap-2", pad: "px-2 py-2.5 md:px-3.5 md:py-2.5 min-w-0", lbl: "text-[9px] md:text-[10px]" },
};

export function CountdownExame({
  light = false,
  compact = false,
  hero = false,
}: { light?: boolean; compact?: boolean; hero?: boolean }) {
  // Lazy init so SSR and first paint already render real numbers.
  const [t, setT] = useState(() => diff());
  useEffect(() => {
    setT(diff());
    const id = setInterval(() => setT(diff()), 30000);
    return () => clearInterval(id);
  }, []);
  const variant: keyof typeof SIZES = hero ? "hero" : compact ? "compact" : "default";
  const s = SIZES[variant];
  const items = [
    { v: t.d, l: "dias" },
    { v: t.h, l: "hrs" },
    { v: t.m, l: "min" },
  ];
  const boxBg = light
    ? "bg-primary-foreground/8 border-primary-foreground/15"
    : "bg-card border-border";
  const numColor = light ? "text-primary-foreground" : "text-foreground";
  const lblColor = light ? "text-gold/80" : "text-muted-foreground";

  return (
    <div className={`flex items-stretch ${s.gap}`} suppressHydrationWarning>
      {items.map((i) => (
        <div
          key={i.l}
          className={`rounded-xl border ${boxBg} ${s.pad} backdrop-blur-sm flex flex-col items-center justify-center`}
        >
          <p
            className={`font-display font-semibold ${s.num} ${numColor} leading-none tabular-nums tracking-tight`}
            suppressHydrationWarning
          >
            {String(i.v).padStart(2, "0")}
          </p>
          <p className={`${s.lbl} uppercase tracking-[0.22em] mt-1.5 font-semibold ${lblColor}`}>
            {i.l}
          </p>
        </div>
      ))}
    </div>
  );
}
