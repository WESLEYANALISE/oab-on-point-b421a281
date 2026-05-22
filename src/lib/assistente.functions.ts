import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConversaItem = {
  id: string;
  titulo: string;
  updated_at: string;
};

export type MensagemItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export const listConversas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConversaItem[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("assistente_conversas")
      .select("id, titulo, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as ConversaItem[];
  });

export const criarConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ titulo: z.string().min(1).max(120).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<ConversaItem> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("assistente_conversas")
      .insert({ user_id: userId, titulo: data.titulo ?? "Nova conversa" })
      .select("id, titulo, updated_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao criar conversa");
    return row as ConversaItem;
  });

export const renomearConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), titulo: z.string().min(1).max(120) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("assistente_conversas")
      .update({ titulo: data.titulo, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("assistente_conversas")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMensagens = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ conversaId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<MensagemItem[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("assistente_mensagens")
      .select("id, role, content, created_at")
      .eq("conversa_id", data.conversaId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as MensagemItem[];
  });

export const salvarMensagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        conversaId: z.string().uuid(),
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(20000),
        novoTitulo: z.string().min(1).max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("assistente_mensagens").insert({
      conversa_id: data.conversaId,
      user_id: userId,
      role: data.role,
      content: data.content,
    });
    if (error) throw new Error(error.message);

    const patch = data.novoTitulo
      ? { updated_at: new Date().toISOString(), titulo: data.novoTitulo }
      : { updated_at: new Date().toISOString() };
    await supabase
      .from("assistente_conversas")
      .update(patch)
      .eq("id", data.conversaId)
      .eq("user_id", userId);

    return { ok: true };
  });
