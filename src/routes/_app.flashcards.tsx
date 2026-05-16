import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/flashcards")({
  head: () => ({ meta: [{ title: "Flashcards — OAB na Risca" }, { name: "description", content: "Flashcards de OAB com repetição espaçada." }] }),
  component: () => <ComingSoon title="Flashcards" subtitle="Viewer estilo Anki com flip, acertei/errei e algoritmo SRS simples para memorizar artigos, súmulas e conceitos." />,
});
