import { ShieldCheck, Sparkles, BookMarked, Award, Clock } from "lucide-react";
import { CSSInfiniteSlider } from "@/components/ui/css-infinite-slider";

const BADGES = [
  { icon: Award, label: "Atualizado p/ 42º Exame" },
  { icon: ShieldCheck, label: "Aprovação garantida" },
  { icon: Sparkles, label: "Método comprovado" },
  { icon: BookMarked, label: "+10.000 questões" },
  { icon: Clock, label: "Acesso 24/7" },
];

export function BadgeCarousel() {
  return (
    <div
      className="my-3"
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
    >
      <CSSInfiniteSlider gap={20} duration={22}>
        {BADGES.map((b) => (
          <span
            key={b.label}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full whitespace-nowrap"
            style={{
              background: "rgba(212,168,75,0.08)",
              border: "1px solid rgba(212,168,75,0.25)",
              boxShadow: "0 0 12px rgba(212,168,75,0.08) inset",
            }}
          >
            <b.icon className="w-3.5 h-3.5" style={{ color: "#d4a84b" }} />
            <span className="text-white/85 text-xs font-semibold tracking-wide">
              {b.label}
            </span>
          </span>
        ))}
      </CSSInfiniteSlider>
    </div>
  );
}
