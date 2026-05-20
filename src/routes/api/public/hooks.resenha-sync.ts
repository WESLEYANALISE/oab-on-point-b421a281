import { createFileRoute } from "@tanstack/react-router";
import { executarSyncResenha } from "@/lib/resenha-sync.functions";

// Endpoint público chamado pelo pg_cron (3x/dia). Exige `apikey` do projeto.
export const Route = createFileRoute("/api/public/hooks/resenha-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const body = (await request.json().catch(() => ({}))) as {
            meses?: { ano: number; mes: number }[];
            useBrowserless?: boolean;
            gatilho?: string;
          };
          const result = await executarSyncResenha({
            meses: body.meses,
            useBrowserless: body.useBrowserless,
            gatilho: body.gatilho ?? "cron",
          });
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
