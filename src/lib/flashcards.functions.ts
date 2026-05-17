import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reviewCard, type CardSrs, type Rating } from "@/lib/srs";

// ---------- Gemini (direto, conforme regra do projeto) ----------
async function geminiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini falhou [${res.status}]: ${t.slice(0, 300)}`);
  }
  const j = await res.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
}

// ---------- Tipos compartilhados ----------
export type FlashcardRow = {
  id: string;
  frente: string;
  verso: string;
  materia: string | null;
  fonte_tipo: "manual" | "resumo" | "questao" | "livro";
  fonte_id: string | null;
  stability: number;
  difficulty: number;
  state: "new" | "learning" | "review" | "relearning";
  due_at: string;
  reps: number;
  lapses: number;
  last_review_at: string | null;
  suspenso: boolean;
};

// ---------- Estatísticas + fila do dia ----------
export const getFilaRevisao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { materia?: string; limite?: number } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const limite = Math.min(Math.max(data.limite ?? 50, 1), 200);
    const agora = new Date().toISOString();

    let q = supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .eq("suspenso", false)
      .lte("due_at", agora)
      .order("due_at", { ascending: true })
      .limit(limite);
    if (data.materia) q = q.eq("materia", data.materia);
    const { data: cards, error } = await q;
    if (error) throw new Error(error.message);

    // contadores
    const { count: totalNovos } = await supabase
      .from("flashcards").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("suspenso", false).eq("state", "new");
    const { count: totalAprendendo } = await supabase
      .from("flashcards").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("suspenso", false).in("state", ["learning", "relearning"]);
    const { count: totalRevisao } = await supabase
      .from("flashcards").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("suspenso", false).eq("state", "review").lte("due_at", agora);
    const { count: totalTudo } = await supabase
      .from("flashcards").select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    return {
      cards: (cards ?? []) as FlashcardRow[],
      contadores: {
        novos: totalNovos ?? 0,
        aprendendo: totalAprendendo ?? 0,
        revisao: totalRevisao ?? 0,
        total: totalTudo ?? 0,
      },
    };
  });

// ---------- Revisar um card ----------
const RatingSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.number().int().min(1).max(4),
});

export const revisarCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RatingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: card, error } = await supabase
      .from("flashcards").select("*").eq("id", data.cardId).eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!card) throw new Error("Card não encontrado");

    const srs: CardSrs = {
      stability: card.stability,
      difficulty: card.difficulty,
      state: card.state as CardSrs["state"],
      due_at: card.due_at,
      reps: card.reps,
      lapses: card.lapses,
      last_review_at: card.last_review_at,
    };
    const now = new Date();
    const elapsed = card.last_review_at
      ? (now.getTime() - new Date(card.last_review_at).getTime()) / 86_400_000
      : 0;
    const next = reviewCard(srs, data.rating as Rating, now);

    const { error: upErr } = await supabase
      .from("flashcards")
      .update({
        stability: next.stability,
        difficulty: next.difficulty,
        state: next.state,
        due_at: next.due_at,
        reps: next.reps,
        lapses: next.lapses,
        last_review_at: next.last_review_at,
      })
      .eq("id", data.cardId)
      .eq("user_id", userId);
    if (upErr) throw new Error(upErr.message);

    await supabase.from("flashcard_revisoes").insert({
      card_id: data.cardId,
      user_id: userId,
      rating: data.rating,
      stability: next.stability,
      difficulty: next.difficulty,
      state: next.state,
      due_at: next.due_at,
      elapsed_days: elapsed,
    });

    return { ok: true, proximo: next };
  });

// ---------- CRUD manual ----------
const NovoSchema = z.object({
  frente: z.string().min(1).max(2000),
  verso: z.string().min(1).max(4000),
  materia: z.string().max(80).nullable().optional(),
});
export const criarFlashcard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NovoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("flashcards")
      .insert({
        user_id: userId,
        frente: data.frente,
        verso: data.verso,
        materia: data.materia ?? null,
        fonte_tipo: "manual",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as FlashcardRow;
  });

export const apagarFlashcard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("flashcards").delete().eq("id", data.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Geração via Gemini ----------
const GerarSchema = z.object({
  texto: z.string().min(50).max(20_000),
  materia: z.string().max(80).optional(),
  quantidade: z.number().int().min(3).max(20).default(8),
  fonte_tipo: z.enum(["resumo", "livro", "manual"]).default("manual"),
  fonte_id: z.string().max(200).optional(),
});

export const gerarFlashcardsDeTexto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GerarSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const sys = `Você é um especialista em criar flashcards para estudantes de Direito (OAB).
Crie cards no formato pergunta/resposta curtos, atômicos (uma ideia por card), em português jurídico claro.
Evite cards triviais ou redundantes. Inclua quando relevante: artigo, súmula, princípio.
Responda SOMENTE com JSON válido no formato: [{"frente":"...","verso":"..."}].`;
    const user = `Crie ${data.quantidade} flashcards a partir do conteúdo abaixo${data.materia ? ` da matéria ${data.materia}` : ""}.

CONTEÚDO:
${data.texto}`;
    const raw = await geminiJson(sys, user);
    let parsed: Array<{ frente: string; verso: string }>;
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("não é array");
    } catch (e) {
      throw new Error(`Resposta inválida do Gemini: ${e instanceof Error ? e.message : "parse"}`);
    }
    const rows = parsed
      .filter((c) => c && typeof c.frente === "string" && typeof c.verso === "string")
      .slice(0, data.quantidade)
      .map((c) => ({
        user_id: userId,
        frente: c.frente.trim().slice(0, 2000),
        verso: c.verso.trim().slice(0, 4000),
        materia: data.materia ?? null,
        fonte_tipo: data.fonte_tipo,
        fonte_id: data.fonte_id ?? null,
      }));
    if (rows.length === 0) return { criados: 0, cards: [] };

    const { data: inseridos, error } = await supabase.from("flashcards").insert(rows).select();
    if (error) throw new Error(error.message);
    return { criados: inseridos?.length ?? 0, cards: (inseridos ?? []) as FlashcardRow[] };
  });
