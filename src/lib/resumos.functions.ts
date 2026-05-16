import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listarLivrosComResumo = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("resumo_livros")
    .select("id, biblioteca_slug, livro_id, titulo, autor, capa, area, total_capitulos, capitulos_gerados, status, updated_at")
    .in("status", ["concluido", "gerando", "previa_pronta"])
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  // só mostramos publicamente os que têm pelo menos 1 capítulo
  return (data ?? []).filter((r) => (r.capitulos_gerados ?? 0) > 0);
});

export const obterLivroResumo = createServerFn({ method: "GET" })
  .inputValidator((d: { resumo_livro_id: string }) =>
    z.object({ resumo_livro_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const livro = await supabaseAdmin
      .from("resumo_livros")
      .select("id, biblioteca_slug, livro_id, titulo, autor, capa, area, total_capitulos, capitulos_gerados, status")
      .eq("id", data.resumo_livro_id)
      .maybeSingle();
    if (livro.error || !livro.data) throw new Error("Resumo não encontrado");
    const caps = await supabaseAdmin
      .from("resumo_capitulos")
      .select("id, ordem, titulo, slug, conteudo_markdown, imagens, status")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("status", "ok")
      .order("ordem", { ascending: true });
    if (caps.error) throw new Error(caps.error.message);
    return { livro: livro.data, capitulos: caps.data ?? [] };
  });
