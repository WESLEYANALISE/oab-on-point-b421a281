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
      "Você é um professor de Direito brasileiro especialista no artigo abaixo. " +
      "Responda EXCLUSIVAMENTE dúvidas relacionadas a este artigo, sua aplicação, jurisprudência, doutrina e contexto. " +
      "Se a pergunta fugir do tema, redirecione gentilmente para o artigo. " +
      "Use português do Brasil, tom didático, parágrafos curtos. Use **negrito** para pontos-chave. " +
      "Evite respostas longas demais — vá direto ao ponto, com profundidade.\n\n" +
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
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
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
