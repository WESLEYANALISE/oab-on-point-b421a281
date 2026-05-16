import { createFileRoute } from "@tanstack/react-router";
import { executarSeedProvasOab } from "@/lib/provas-oab.functions";

export const Route = createFileRoute("/api/public/seed-provas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const result = await executarSeedProvasOab({
          apenasNumero: typeof body.apenasNumero === "number" ? body.apenasNumero : undefined,
          dryRun: body.dryRun === true,
        });

        return Response.json(result);
      },
    },
  },
});