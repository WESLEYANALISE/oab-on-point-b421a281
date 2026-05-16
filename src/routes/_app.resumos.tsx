import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/resumos")({
  head: () => ({ meta: [{ title: "Resumos — OAB na Risca" }, { name: "description", content: "Resumos diretos ao ponto de todas as matérias da OAB." }] }),
  component: () => <ComingSoon title="Resumos" subtitle="Resumos curtos e organizados por tópico, com sumário lateral, marcação de lido e exportação em PDF." />,
});
