import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/biblioteca/$slug/$bookId")({
  head: () => ({ meta: [{ title: "Livro · OAB na Risca" }] }),
  component: () => <Outlet />,
});
