import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Input = z.object({
  resumo_livro_id: z.string().uuid(),
  ordem: z.number().int().min(1).max(999),
  tipo: z.enum(["exemplo", "termos"]),
});

async function chamarIA(system: string, user: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`IA falhou (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json: any = await res.json();
  return json?.choices?.[0]?.message?.content ?? "";
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

    const conteudo_markdown = await chamarIA(system, user);
    return { conteudo_markdown };
  });
