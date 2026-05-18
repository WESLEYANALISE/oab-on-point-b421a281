import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { geminiStreamContent } from "@/lib/gemini.server";

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

function buildSystem(artigo: z.infer<typeof Input>["artigo"]) {
  return (
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
    (artigo.explicacao ? `\nEXPLICAÇÃO BASE:\n${artigo.explicacao}\n` : "")
  );
}

export const Route = createFileRoute("/api/artigo-chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let parsed: z.infer<typeof Input>;
        try {
          const raw = await request.json();
          parsed = Input.parse(raw);
        } catch (e: any) {
          return new Response(`Bad request: ${e?.message ?? "invalid"}`, { status: 400 });
        }

        const { artigo, mensagens } = parsed;
        const contents = mensagens.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const upstream = await geminiStreamContent(GEMINI_MODEL, {
          system_instruction: { parts: [{ text: buildSystem(artigo) }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        });

        if (!upstream.ok || !upstream.body) {
          const txt = await upstream.text().catch(() => "");
          return new Response(`IA falhou (${upstream.status}): ${txt.slice(0, 300)}`, {
            status: 502,
          });
        }

        // Re-emite como text/plain streaming, extraindo apenas o texto dos eventos SSE.
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            const decoder = new TextDecoder();
            const encoder = new TextEncoder();
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                // SSE: eventos separados por \n\n
                let idx: number;
                while ((idx = buffer.indexOf("\n\n")) !== -1) {
                  const evento = buffer.slice(0, idx);
                  buffer = buffer.slice(idx + 2);
                  for (const linha of evento.split("\n")) {
                    if (!linha.startsWith("data:")) continue;
                    const payload = linha.slice(5).trim();
                    if (!payload || payload === "[DONE]") continue;
                    try {
                      const json: any = JSON.parse(payload);
                      const partes = json?.candidates?.[0]?.content?.parts ?? [];
                      const texto = partes
                        .map((p: any) => p?.text ?? "")
                        .join("");
                      if (texto) controller.enqueue(encoder.encode(texto));
                    } catch {
                      // ignora pedaços inválidos
                    }
                  }
                }
              }
              controller.close();
            } catch (e) {
              controller.error(e);
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
