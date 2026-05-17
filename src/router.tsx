import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 5 min: a maior parte do conteúdo (blog, biblioteca, provas) muda
        // em horizonte de dias. Queries voláteis declaram staleTime menor.
        staleTime: 5 * 60_000,
        gcTime: 60 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    // Reaproveita por 30s o que o preload já buscou — antes era 0 e o
    // preload "esquentava" o cache só pra refazer o fetch ao navegar.
    defaultPreloadStaleTime: 30_000,
    defaultPreloadGcTime: 5 * 60_000,
  });

  return router;
};
