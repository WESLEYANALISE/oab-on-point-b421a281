import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  resumo_livro_id: z.string().uuid(),
  ordem: z.number().int().min(1).max(999),
  tipo: z.enum(["exemplo", "termos"]),
});

const GEMINI_MODEL = "gemini-2.5-flash";

async function chamarGemini(system: string, user: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY ausente");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
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
        "Crie um exemplo prático e didático, em português do Brasil, baseado no capítulo fornecido. " +
        "Use markdown com hierarquia clara: ## para o título do exemplo, parágrafos curtos, **negrito** nos pontos-chave (será destacado em dourado), " +
        "use > blockquote para citação de artigos quando pertinente, e ao final uma seção '## Lição extraída' com 2-4 bullets. " +
        "Não repita literalmente o conteúdo do capítulo; ilustre com uma situação concreta. Não use H1.";
      user = `Capítulo: ${cap.data.titulo}\n\nConteúdo do capítulo:\n${conteudo}`;
    } else {
      system =
        "Você é um glossário jurídico didático em português do Brasil. " +
        "A partir do capítulo, identifique entre 5 e 10 termos jurídicos relevantes (expressões, institutos, palavras técnicas). " +
        "Para cada termo, gere markdown no formato:\n\n" +
        "### Termo\nDefinição clara, objetiva e contextualizada (1 a 3 frases). Use **negrito** para conceitos centrais.\n\n" +
        "Não use H1 nem H2. Não inclua introdução nem conclusão. Apenas a lista de termos no formato acima.";
      user = `Capítulo: ${cap.data.titulo}\n\nConteúdo do capítulo:\n${conteudo}`;
    }

    const conteudo_markdown = await chamarGemini(system, user);
    return { conteudo_markdown };
  });
