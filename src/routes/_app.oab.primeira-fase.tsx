import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/oab/primeira-fase")({
  head: () => ({ meta: [{ title: "1ª Fase OAB — OAB na Risca" }, { name: "description", content: "Trilha objetiva da 1ª fase do Exame de Ordem." }] }),
  component: () => <ComingSoon title="1ª Fase" subtitle="Trilha objetiva da prova teórica do Exame de Ordem." />,
});
