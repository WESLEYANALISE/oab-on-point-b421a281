import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/oab/cronograma")({
  head: () => ({ meta: [{ title: "Cronograma OAB — OAB na Risca" }] }),
  component: () => <ComingSoon title="Cronograma" subtitle="Plano semanal personalizado de estudos." />,
});
