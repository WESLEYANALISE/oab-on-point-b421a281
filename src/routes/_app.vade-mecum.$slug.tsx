import { createFileRoute, redirect } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { EstatutoArtigosPage, estatutoHeadQueryOptions } from "./_app.vade-mecum.estatutos.$slug";

// Rota genérica /vade-mecum/$slug — reutiliza a página de estatuto.
// CF tem fluxo próprio (seleção CF/ADCT) em /vade-mecum/cf.
export const Route = createFileRoute("/_app/vade-mecum/$slug")({
  beforeLoad: ({ params }) => {
    if (params.slug === "cf") {
      throw redirect({ to: "/vade-mecum/cf" });
    }
  },
  loader: ({ context, params }) =>
    (context as { queryClient: QueryClient }).queryClient.ensureQueryData(
      estatutoHeadQueryOptions(params.slug),
    ),
  component: EstatutoArtigosPage,
});
