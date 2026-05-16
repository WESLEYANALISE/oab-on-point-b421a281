import { useEffect, useState } from "react";

const EXAM_DATE = new Date("2026-09-23T08:00:00-03:00");

function diff() {
  const ms = EXAM_DATE.getTime() - Date.now();
  const d = Math.max(0, Math.floor(ms / 86400000));
  const h = Math.max(0, Math.floor((ms % 86400000) / 3600000));
  const m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  return { d, h, m };
}

type Size = { num: string; gap: string; box: number };
const SIZES: Record<"default" | "compact" | "hero", Size> = {
  default: { num: "text-4xl md:text-5xl", gap: "gap-3", box: 60 },
  compact: { num: "text-3xl md:text-4xl", gap: "gap-4", box: 44 },
  hero:    { num: "text-5xl md:text-6xl", gap: "gap-4", box: 72 },
};

export function CountdownExame({
  light = false,
  compact = false,
  hero = false,
}: { light?: boolean; compact?: boolean; hero?: boolean }) {
  const [t, setT] = useState<{ d: number; h: number; m: number } | null>(null);
  useEffect(() => {
    setT(diff());
    const id = setInterval(() => setT(diff()), 60000);
    return () => clearInterval(id);
  }, []);
  const variant: keyof typeof SIZES = hero ? "hero" : compact ? "compact" : "default";
  const s = SIZES[variant];
  if (!t) return <div style={{ height: s.box }} aria-hidden />;
  const items = [
    { v: t.d, l: "dias" },
    { v: t.h, l: "hrs" },
    { v: t.m, l: "min" },
  ];
  return (
    <div className={`flex items-end ${s.gap}`}>
      {items.map((i) => (
        <div key={i.l} className="text-center">
          <p className={`font-sans font-bold ${s.num} leading-none tabular-nums tracking-tight ${light ? "text-primary-foreground" : ""}`}>
            {String(i.v).padStart(2, "0")}
          </p>
          <p className={`text-[10px] uppercase tracking-[0.18em] mt-1 ${light ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
            {i.l}
          </p>
        </div>
      ))}
    </div>
  );
}
