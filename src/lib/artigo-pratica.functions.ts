import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { geminiGenerateContent } from "@/lib/gemini.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GEMINI_MODEL = "gemini-2.5-flash";

function admin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function tamanhos(texto: string): { questoes: number; flashcards: number } {
  const n = (texto ?? "").length;
  if (n <= 400) return { questoes: 10, flashcards: 20 };
  if (n <= 900) return { questoes: 15, flashcards: 25 };
  if (n <= 1800) return { questoes: 20, flashcards: 30 };
  return { questoes: 30, flashcards: 35 };
}

const QuestaoSchema = z.object({
  tipo: z.enum(["multipla", "vf"]),
  enunciado: z.string().min(3),
  alternativas: z.array(z.string()).min(2).max(4),
  correta: z.number().int().min(0).max(3),
  explicacao: z.string().min(3),
  dificuldade: z.enum(["basico", "intermediario", "avancado"]).optional(),
});
const FlashcardSchema = z.object({
  frente: z.string().min(2),
  verso: z.string().min(2),
  exemplo: z.string().min(2),
});

async function chamarGemini(prompt: string, schema: object) {
  const res = await geminiGenerateContent(
    GEMINI_MODEL,
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    },
    { maxAttemptsPerKey: 2 },
  );
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const txt = (json?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
  return JSON.parse(txt);
}

async function buscarArtigo(artigoId: string) {
  const sb = admin();
  const { data, error } = await sb
    .from("vade_mecum_artigos")
    .select("id, numero, texto, lei_id, questoes, flashcards, vade_mecum_leis(nome,nome_curto)")
    .eq("id", artigoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Artigo não encontrado");
  return data as any;
}

// ===== Questões =====

export const gerarQuestoesArtigo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ artigoId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const art = await buscarArtigo(data.artigoId);
    const cache = art.questoes as any;
    if (cache && Array.isArray(cache?.itens) && cache.itens.length > 0) {
      return { itens: cache.itens, total: cache.itens.length, cache: true };
    }
    const meta = tamanhos(art.texto ?? "");
    const leiNome = art.vade_mecum_leis?.nome_curto || art.vade_mecum_leis?.nome || "Norma";
    const prompt =
      `Você é a Profa. Ana, professora de Direito da OAB. Gere EXATAMENTE ${meta.questoes} questões sobre o artigo abaixo, em português do Brasil.\n\n` +
      `LEI: ${leiNome}\nART. ${art.numero}: ${art.texto}\n\n` +
      `REGRAS:\n` +
      `- Misture múltipla escolha (tipo "multipla", 4 alternativas) e verdadeiro/falso (tipo "vf", 2 alternativas: "Verdadeiro" e "Falso").\n` +
      `- Cerca de 60% múltipla escolha, 40% V/F.\n` +
      `- Ordem CRONOLÓGICA de aprendizado: comece pelo básico (literalidade), depois interpretação, e finalize com casos práticos/pegadinhas estilo OAB.\n` +
      `- Marque a dificuldade: "basico" (primeiras), "intermediario" (meio), "avancado" (finais).\n` +
      `- "correta" é o ÍNDICE (0-based) da alternativa certa.\n` +
      `- "explicacao" deve ser curta, didática e amigável (1–3 frases), explicando POR QUE a correta está certa.\n` +
      `- Nada de markdown nas strings. Texto puro.\n`;
    const schema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          tipo: { type: "STRING", enum: ["multipla", "vf"] },
          enunciado: { type: "STRING" },
          alternativas: { type: "ARRAY", items: { type: "STRING" } },
          correta: { type: "INTEGER" },
          explicacao: { type: "STRING" },
          dificuldade: { type: "STRING", enum: ["basico", "intermediario", "avancado"] },
        },
        required: ["tipo", "enunciado", "alternativas", "correta", "explicacao"],
      },
    };
    const raw = await chamarGemini(prompt, schema);
    const itens = z.array(QuestaoSchema).parse(raw);

    await admin()
      .from("vade_mecum_artigos")
      .update({
        questoes: { itens, gerado_em: new Date().toISOString(), modelo: GEMINI_MODEL, total: itens.length },
      })
      .eq("id", data.artigoId);

    return { itens, total: itens.length, cache: false };
  });

// ===== Flashcards =====

export const gerarFlashcardsArtigo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ artigoId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const art = await buscarArtigo(data.artigoId);
    const cache = art.flashcards as any;
    if (cache && Array.isArray(cache?.itens) && cache.itens.length > 0) {
      return { itens: cache.itens, total: cache.itens.length, cache: true };
    }
    const meta = tamanhos(art.texto ?? "");
    const leiNome = art.vade_mecum_leis?.nome_curto || art.vade_mecum_leis?.nome || "Norma";
    const prompt =
      `Você é a Profa. Ana, professora de Direito. Gere EXATAMENTE ${meta.flashcards} flashcards sobre o artigo abaixo, em português do Brasil.\n\n` +
      `LEI: ${leiNome}\nART. ${art.numero}: ${art.texto}\n\n` +
      `REGRAS:\n` +
      `- "frente": pergunta curta e direta (uma frase).\n` +
      `- "verso": resposta objetiva (1–2 frases).\n` +
      `- "exemplo": exemplo prático do dia a dia jurídico (1–3 frases), começando com "Ex.:".\n` +
      `- Ordem crescente de dificuldade: comece pelos conceitos básicos e termine com pegadinhas.\n` +
      `- Nada de markdown. Texto puro.\n`;
    const schema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          frente: { type: "STRING" },
          verso: { type: "STRING" },
          exemplo: { type: "STRING" },
        },
        required: ["frente", "verso", "exemplo"],
      },
    };
    const raw = await chamarGemini(prompt, schema);
    const itens = z.array(FlashcardSchema).parse(raw);

    await admin()
      .from("vade_mecum_artigos")
      .update({
        flashcards: { itens, gerado_em: new Date().toISOString(), modelo: GEMINI_MODEL, total: itens.length },
      })
      .eq("id", data.artigoId);

    return { itens, total: itens.length, cache: false };
  });

// ===== Tentativas =====

const RespostaSchema = z.object({
  i: z.number().int().min(0),
  escolha: z.number().int().min(0).max(3),
  correta: z.boolean(),
});

export const salvarTentativa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      artigoId: z.string().uuid(),
      leiId: z.string().uuid(),
      modo: z.enum(["questoes", "flashcards"]),
      acertos: z.number().int().min(0),
      total: z.number().int().min(1),
      respostas: z.array(RespostaSchema).max(60),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("vade_mecum_pratica_tentativas")
      .insert({
        user_id: userId,
        artigo_id: data.artigoId,
        lei_id: data.leiId,
        modo: data.modo,
        acertos: data.acertos,
        total: data.total,
        respostas: data.respostas,
        concluido_em: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const getHistoricoArtigo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ artigoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("vade_mecum_pratica_tentativas")
      .select("id, modo, acertos, total, concluido_em")
      .eq("artigo_id", data.artigoId)
      .eq("modo", "questoes")
      .order("concluido_em", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return { tentativas: rows ?? [] };
  });
