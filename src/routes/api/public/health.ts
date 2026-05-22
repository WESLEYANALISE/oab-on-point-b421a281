import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        const checks: Record<string, { ok: boolean; ms: number; error?: string }> = {};

        // DB
        const t1 = Date.now();
        try {
          const { error } = await supabaseAdmin
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .limit(1);
          checks.db = { ok: !error, ms: Date.now() - t1, error: error?.message };
        } catch (e) {
          checks.db = { ok: false, ms: Date.now() - t1, error: (e as Error).message };
        }

        // Gemini
        checks.gemini = { ok: Boolean(process.env.GEMINI_API_KEY), ms: 0 };

        const ok = Object.values(checks).every((c) => c.ok);
        return new Response(
          JSON.stringify(
            { ok, time: new Date().toISOString(), totalMs: Date.now() - started, checks },
            null,
            2,
          ),
          {
            status: ok ? 200 : 503,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
