import { createFileRoute } from "@tanstack/react-router";
import { importBibliotecas } from "@/lib/biblioteca-import.functions";

export const Route = createFileRoute("/api/admin/import-bibliotecas")({
  server: {
    handlers: {
      POST: async () => {
        const out = await importBibliotecas();
        return Response.json(out);
      },
    },
  },
});
