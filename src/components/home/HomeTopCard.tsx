import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { useProfile, greetingFor, readCachedProfileOptimistic } from "@/hooks/use-auth";
import themisHalf from "@/assets/themis-half.png";

// Próxima 1ª fase (47º Exame de Ordem) — data prevista
const EXAM_DATE = new Date("2026-08-23T08:00:00-03:00");
const EXAM_LONG = "Domingo, 23 de agosto de 2026 (previsto)";

function diff() {
  const ms = EXAM_DATE.getTime() - Date.now();
  const d = Math.max(0, Math.floor(ms / 86400000));
  const h = Math.max(0, Math.floor((ms % 86400000) / 3600000));
  const m = Math.max(0, Math.floor((ms % 3600000) / 60000));
  return { d, h, m };
}

export function HomeTopCard() {
  const { data: profile, isPending } = useProfile();
  const [cachedFirst] = useState(() => {
    const c = readCachedProfileOptimistic();
    return (c?.display_name || "").trim().split(/\s+/)[0] || "";
  });
  const rawFirst = (profile?.display_name || "").trim().split(/\s+/)[0];
  const firstName = rawFirst || cachedFirst || (isPending ? "" : "Estudante");

  const [greet, setGreet] = useState<string | null>(null);
  const [t, setT] = useState(() => diff());
  useEffect(() => {
    setGreet(greetingFor());
    setT(diff());
    const id = setInterval(() => setT(diff()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-toga text-primary-foreground border border-gold/15 shadow-xl shadow-black/40">
      <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-primary/40 blur-3xl pointer-events-none" />

      {/* Themis — meia face alinhada à direita */}
      <img
        src={themisHalf}
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        className="pointer-events-none select-none absolute top-0 right-0 h-full w-auto object-cover object-left opacity-90 z-0 [mask-image:linear-gradient(to_left,black_55%,transparent_100%)]"
      />
      <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-transparent via-black/10 to-black/40 pointer-events-none z-0" />

      {/* Linha 1: saudação + nome + frase motivacional */}
      <Link
        to="/perfil"
        className="relative z-10 block px-4 py-3.5 md:px-5 md:py-4 pr-28 group"
      >
        <p
          className="text-[9px] uppercase tracking-[0.22em] text-gold/85 font-semibold leading-none min-h-[9px]"
          suppressHydrationWarning
        >
          {greet ?? "\u00a0"}
        </p>
        <p className="font-display font-semibold text-[19px] md:text-[22px] leading-tight tracking-tight truncate mt-1.5">
          {firstName || <span className="inline-block h-4 w-28 rounded bg-white/10 animate-pulse align-middle" />}
        </p>
        <p className="text-[11px] md:text-[12px] text-primary-foreground/70 mt-1 leading-snug">
          Futuro advogado, sua aprovação começa hoje.
        </p>
      </Link>

      {/* Linha 2: rótulo "Próximo exame" + countdown + data + botão calendário */}
      <div className="relative border-t border-primary-foreground/12 px-2.5 py-2.5 md:px-3.5 md:py-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[9px] uppercase tracking-[0.22em] text-primary-foreground/60 font-semibold leading-none">
            Próximo exame · 1ª fase
          </p>
          <Link
            to="/oab/calendario"
            className="inline-flex items-center gap-1 rounded-full bg-gold/15 hover:bg-gold/25 border border-gold/40 px-3 py-1.5 text-[11px] font-semibold text-gold whitespace-nowrap transition-colors"
          >
            <Calendar className="h-3 w-3" />
            Ver calendário
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="flex items-baseline gap-1.5 md:gap-2 tabular-nums" suppressHydrationWarning>
          <Stat n={t.d} l="dias" big />
          <Sep />
          <Stat n={t.h} l="hrs" />
          <Sep />
          <Stat n={t.m} l="min" />
        </div>
        <p className="mt-3 md:mt-3.5 text-[11px] text-primary-foreground/60 leading-none">
          {EXAM_LONG}
        </p>
      </div>
    </div>
  );
}

function Stat({ n, l, big = false }: { n: number; l: string; big?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span
        className={`font-display font-semibold leading-none ${big ? "text-2xl md:text-3xl text-gold" : "text-lg md:text-xl text-primary-foreground"}`}
        suppressHydrationWarning
      >
        {String(n).padStart(2, "0")}
      </span>
      <span className="text-[9px] md:text-[10px] uppercase tracking-[0.18em] font-semibold text-primary-foreground/65">
        {l}
      </span>
    </span>
  );
}

function Sep() {
  return <span className="text-primary-foreground/25 text-sm leading-none">·</span>;
}
