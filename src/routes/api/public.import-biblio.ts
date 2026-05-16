import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SRC_URL = "https://izspjvegxdfgkgibpyst.supabase.co";
const SRC_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3BqdmVneGRmZ2tnaWJweXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA2MTQsImV4cCI6MjA2MDcxNjYxNH0.LwTMbDH-S0mBoiIxfrSH2BpUMA7r4upOWWAb5a_If0Y";

const TABLES = [
  "BIBLIOTECA-CLASSICOS",
  "BIBLIOTECA-ESTUDOS",
  "BIBLIOTECA-LIDERANÇA",
  "BIBLIOTECA-POLITICA",
  "BIBLIOTECA-FORA-DA-TOGA",
];

async function fetchAll(t: string) {
  const all: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const r = await fetch(
      `${SRC_URL}/rest/v1/${encodeURIComponent(t)}?select=*`,
      {
        headers: {
          apikey: SRC_KEY,
          Authorization: `Bearer ${SRC_KEY}`,
          Range: `${from}-${from + step - 1}`,
          "Range-Unit": "items",
        },
      },
    );
    if (!r.ok) throw new Error(`${t} fetch: ${r.status}`);
    const data = await r.json();
    all.push(...data);
    if (data.length < step) break;
    from += step;
  }
  return all;
}

export const Route = createFileRoute("/api/public/import-biblio")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const tableQ = url.searchParams.get("table");
        const tables = tableQ ? [tableQ] : TABLES;
        const report: Record<string, any> = {};

        for (const t of tables) {
          try {
            // Check existing count to skip if already imported
            const { count } = await supabaseAdmin
              .from(t)
              .select("id", { count: "exact", head: true });
            if ((count ?? 0) > 0) {
              report[t] = { skipped: true, count };
              continue;
            }
            const rows = await fetchAll(t);
            // Insert in chunks of 200
            let inserted = 0;
            for (let i = 0; i < rows.length; i += 200) {
              const chunk = rows.slice(i, i + 200);
              const { error } = await supabaseAdmin.from(t).insert(chunk);
              if (error) {
                report[t] = { error: error.message, inserted };
                break;
              }
              inserted += chunk.length;
            }
            if (!report[t]) report[t] = { inserted };
          } catch (e: any) {
            report[t] = { error: e.message };
          }
        }

        return Response.json(report);
      },
    },
  },
});
