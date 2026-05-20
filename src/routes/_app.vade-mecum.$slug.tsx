import { createFileRoute } from "@tanstack/react-router";
import { Route as EstatutoRoute } from "./_app.vade-mecum.estatutos.$slug";

// Rota genérica /vade-mecum/$slug — reutiliza a página de estatuto.
// Permite URLs como /vade-mecum/cf, /vade-mecum/cp, etc.
export const Route = createFileRoute("/_app/vade-mecum/$slug")({
  head: EstatutoRoute.options.head,
  component: EstatutoRoute.options.component!,
});
