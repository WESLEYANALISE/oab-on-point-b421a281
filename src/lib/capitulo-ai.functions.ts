import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { geminiGenerateContent } from "@/lib/gemini.server";

const Input = z.object({
  resumo_livro_id: z.string().uuid(),
  ordem: z.number().int().min(1).max(999),
  tipo: z.enum(["exemplo", "termos"]),
});

const GEMINI_MODEL = "gemini-2.5-flash-lite";

async function chamarGemini(system: string, user: string): Promise<string> {
  const res = await geminiGenerateContent(GEMINI_MODEL, {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini falhou (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const partes = json?.candidates?.[0]?.content?.parts ?? [];
  return partes.map((p: any) => p?.text ?? "").join("").trim();
}

export const gerarComplementoCapitulo = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const cap = await supabaseAdmin
      .from("resumo_capitulos")
      .select("id, titulo, conteudo_markdown")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("ordem", data.ordem)
      .maybeSingle();
    if (cap.error || !cap.data) throw new Error("Capítulo não encontrado");

    const conteudo = (cap.data.conteudo_markdown ?? "").slice(0, 6000);

    let system = "";
    let user = "";

    if (data.tipo === "exemplo") {
      system =
        "Você é um professor de Direito brasileiro voltado a concursos públicos (OAB e afins). " +
        "Crie um exemplo prático COMPLETO e didático, em português do Brasil, baseado no capítulo fornecido. " +
        "Use markdown com hierarquia clara: ## para o título do exemplo, parágrafos curtos e bem desenvolvidos, **negrito** nos pontos-chave (será destacado em dourado), " +
        "use > blockquote para citação de artigos quando pertinente, e ao final uma seção '## Lição extraída' com 3-5 bullets objetivos. " +
        "IMPORTANTE: termine sempre o texto de forma completa — nunca corte no meio de uma frase ou seção. " +
        "Não repita literalmente o conteúdo do capítulo; ilustre com uma situação concreta. Não use H1.";
      user = `Capítulo: ${cap.data.titulo}\n\nConteúdo do capítulo:\n${conteudo}`;
    } else {
      system =
        "Você é um glossário jurídico didático e detalhado em português do Brasil. " +
        "A partir do capítulo, identifique entre 10 e 15 termos jurídicos relevantes (expressões, institutos, palavras técnicas, princípios, conceitos centrais). " +
        "Para cada termo, gere markdown no formato:\n\n" +
        "### Termo\nDefinição completa, clara e contextualizada em 3 a 5 frases. Explique o significado técnico, " +
        "como o termo se aplica no contexto do capítulo e, quando possível, mencione fundamento legal ou exemplo prático breve. " +
        "Use **negrito** para conceitos centrais dentro da definição.\n\n" +
        "Não use H1 nem H2. Não inclua introdução nem conclusão. Apenas a lista de termos no formato acima. " +
        "Termine sempre o último termo de forma completa — nunca corte no meio de uma definição.";
      user = `Capítulo: ${cap.data.titulo}\n\nConteúdo do capítulo:\n${conteudo}`;
    }

    const conteudo_markdown = await chamarGemini(system, user);
    return { conteudo_markdown };
  });
