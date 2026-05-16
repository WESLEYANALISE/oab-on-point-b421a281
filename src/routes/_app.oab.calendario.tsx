import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/oab/calendario")({
  head: () => ({ meta: [{ title: "Calendário OAB — OAB na Risca" }] }),
  component: () => <ComingSoon title="Calendário OAB" subtitle="Todas as datas oficiais do Exame de Ordem." />,
});
