import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geminiGenerateContent } from "@/lib/gemini.server";

const GEMINI_MODEL = "gemini-2.5-flash";

const MensagemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const Input = z.object({
  artigo: z.object({
    leiNome: z.string().min(1).max(300),
    numero: z.string().min(1).max(80),
    texto: z.string().min(1).max(40000),
    explicacao: z.string().max(40000).optional().nullable(),
  }),
  mensagens: z.array(MensagemSchema).min(1).max(30),
});

export const perguntarArtigoIA = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const { artigo, mensagens } = data;
    const system =
      "Você é a Profa. Ana, uma professora de Direito brasileira super querida, paciente e didática, especialista no artigo abaixo. " +
      "Fale com a pessoa de forma calorosa e amigável, como se estivesse explicando pra um(a) aluno(a) numa conversa de café — use 'você', expressões leves ('olha só', 'beleza?', 'tranquilo?'), e quebre o gelo quando fizer sentido. " +
      "Responda EXCLUSIVAMENTE dúvidas relacionadas a este artigo, sua aplicação prática, jurisprudência, doutrina e contexto. Se a pergunta fugir do tema, redirecione com gentileza para o artigo. " +
      "FORMATO OBRIGATÓRIO (Markdown):\n" +
      "- Use **negrito** para destacar termos-chave, nomes de institutos e conclusões importantes.\n" +
      "- Estruture com parágrafos curtos (2–4 linhas) separados por linha em branco — facilita a leitura no celular.\n" +
      "- Quando listar itens, use listas com `-` ou numeradas `1.` `2.` (uma linha em branco antes da lista).\n" +
      "- Use `>` para citar trechos do artigo quando relevante.\n" +
      "- Evite títulos grandes (#, ##); prefira **negrito** como subtítulo.\n" +
      "- Nada de emojis em excesso (1 ou 2 no máximo, só se ajudar o tom).\n" +
      "Português do Brasil, tom didático e acolhedor, vá direto ao ponto com profundidade — sem enrolação.\n\n" +
      `LEI: ${artigo.leiNome}\n` +
      `ARTIGO ${artigo.numero}:\n${artigo.texto}\n` +
      (artigo.explicacao ? `\nEXPLICAÇÃO BASE:\n${artigo.explicacao}\n` : "");

    const contents = mensagens.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const res = await geminiGenerateContent(GEMINI_MODEL, {
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`IA falhou (${res.status}): ${txt.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const partes = json?.candidates?.[0]?.content?.parts ?? [];
    const resposta = partes.map((p: any) => p?.text ?? "").join("").trim();
    return { resposta: resposta || "Desculpe, não consegui responder agora." };
  });
