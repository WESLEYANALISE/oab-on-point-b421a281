import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { geminiGenerateContent } from "@/lib/gemini.server";

const MODEL = "gemini-2.5-flash";

const Input = z.object({
  arquivoDriveId: z.string().uuid(),
  tituloCurso: z.string().min(1).max(200).optional(),
  materia: z.string().min(1).max(120).optional(),
});

const SYSTEM = `Você é um arquiteto pedagógico que transforma um MATERIAL DE ESTUDO em CURSO INTERATIVO de slides para alunos brasileiros da OAB.

Receberá o TEXTO EM MARKDOWN já extraído de um PDF (com imagens referenciadas por URL).

Tarefa:
1) Identifique a estrutura: MÓDULOS (capítulos) → AULAS (subseções) → SLIDES (3 a 10 por aula).
2) Cada slide tem 1 ideia central, em português do Brasil, direto e didático.
3) Tipos de slide válidos:
   - "capa": titulo + objetivos (bullets até 4)
   - "conceito": titulo + texto (≤120 palavras) + destaque (1 frase com dispositivo/regra-chave)
   - "exemplo": titulo + texto com caso prático curto
   - "esquema": titulo + bullets (até 6)
   - "comparativo": titulo + colunas[{titulo, itens[]}] (2-3 colunas)
   - "quiz": titulo "Teste rápido" + quiz_json {pergunta, alternativas[{letra:"A",texto}], correta:"A", explicacao}. A CADA 3-4 slides.
   - "resumo": titulo "O que vimos" + bullets dos pontos-chave
   - "conclusao": titulo "Próximos passos" + texto motivador curto

Regras:
- Use **negrito** (markdown) em termos-chave dentro de texto/destaque.
- Cada aula precisa de pelo menos 1 quiz.
- NÃO invente: use só o conteúdo do material. Se houver imagem útil (URL no markdown), referencie em "imagem_url" do slide.
- IGNORE conteúdo que não seja jurídico (citações ao professor, logos, propaganda de cursinho, redes sociais).

SAÍDA: APENAS JSON válido (sem markdown ao redor):
{
  "titulo_sugerido": "string",
  "materia_sugerida": "string",
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
              "conteudo": {"titulo":"...","texto":"...","destaque":"...","bullets":[...],"colunas":[{"titulo":"...","itens":[...]}]},
              "imagem_url": null,
              "quiz_json": null
            }
          ]
        }
      ]
    }
  ]
}`;

export const Route = createFileRoute("/api/aulas-interativas-preview")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let parsed: z.infer<typeof Input>;
        try {
          parsed = Input.parse(await request.json());
        } catch (e: any) {
          return new Response(`Bad request: ${e?.message ?? "invalid"}`, { status: 400 });
        }

        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data: arq } = await sb
          .from("aulas_interativas_arquivos_drive")
          .select("id, nome_arquivo, subpasta")
          .eq("id", parsed.arquivoDriveId)
          .maybeSingle();
        if (!arq) return new Response("Arquivo não encontrado", { status: 404 });

        const { data: extr } = await sb
          .from("aulas_interativas_extracoes")
          .select("markdown")
          .eq("arquivo_drive_id", arq.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!extr?.markdown) {
          return new Response("Extração não encontrada. Rode a extração primeiro.", {
            status: 409,
          });
        }

        await sb
          .from("aulas_interativas_arquivos_drive")
          .update({
            status_ingestao: "gerando_previa",
            erro_msg: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", arq.id);

        try {
          const titulo =
            parsed.tituloCurso ?? arq.nome_arquivo.replace(/\.pdf$/i, "");
          const materia = parsed.materia ?? arq.subpasta;
          const prompt = `Curso sugerido: ${titulo}\nMatéria: ${materia}\n\nMATERIAL EM MARKDOWN:\n${extr.markdown.slice(0, 300_000)}`;

          const res = await geminiGenerateContent(
            MODEL,
            {
              system_instruction: { parts: [{ text: SYSTEM }] },
              contents: [{ role: "user", parts: [{ text: prompt }] }],
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
            throw new Error(`Gemini ${res.status}: ${txt.slice(0, 400)}`);
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
          const out = {
            modulos: Array.isArray(estrutura?.modulos) ? estrutura.modulos : [],
          };

          await sb
            .from("aulas_interativas_previas")
            .delete()
            .eq("arquivo_drive_id", arq.id);

          const { error: eIns } = await sb.from("aulas_interativas_previas").insert({
            arquivo_drive_id: arq.id,
            estrutura: out as never,
            titulo_sugerido: estrutura?.titulo_sugerido ?? titulo,
            materia_sugerida: estrutura?.materia_sugerida ?? materia,
          } as never);
          if (eIns) throw new Error(eIns.message);

          await sb
            .from("aulas_interativas_arquivos_drive")
            .update({
              status_ingestao: "previa_pronta",
              erro_msg: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", arq.id);

          return Response.json({
            ok: true,
            estrutura: out,
            titulo_sugerido: estrutura?.titulo_sugerido ?? titulo,
            materia_sugerida: estrutura?.materia_sugerida ?? materia,
          });
        } catch (err: any) {
          await sb
            .from("aulas_interativas_arquivos_drive")
            .update({
              status_ingestao: "erro",
              erro_msg: String(err?.message ?? err).slice(0, 500),
              updated_at: new Date().toISOString(),
            })
            .eq("id", arq.id);
          return new Response(
            JSON.stringify({ error: String(err?.message ?? err) }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
