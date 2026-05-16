import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/audioaulas")({
  head: () => ({ meta: [{ title: "Áudio-aulas · OAB na Risca" }] }),
  component: () => (
    <ComingSoon
      title="Áudio-aulas"
      subtitle="Aulas em áudio para estudar no fone, no trânsito ou na academia. Em breve."
    />
  ),
});
