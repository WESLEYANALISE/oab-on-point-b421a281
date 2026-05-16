import { createFileRoute } from "@tanstack/react-router";
import { executarSeedProvasOab } from "@/lib/provas-oab.functions";

export const Route = createFileRoute("/api/public/seed-provas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const numeroParam = url.searchParams.get("numero");
        try {
          const res = await executarSeedProvasOab({
            apenasNumero: numeroParam ? parseInt(numeroParam, 10) : undefined,
          });
          return Response.json(res);
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
