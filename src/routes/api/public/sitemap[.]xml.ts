import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SITE = "https://oab-oen-point.lovable.app";

const STATIC_PATHS = [
  "/",
  "/login",
  "/inicio",
  "/blog",
  "/biblioteca",
  "/vade-mecum",
  "/atualizacoes-leis",
];

function urlTag(loc: string, lastmod?: string, changefreq = "weekly", priority = "0.5") {
  return `<url><loc>${SITE}${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
}

export const Route = createFileRoute("/api/public/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const parts: string[] = STATIC_PATHS.map((p) =>
          urlTag(p, undefined, p === "/" ? "daily" : "weekly", p === "/" ? "1.0" : "0.7"),
        );

        try {
          const { data: posts } = await supabaseAdmin
            .from("blog_posts")
            .select("slug, updated_at")
            .eq("publicado", true)
            .limit(1000);
          for (const p of posts ?? []) {
            if (p.slug) parts.push(urlTag(`/blog/${p.slug}`, p.updated_at ?? undefined, "monthly", "0.6"));
          }
        } catch {
          /* tabela ausente — segue */
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.join("\n")}\n</urlset>`;
        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
