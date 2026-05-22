import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { geminiGenerateContent } from "@/lib/gemini.server";

const MODEL = "gemini-2.5-flash";

// 1 chunk por request — evita timeout do Worker.
const Input = z.object({
  tituloCurso: z.string().min(1).max(200),
  modulo: z.string().min(1).max(200),
  texto: z.string().min(50).max(180_000),
});

const SYSTEM = `Você é um arquiteto pedagógico que transforma textos de Direito em AULAS INTERATIVAS de slides para estudantes brasileiros do Exame de Ordem (OAB).

Receberá UM CAPÍTULO de um livro. Sua tarefa:
1) Identificar as AULAS dentro do capítulo (subseções principais — ex.: "Lei penal no tempo", "Lei penal no espaço"). Cada aula tem 3 a 12 slides.
2) Cada aula vira um array de SLIDES tipados. Tipos válidos:
   - "capa": titulo + objetivos da aula (bullets de até 4)
   - "conceito": titulo + texto curto (no máximo 120 palavras) + destaque (1 frase com dispositivo legal ou regra-chave)
   - "exemplo": titulo + texto com um caso prático curto
   - "esquema": titulo + bullets (até 6) descrevendo um esquema visual
   - "comparativo": titulo + colunas[{titulo, itens[]}] (2 a 3 colunas)
   - "quiz": titulo "Teste rápido" + quiz_json {pergunta, alternativas[{letra:'A',texto}], correta:'A', explicacao}. Use a CADA 3–4 slides.
   - "resumo": titulo "O que vimos" + bullets dos pontos-chave
   - "conclusao": titulo "Próximos passos" + texto motivador curto

Regras:
- Texto em português do Brasil, direto, didático, sem "olha só".
- Cada slide tem 1 ideia central. NUNCA enfie 3 conceitos no mesmo slide.
- Use **negrito** em termos-chave dentro de "texto" e "destaque" (markdown).
- Não invente jurisprudência. Use APENAS o que está no texto recebido.
- Cada aula deve ter pelo menos 1 quiz.

SAÍDA: APENAS JSON válido, sem markdown ao redor, no schema:
{
  "aulas": [
    {
      "titulo": "string",
      "descricao": "string curta",
      "duracao_min": number (5-30),
      "slides": [
        {
          "ordem": number,
          "tipo": "capa"|"conceito"|"exemplo"|"esquema"|"comparativo"|"quiz"|"resumo"|"conclusao",
          "conteudo": {"titulo": "string", "texto": "string", "destaque": "string", "bullets": ["..."], "colunas": [{"titulo":"...", "itens":["..."]}]},
          "quiz_json": null | {"pergunta":"...","alternativas":[{"letra":"A","texto":"..."}],"correta":"A","explicacao":"..."}
        }
      ]
    }
  ]
}`;

export const Route = createFileRoute("/api/aulas-interativas-ingest")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let parsed: z.infer<typeof Input>;
        try {
          parsed = Input.parse(await request.json());
        } catch (e: any) {
          return new Response(`Bad request: ${e?.message ?? "invalid"}`, { status: 400 });
        }

        const prompt = `Curso: ${parsed.tituloCurso}\nCapítulo (módulo): ${parsed.modulo}\n\nTEXTO BRUTO DO CAPÍTULO:\n${parsed.texto}`;
        const res = await geminiGenerateContent(
          MODEL,
          {
            system_instruction: { parts: [{ text: SYSTEM }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: "application/json",
              maxOutputTokens: 32000,
            },
          },
          { maxAttemptsPerKey: 2, backoffMs: 1500 },
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: `Gemini ${res.status}: ${txt.slice(0, 400)}` }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        let estrutura: any;
        try {
          estrutura = JSON.parse(text);
        } catch {
          const m = text.match(/\{[\s\S]*\}/);
          estrutura = m ? JSON.parse(m[0]) : { aulas: [] };
        }

        return Response.json({
          modulo: {
            titulo: parsed.modulo,
            descricao: "",
            aulas: Array.isArray(estrutura?.aulas) ? estrutura.aulas : [],
          },
        });
      },
    },
  },
});
