import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/oab/peca-modelo")({
  head: () => ({ meta: [{ title: "Peça-modelo — OAB na Risca" }] }),
  component: () => <ComingSoon title="Peça-modelo" subtitle="Modelos comentados de peças profissionais." />,
});
