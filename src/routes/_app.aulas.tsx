import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/aulas")({
  head: () => ({
    meta: [
      { title: "Aulas · OAB na Risca" },
      { name: "description", content: "Trilha de aulas interativas para o Exame da OAB — leia, pratique com flashcards, questões e simulados." },
      { property: "og:title", content: "Aulas · OAB na Risca" },
      { property: "og:description", content: "Trilha de aulas interativas para o Exame da OAB." },
    ],
  }),
  component: () => <Outlet />,
});
