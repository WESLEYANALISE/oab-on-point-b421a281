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
    // 0ms: começa o prefetch assim que o usuário aponta/toca no link, sem
    // janela de 50ms. No mobile (sem hover), garante que touchstart dispare
    // o preload antes mesmo de o click resolver — navegação mais "instantânea".
    defaultPreloadDelay: 0,
    // Reaproveita por 60s o que o preload já buscou.
    defaultPreloadStaleTime: 60_000,
    defaultPreloadGcTime: 5 * 60_000,
  });

  return router;
};
