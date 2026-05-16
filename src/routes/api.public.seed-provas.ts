import { createFileRoute } from "@tanstack/react-router";
import { executarSeedProvasOab, debugListarArquivos } from "@/lib/provas-oab.functions";

export const Route = createFileRoute("/api/public/seed-provas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const dryRun = url.searchParams.get("dry") === "1";
        const debugId = url.searchParams.get("debug");
        const apenasNumero = url.searchParams.get("numero");
        try {
          if (debugId) {
            const arquivos = await debugListarArquivos(debugId);
            return Response.json({ arquivos });
          }
          const res = await executarSeedProvasOab({
            dryRun,
            apenasNumero: apenasNumero ? parseInt(apenasNumero, 10) : undefined,
          });
          return Response.json(res);
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});
