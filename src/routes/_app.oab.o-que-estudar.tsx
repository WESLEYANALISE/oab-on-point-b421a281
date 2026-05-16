import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/oab/o-que-estudar")({
  head: () => ({ meta: [{ title: "O que estudar — OAB na Risca" }] }),
  component: () => <ComingSoon title="O que estudar" subtitle="Guia completo por edital atualizado." />,
});
