import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  gap?: number;
  duration?: number;
}

/** Marquee infinito 100% CSS — duplica os filhos e anima translateX(-50%). */
export function CSSInfiniteSlider({ children, gap = 32, duration = 28 }: Props) {
  return (
    <div className="relative w-full overflow-hidden">
      <div
        className="flex w-max"
        style={{
          gap: `${gap}px`,
          animation: `welcomeMarquee ${duration}s linear infinite`,
        }}
      >
        <div className="flex shrink-0 items-center" style={{ gap: `${gap}px` }}>
          {children}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden style={{ gap: `${gap}px` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
