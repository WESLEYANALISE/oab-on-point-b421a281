import { useEffect, useState } from "react";

const EXAM_DATE = new Date("2026-09-23T08:00:00-03:00");

function diff() {
  const ms = EXAM_DATE.getTime() - Date.now();
  const d = Math.max(0, Math.floor(ms / 86400000));
  const h = Math.max(0, Math.floor((ms % 86400000) / 3600000));
  const m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  return { d, h, m };
}

export function CountdownExame({ light = false }: { light?: boolean }) {
  const [t, setT] = useState(diff);
  useEffect(() => {
    const id = setInterval(() => setT(diff()), 60000);
    return () => clearInterval(id);
  }, []);
  const items = [
    { v: t.d, l: "dias" },
    { v: t.h, l: "hrs" },
    { v: t.m, l: "min" },
  ];
  return (
    <div className="flex items-end gap-3">
      {items.map((i) => (
        <div key={i.l} className="text-center">
          <p className={`font-display text-4xl md:text-5xl leading-none ${light ? "text-primary-foreground" : ""}`}>
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
