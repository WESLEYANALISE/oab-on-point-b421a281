import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { resumoLivroQueryOptions } from "@/lib/resumos-queries";
import { getMateriaAula } from "@/data/aulas-oab";

export const Route = createFileRoute("/_app/aulas/$materia/$livroId")({
  head: ({ params }) => {
    const m = getMateriaAula(params.materia);
    return {
      meta: [
        { title: `${m?.nome ?? "Aula"} · OAB na Risca` },
      ],
    };
  },
  loader: ({ context, params }) => {
    const materia = getMateriaAula(params.materia);
    if (!materia) throw notFound();
    context.queryClient.ensureQueryData(resumoLivroQueryOptions(params.livroId));
    return { materia };
  },
  component: () => <Outlet />,
  notFoundComponent: () => <div className="p-8">Matéria não encontrada.</div>,
  errorComponent: ({ error }) => (
    <div className="p-8 text-destructive">{error.message}</div>
  ),
});
