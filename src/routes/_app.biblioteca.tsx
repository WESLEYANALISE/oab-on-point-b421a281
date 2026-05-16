import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/shared/ComingSoon";

export const Route = createFileRoute("/_app/biblioteca")({
  head: () => ({ meta: [{ title: "Biblioteca · OAB na Risca" }] }),
  component: () => (
    <ComingSoon
      title="Biblioteca"
      subtitle="PDFs, livros recomendados, súmulas comentadas e legislação seca. Em breve."
    />
  ),
});
