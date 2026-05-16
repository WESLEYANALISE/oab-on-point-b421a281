import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/questoes")({
  head: () => ({ meta: [{ title: "Questões — OAB na Risca" }, { name: "description", content: "Banco de questões da FGV para 1ª fase da OAB." }] }),
  component: () => <ComingSoon title="Questões" subtitle="Banco com milhares de questões FGV. Filtre por matéria, banca e ano, resolva com cronômetro e veja o comentário." />,
});
