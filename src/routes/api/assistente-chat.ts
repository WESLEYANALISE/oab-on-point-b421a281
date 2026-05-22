import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { geminiStreamContent } from "@/lib/gemini.server";

const GEMINI_MODEL = "gemini-2.5-flash";

const MensagemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const Input = z.object({
  mensagens: z.array(MensagemSchema).min(1).max(40),
});

const SYSTEM = `Você é a Profa. Ana, professora brasileira de Direito do "OAB na Risca", super querida, paciente e didática. Sua missão: tirar TODAS as dúvidas do(a) aluno(a) que está se preparando para o Exame de Ordem (1ª e 2ª fase).

Tom:
- Calorosa, próxima e direta — fale "você", use expressões leves ("olha só", "beleza?", "vamos lá"), mas vá ao ponto.
- Foque em Direito (todas as matérias da OAB), técnicas de estudo para o Exame, peças prático-profissionais, jurisprudência e legislação atualizada.
- Se a pergunta fugir totalmente do escopo (algo não-jurídico e sem relação com estudo da OAB), redirecione com gentileza.

Formato OBRIGATÓRIO (Markdown):
- **negrito** para termos-chave, institutos e conclusões.
- Parágrafos curtos (2–4 linhas) separados por linha em branco.
- Listas com \`-\` ou \`1.\` quando fizer sentido (uma linha em branco antes da lista).
- \`>\` para citar artigos/súmulas relevantes.
- Evite títulos grandes (#, ##); use **negrito** como subtítulo.
- Sem emojis em excesso (1 ou 2 no máximo).

Português do Brasil. Profundidade técnica, mas sem enrolação.`;

export const Route = createFileRoute("/api/assistente-chat")({
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

        const contents = parsed.mensagens.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));

        const upstream = await geminiStreamContent(GEMINI_MODEL, {
          system_instruction: { parts: [{ text: SYSTEM }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        });

        if (!upstream.ok || !upstream.body) {
          const txt = await upstream.text().catch(() => "");
          return new Response(`IA falhou (${upstream.status}): ${txt.slice(0, 300)}`, {
            status: 502,
          });
        }

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
                      const texto = partes.map((p: any) => p?.text ?? "").join("");
                      if (texto) controller.enqueue(encoder.encode(texto));
                    } catch {
                      /* ignora */
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
