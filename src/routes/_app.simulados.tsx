import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/simulados")({
  head: () => ({ meta: [{ title: "Simulados — OAB na Risca" }, { name: "description", content: "Simulados completos no modelo do Exame de Ordem." }] }),
  component: () => <ComingSoon title="Simulados" subtitle="Simulados completos de 80 questões, cronômetro de 5h, salvamento automático e relatório detalhado por matéria." />,
});
