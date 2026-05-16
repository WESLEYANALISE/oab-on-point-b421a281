import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/plano-estudo")({
  head: () => ({ meta: [{ title: "Plano de Estudo · OAB na Risca" }] }),
  component: () => (
    <ComingSoon
      title="Plano de Estudo"
      subtitle="Cronograma personalizado até o dia do exame, com metas semanais e revisões espaçadas."
    />
  ),
});
