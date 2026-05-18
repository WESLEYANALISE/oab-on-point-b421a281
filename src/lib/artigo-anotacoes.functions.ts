import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { geminiGenerateContent } from "@/lib/gemini.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Gera sugestões de anotações (bullets curtos) sobre um artigo.
 * Útil pra alimentar a aba "Sugestões IA" do modo Anotações.
 */
export const gerarSugestoesAnotacoesArtigo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ artigoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const sb = supabaseAdmin;
    const { data: art, error } = await sb
      .from("vade_mecum_artigos")
      .select("numero, texto, vade_mecum_leis(nome, nome_curto)")
      .eq("id", data.artigoId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!art) throw new Error("Artigo não encontrado");

    const leiNome =
      (art as any).vade_mecum_leis?.nome_curto ||
      (art as any).vade_mecum_leis?.nome ||
      "Norma";

    const prompt =
      `Você é a Profa. Ana, professora de Direito da OAB. Liste 6 BULLETS curtos e objetivos para um estudante anotar sobre o artigo abaixo, em português do Brasil.\n\n` +
      `LEI: ${leiNome}\nART. ${art.numero ?? "—"}: ${art.texto}\n\n` +
      `REGRAS:\n` +
      `- Cada bullet com 1 frase (no máximo 20 palavras).\n` +
      `- Foque em: definição-chave, requisitos, exceções, prazos, pegadinhas de prova, jurisprudência relevante.\n` +
      `- Linguagem clara, didática, sem markdown nas strings (texto puro).\n` +
      `- Comece cada bullet pela palavra-chave (ex.: "Prazo:", "Exceção:", "Pegadinha:").\n`;

    const schema = {
      type: "ARRAY",
      items: { type: "STRING" },
    };

    const res = await geminiGenerateContent(
      GEMINI_MODEL,
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
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
    const txt = (json?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p?.text ?? "")
      .join("");
    const itens = z.array(z.string().min(2)).parse(JSON.parse(txt));
    return { itens };
  });

/**
 * Lista as anotações do usuário em uma lei, ordenadas por updated_at desc.
 * Inclui número do artigo pra mostrar na listagem.
 */
export const listarAnotacoesDaLei = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ leiId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("vade_mecum_anotacoes")
      .select("id, artigo_id, conteudo, updated_at, vade_mecum_artigos(numero)")
      .eq("user_id", userId)
      .eq("lei_id", data.leiId)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const itens = (rows ?? []).map((r: any) => ({
      id: r.id as string,
      artigo_id: r.artigo_id as string,
      conteudo: r.conteudo as string,
      updated_at: r.updated_at as string,
      numero: (r.vade_mecum_artigos?.numero ?? null) as string | null,
    }));
    return { itens };
  });
