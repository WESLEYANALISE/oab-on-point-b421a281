import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/aulas")({
  head: () => ({ meta: [{ title: "Aulas Interativas — OAB na Risca" }, { name: "description", content: "Aulas em slides com quiz inline para todas as matérias da OAB." }] }),
  component: () => <ComingSoon title="Aulas Interativas" subtitle="Cada aula é um conjunto de slides com texto, exemplos práticos e quiz inline. Você marca como concluída e segue para a próxima." />,
});
