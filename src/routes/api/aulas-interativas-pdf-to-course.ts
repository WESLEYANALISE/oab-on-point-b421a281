import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { geminiGenerateContent } from "@/lib/gemini.server";

const MODEL = "gemini-2.5-flash";

const Input = z.object({
  tituloCurso: z.string().min(1).max(200),
  materia: z.string().min(1).max(80).default("Geral"),
  // Fonte do PDF: storage OU base64
  storage_bucket: z.string().min(1).max(120).optional(),
  storage_path: z.string().min(1).max(500).optional(),
  pdfBase64: z.string().min(100).optional(),
});

const SYSTEM = `Você é um arquiteto pedagógico que transforma um LIVRO/PDF em CURSO INTERATIVO de slides para estudantes brasileiros da OAB.

Receberá um PDF inteiro. Sua tarefa:

1) Identificar a estrutura: o livro tem CAPÍTULOS (módulos). Cada módulo tem AULAS (subseções). Cada aula tem 3 a 10 slides.
2) Cada slide tem 1 ideia central, em português do Brasil, direto, didático.
3) Tipos válidos de slide:
   - "capa": titulo + objetivos (bullets até 4)
   - "conceito": titulo + texto (máx. 120 palavras) + destaque (1 frase com dispositivo legal ou regra-chave)
   - "exemplo": titulo + texto com um caso prático curto
   - "esquema": titulo + bullets (até 6) descrevendo um esquema visual
   - "comparativo": titulo + colunas[{titulo, itens[]}] (2-3 colunas)
   - "quiz": titulo "Teste rápido" + quiz_json {pergunta, alternativas[{letra:'A',texto}], correta:'A', explicacao}. A CADA 3-4 slides.
   - "resumo": titulo "O que vimos" + bullets dos pontos-chave
   - "conclusao": titulo "Próximos passos" + texto motivador curto

Regras:
- Use **negrito** em termos-chave (markdown) dentro de texto/destaque.
- Cada aula deve ter pelo menos 1 quiz.
- NÃO invente: use apenas o conteúdo do PDF.

SAÍDA: APENAS JSON válido (sem markdown ao redor), schema:
{
  "modulos": [
    {
      "titulo": "string",
      "descricao": "string curta",
      "aulas": [
        {
          "titulo": "string",
          "descricao": "string curta",
          "duracao_min": number,
          "slides": [
            {
              "ordem": number,
              "tipo": "capa"|"conceito"|"exemplo"|"esquema"|"comparativo"|"quiz"|"resumo"|"conclusao",
              "conteudo": {"titulo":"...", "texto":"...", "destaque":"...", "bullets":[...], "colunas":[{"titulo":"...","itens":[...]}]},
              "quiz_json": null | {"pergunta":"...","alternativas":[{"letra":"A","texto":"..."}],"correta":"A","explicacao":"..."}
            }
          ]
        }
      ]
    }
  ]
}`;

export const Route = createFileRoute("/api/aulas-interativas-pdf-to-course")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let parsed: z.infer<typeof Input>;
        try {
          parsed = Input.parse(await request.json());
        } catch (e: any) {
          return new Response(`Bad request: ${e?.message ?? "invalid"}`, { status: 400 });
        }

        // Resolve PDF base64
        let pdfBase64 = parsed.pdfBase64;
        if (!pdfBase64) {
          if (!parsed.storage_bucket || !parsed.storage_path) {
            return new Response("Forneça pdfBase64 OU (storage_bucket+storage_path)", { status: 400 });
          }
          const { createClient } = await import("@supabase/supabase-js");
          const url = process.env.SUPABASE_URL!;
          const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
          const sb = createClient(url, key);
          const { data, error } = await sb.storage.from(parsed.storage_bucket).download(parsed.storage_path);
          if (error || !data) {
            return new Response(`Falha ao baixar do Storage: ${error?.message ?? "n/a"}`, { status: 502 });
          }
          const buf = new Uint8Array(await data.arrayBuffer());
          // base64 sem usar Buffer (Worker friendly)
          let bin = "";
          const chunk = 0x8000;
          for (let i = 0; i < buf.length; i += chunk) {
            bin += String.fromCharCode(...buf.subarray(i, i + chunk));
          }
          pdfBase64 = btoa(bin);
        }

        const prompt = `Curso: ${parsed.tituloCurso}\nMatéria: ${parsed.materia}\n\nProcesse o PDF anexado em um curso completo no JSON pedido.`;

        const res = await geminiGenerateContent(
          MODEL,
          {
            system_instruction: { parts: [{ text: SYSTEM }] },
            contents: [
              {
                role: "user",
                parts: [
                  { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              responseMimeType: "application/json",
              maxOutputTokens: 60000,
            },
          },
          { maxAttemptsPerKey: 2, backoffMs: 2000 },
        );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: `Gemini ${res.status}: ${txt.slice(0, 500)}` }),
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
          estrutura = m ? JSON.parse(m[0]) : { modulos: [] };
        }

        return Response.json({
          estrutura: {
            modulos: Array.isArray(estrutura?.modulos) ? estrutura.modulos : [],
          },
        });
      },
    },
  },
});
