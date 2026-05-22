import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { SlidePlayer } from "@/components/aulas-interativas/SlidePlayer";
import { getAulaCompleta, salvarProgresso } from "@/lib/aulas-interativas.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/aulas-interativas/$cursoSlug/$aulaSlug")({
  component: AulaPlayerPage,
});

function AulaPlayerPage() {
  const { cursoSlug, aulaSlug } = Route.useParams();
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ["aulas-interativas", "aula", cursoSlug, aulaSlug],
    queryFn: () => getAulaCompleta({ data: { cursoSlug, aulaSlug } }),
    staleTime: 60_000,
  });

  const onProgresso = useCallback(
    (slideIdx: number, concluida: boolean) => {
      if (!user || !q.data) return;
      void salvarProgresso({
        data: {
          aulaId: q.data.aula.id,
          cursoId: q.data.aula.curso_id,
          slideAtual: slideIdx,
          concluida,
        },
      }).catch(() => {});
    },
    [user, q.data],
  );

  if (q.isLoading) {
    return <p className="px-4 py-10 text-sm text-muted-foreground">Carregando aula…</p>;
  }
  if (!q.data) throw notFound();

  return (
    <SlidePlayer
      slides={q.data.slides}
      tituloAula={q.data.aula.titulo}
      voltarHref={`/aulas-interativas/${cursoSlug}`}
      onProgresso={onProgresso}
    />
  );
}
