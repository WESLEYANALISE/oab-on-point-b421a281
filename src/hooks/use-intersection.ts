import { useEffect, useRef, useState } from "react";

/**
 * Observa um elemento e devolve `true` quando ele entra no viewport.
 * Útil pra lazy-load de listas, animações on-scroll, infinite scroll, etc.
 */
export function useIntersection<T extends Element = HTMLDivElement>(
  options: IntersectionObserverInit = { rootMargin: "200px" },
  once = true,
) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        if (once) io.disconnect();
      } else if (!once) {
        setVisible(false);
      }
    }, options);
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [once]);

  return { ref, visible } as const;
}
