import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";

/** Pré-carrega rotas em hover/touch. API estável usada pelo Welcome. */
export function usePrefetchRoute() {
  const router = useRouter();
  const prefetch = useCallback(
    (to?: string) => {
      if (!to) return;
      try {
        router.preloadRoute({ to });
      } catch {
        /* noop */
      }
    },
    [router],
  );
  return {
    onHoverStart: (to?: string) => prefetch(to),
    onHoverEnd: () => {},
    onTouchStart: (to?: string) => prefetch(to),
  };
}
