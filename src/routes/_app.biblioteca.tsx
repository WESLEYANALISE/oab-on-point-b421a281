import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/biblioteca")({
  head: () => ({
    meta: [
      { title: "Biblioteca · OAB na Risca" },
      { name: "description", content: "Biblioteca jurídica com livros e resumos para preparação da OAB." },
      { property: "og:title", content: "Biblioteca · OAB na Risca" },
    ],
  }),
  component: () => <Outlet />,
});
