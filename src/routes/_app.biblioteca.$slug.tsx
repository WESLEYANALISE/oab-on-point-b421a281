import { Outlet, createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BIB_MAP } from "@/lib/biblioteca";

export const Route = createFileRoute("/_app/biblioteca/$slug")({
  beforeLoad: ({ params }) => {
    if (!BIB_MAP[params.slug]) throw notFound();
  },
  head: ({ params }) => ({ meta: [{ title: `${BIB_MAP[params.slug]?.title ?? "Biblioteca"} · OAB na Risca` }] }),
  component: () => <Outlet />,
  notFoundComponent: () => (
    <div className="p-8 text-center text-muted-foreground">
      Biblioteca não encontrada. <Link to="/biblioteca" className="underline">Voltar</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-center text-muted-foreground">Erro ao carregar: {error.message}</div>
  ),
});
