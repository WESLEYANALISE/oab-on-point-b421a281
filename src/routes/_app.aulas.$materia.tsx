import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { getMateriaAula } from "@/data/aulas-oab";

export const Route = createFileRoute("/_app/aulas/$materia")({
  loader: ({ params }) => {
    const materia = getMateriaAula(params.materia);
    if (!materia) throw notFound();
    return { materia };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.materia.nome ?? "Aula"} — OAB na Risca` },
      { name: "description", content: loaderData?.materia.descricao ?? "" },
    ],
  }),
  component: () => <Outlet />,
  notFoundComponent: () => <div className="p-8">Matéria não encontrada.</div>,
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
});
