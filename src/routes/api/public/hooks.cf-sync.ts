import { createFileRoute } from "@tanstack/react-router";
import { executarSyncCF } from "@/lib/cf-sync.functions";

// Endpoint chamado pelo pg_cron. Sem auth de usuário (rota pública),
// mas exige o `apikey` do projeto (padrão Lovable Cloud).
export const Route = createFileRoute("/api/public/hooks/cf-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
        if (!expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const body = await request.json().catch(() => ({}));
          const result = await executarSyncCF({ useBrowserless: !!body.useBrowserless });
          return Response.json({ ok: true, ...result });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: msg }, { status: 500 });
        }
      },
    },
  },
});
