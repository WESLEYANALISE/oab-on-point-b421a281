import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "post"
  );
}

const PostInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(120).optional(),
  titulo: z.string().min(3).max(200),
  subtitulo: z.string().max(300).optional().nullable(),
  categoria: z.string().min(1).max(60),
  tempo_leitura_min: z.number().int().min(1).max(120).default(6),
  capa_url: z.string().url().optional().nullable(),
  resumo: z.string().min(1).max(500),
  conteudo_md: z.string().min(1),
  tags: z.array(z.string().min(1).max(40)).max(12).default([]),
  publicado: z.boolean().default(false),
});

export const adminListBlogPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("blog_posts")
      .select(
        "id, slug, titulo, categoria, capa_url, publicado, publicado_em, updated_at, tempo_leitura_min",
      )
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetBlogPost = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("blog_posts")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminUpsertBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PostInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const slug = (data.slug && data.slug.trim()) || slugify(data.titulo);
    const payload = {
      slug,
      titulo: data.titulo,
      subtitulo: data.subtitulo ?? null,
      categoria: data.categoria,
      tempo_leitura_min: data.tempo_leitura_min,
      capa_url: data.capa_url ?? null,
      resumo: data.resumo,
      conteudo_md: data.conteudo_md,
      tags: data.tags,
      publicado: data.publicado,
      publicado_em: data.publicado ? new Date().toISOString() : null,
      autor_id: context.userId,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("blog_posts")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id, slug };
    }
    const { data: ins, error } = await supabaseAdmin
      .from("blog_posts")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id as string, slug };
  });

export const adminDeleteBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminTogglePublicar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; publicado: boolean }) =>
    z.object({ id: z.string().uuid(), publicado: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("blog_posts")
      .update({
        publicado: data.publicado,
        publicado_em: data.publicado ? new Date().toISOString() : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Upload de capa (data URL base64 → bucket blog-capas)
export const adminUploadBlogCapa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { filename: string; base64: string }) =>
    z
      .object({
        filename: z.string().min(1).max(200),
        base64: z.string().min(10),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const clean = data.base64.replace(/^data:[^;]+;base64,/, "");
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = data.filename.split(".").pop()?.toLowerCase() || "jpg";
    const safeBase = slugify(data.filename.replace(/\.[^.]+$/, ""));
    const path = `${Date.now()}-${safeBase}.${ext}`;
    const contentType =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const up = await supabaseAdmin.storage
      .from("blog-capas")
      .upload(path, bytes, { contentType, upsert: true });
    if (up.error) throw new Error(up.error.message);
    const pub = supabaseAdmin.storage.from("blog-capas").getPublicUrl(path);
    return { url: pub.data.publicUrl };
  });
