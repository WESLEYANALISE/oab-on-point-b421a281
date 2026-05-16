import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/oab/segunda-fase")({
  head: () => ({ meta: [{ title: "2ª Fase OAB — OAB na Risca" }, { name: "description", content: "Peça e discursivas da 2ª fase do Exame de Ordem." }] }),
  component: () => <ComingSoon title="2ª Fase" subtitle="Peça profissional e questões discursivas." />,
});
