import { createFileRoute } from "@tanstack/react-router";
import { executarSeedProvasOab, debugClassificarNumero } from "@/lib/provas-oab.functions";

export const Route = createFileRoute("/api/public/seed-provas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const numeroParam = url.searchParams.get("numero");
        const debug = url.searchParams.get("debug") === "1";
        try {
          if (debug && numeroParam) {
            const r = await debugClassificarNumero(parseInt(numeroParam, 10));
            return Response.json(r);
          }
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
