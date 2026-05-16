import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SRC = "https://izspjvegxdfgkgibpyst.supabase.co";
const SRC_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6c3BqdmVneGRmZ2tnaWJweXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNDA2MTQsImV4cCI6MjA2MDcxNjYxNH0.LwTMbDH-S0mBoiIxfrSH2BpUMA7r4upOWWAb5a_If0Y";

const TABLES: { name: string; cols: string[] }[] = [
  {
    name: "BIBLIOTECA-CLASSICOS",
    cols: ["id", "area", "livro", "autor", "link", "imagem", "sobre", "beneficios", "download", "Capa-area", "aula"],
  },
  {
    name: "BIBLIOTECA-ESTUDOS",
    cols: ["id", "Área", "Ordem", "Tema", "Download", "Link", "Capa-area", "Capa-livro", "Sobre", "aula", "url_capa_gerada"],
  },
  {
    name: "BIBLIOTECA-LIDERANÇA",
    cols: ["id", "area", "livro", "autor", "link", "imagem", "sobre", "beneficios", "download", "Capa-area", "aula"],
  },
  {
    name: "BIBLIOTECA-POLITICA",
    cols: ["id", "area", "livro", "autor", "link", "imagem", "sobre", "beneficios", "download", "Capa-area", "aula"],
  },
  {
    name: "BIBLIOTECA-FORA-DA-TOGA",
    cols: ["id", "area", "livro", "autor", "link", "capa-livro", "sobre", "download", "capa-area", "aula"],
  },
];

async function fetchAll(table: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const url = `${SRC}/rest/v1/${encodeURIComponent(table)}?select=*&order=id.asc&limit=1000&offset=${from}`;
    const r = await fetch(url, { headers: { apikey: SRC_KEY, Authorization: `Bearer ${SRC_KEY}` } });
    if (!r.ok) throw new Error(`fetch ${table}: ${r.status}`);
    const data = (await r.json()) as Record<string, unknown>[];
    all.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

export const importBibliotecas = createServerFn({ method: "POST" }).handler(async () => {
  const results: Record<string, number> = {};
  for (const t of TABLES) {
    const rows = await fetchAll(t.name);
    const filtered = rows.map((r) => {
      const out: Record<string, unknown> = {};
      for (const c of t.cols) out[c] = r[c] ?? null;
      return out;
    });
    // wipe existing then insert (idempotent re-runs)
    await supabaseAdmin.from(t.name).delete().neq("id", -1);
    // chunked insert
    for (let i = 0; i < filtered.length; i += 200) {
      const chunk = filtered.slice(i, i + 200);
      const { error } = await supabaseAdmin.from(t.name).insert(chunk);
      if (error) throw new Error(`insert ${t.name} chunk ${i}: ${error.message}`);
    }
    results[t.name] = filtered.length;
  }
  return { ok: true, results };
});
