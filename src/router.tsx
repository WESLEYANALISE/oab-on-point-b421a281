import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import type { Persister } from "@tanstack/react-query-persist-client";
import { routeTree } from "./routeTree.gen";

// Bump quando mudar o shape de dados em cache pra invalidar tudo
const CACHE_BUSTER = "oab-v1";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  // Persister só existe no browser (localStorage indisponível no SSR)
  const persister: Persister | null =
    typeof window !== "undefined"
      ? createSyncStoragePersister({
          storage: window.localStorage,
          key: "oab-rq-cache",
          throttleTime: 1000,
        })
      : null;

  const router = createRouter({
    routeTree,
    context: { queryClient, persister, cacheBuster: CACHE_BUSTER },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
