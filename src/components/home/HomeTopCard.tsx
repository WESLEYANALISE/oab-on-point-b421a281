import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, ChevronRight, Sparkles } from "lucide-react";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useProfile, greetingFor, readCachedProfileOptimistic } from "@/hooks/use-auth";

const EXAM_DATE = new Date("2026-07-05T08:00:00-03:00");
const EXAM_SHORT = "Dom, 5 jul 2026";

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

      {/* Linha 1: avatar + saudação + atalho exame */}
      <Link
        to="/perfil"
        className="relative flex items-center gap-3 px-3.5 py-3 md:px-5 md:py-3.5 group"
      >
        <AvatarUploader size={44} />
        <div className="min-w-0 flex-1">
          <p
            className="text-[9px] uppercase tracking-[0.22em] text-gold/85 font-semibold leading-none min-h-[9px]"
            suppressHydrationWarning
          >
            {greet ?? "\u00a0"}
          </p>
          <p className="font-display font-semibold text-[15px] md:text-[17px] leading-tight tracking-tight truncate mt-1">
            {firstName || <span className="inline-block h-3.5 w-24 rounded bg-white/10 animate-pulse align-middle" />}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/15 border border-gold/35 text-gold text-[10px] font-semibold whitespace-nowrap">
          <Sparkles className="h-2.5 w-2.5" /> 46º OAB
        </span>
        <ChevronRight className="h-4 w-4 text-gold/70 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>

      {/* Linha 2: rótulo "Próximo exame" + countdown + atalho calendário */}
      <div className="relative border-t border-primary-foreground/12 px-3.5 py-2.5 md:px-5 md:py-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <p className="text-[9px] uppercase tracking-[0.22em] text-primary-foreground/60 font-semibold leading-none">
            Próximo exame · {EXAM_SHORT}
          </p>
          <Link
            to="/oab/calendario"
            className="inline-flex items-center gap-1 text-[10px] md:text-[11px] font-semibold text-gold/90 hover:text-gold whitespace-nowrap"
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
