import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type BlogPostListItem = {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  categoria: string;
  tempo_leitura_min: number;
  capa_url: string | null;
  resumo: string;
  tags: string[];
  publicado_em: string | null;
};

export type BlogPostFull = BlogPostListItem & {
  conteudo_md: string;
};

const COLS_LIST =
  "id, slug, titulo, subtitulo, categoria, tempo_leitura_min, capa_url, resumo, tags, publicado_em";

export const listBlogPosts = createServerFn({ method: "GET" })
  .inputValidator((d: { categoria?: string; limit?: number; offset?: number }) =>
    z
      .object({
        categoria: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(40),
        offset: z.number().int().min(0).default(0),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<BlogPostListItem[]> => {
    let q = supabaseAdmin
      .from("blog_posts")
      .select(COLS_LIST)
      .eq("publicado", true)
      .order("publicado_em", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);
    if (data.categoria) q = q.eq("categoria", data.categoria);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as BlogPostListItem[];
  });

export const listBlogCategorias = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ categoria: string; total: number }[]> => {
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select("categoria")
      .eq("publicado", true);
    if (error) throw new Error(error.message);
    const agg = new Map<string, number>();
    for (const r of data ?? []) agg.set(r.categoria, (agg.get(r.categoria) ?? 0) + 1);
    return [...agg.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  },
);

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<BlogPostFull | null> => {
    const { data: row, error } = await supabaseAdmin
      .from("blog_posts")
      .select(`${COLS_LIST}, conteudo_md`)
      .eq("slug", data.slug)
      .eq("publicado", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as BlogPostFull) ?? null;
  });

export const getRelatedBlogPosts = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string; categoria: string; limit?: number }) =>
    z
      .object({
        slug: z.string(),
        categoria: z.string(),
        limit: z.number().int().min(1).max(6).default(2),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<BlogPostListItem[]> => {
    const { data: rows, error } = await supabaseAdmin
      .from("blog_posts")
      .select(COLS_LIST)
      .eq("publicado", true)
      .eq("categoria", data.categoria)
      .neq("slug", data.slug)
      .order("publicado_em", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as BlogPostListItem[];
  });
