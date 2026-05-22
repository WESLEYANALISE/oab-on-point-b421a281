import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  mistralOcrFromUrl,
  limparMarkdown,
  decodeBase64Image,
} from "@/lib/mistral-ocr.server";

const Input = z.object({
  arquivoDriveId: z.string().uuid(),
});

export const Route = createFileRoute("/api/aulas-interativas-extract")({
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

        // 1) Busca o arquivo
        const { data: arq, error: e1 } = await sb
          .from("aulas_interativas_arquivos_drive")
          .select("id, nome_arquivo, storage_bucket, storage_path, pdf_url")
          .eq("id", parsed.arquivoDriveId)
          .maybeSingle();
        if (e1 || !arq) {
          return new Response(`Arquivo não encontrado: ${e1?.message ?? ""}`, { status: 404 });
        }

        // 2) Marca como extraindo
        await sb
          .from("aulas_interativas_arquivos_drive")
          .update({
            status_ingestao: "extraindo",
            erro_msg: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", arq.id);

        try {
          // 3) Gera URL pública assinada (bucket pode ser público mas signed dá garantia)
          let docUrl = arq.pdf_url as string | null;
          if (!docUrl) {
            const { data: pub } = sb.storage
              .from(arq.storage_bucket)
              .getPublicUrl(arq.storage_path);
            docUrl = pub.publicUrl;
          }
          if (!docUrl) throw new Error("Sem URL pública para o PDF");

          // 4) Chama Mistral OCR
          const ocr = await mistralOcrFromUrl(docUrl);

          // 5) Upload das imagens para o Storage
          const paginasOut: Array<{ n: number; texto: string; imagens: string[] }> = [];
          const todasImagens: string[] = [];

          for (const pg of ocr.pages) {
            const urls: string[] = [];
            for (let i = 0; i < pg.images.length; i++) {
              const img = pg.images[i];
              if (!img.image_base64) continue;
              try {
                const { bytes, mime } = decodeBase64Image(img.image_base64);
                const ext = mime.includes("jpeg") ? "jpg" : mime.includes("webp") ? "webp" : "png";
                const path = `extracoes/${arq.id}/pag-${pg.index}-img-${i}.${ext}`;
                const up = await sb.storage
                  .from("aulas-interativas-imagens")
                  .upload(path, bytes, { contentType: mime, upsert: true });
                if (!up.error) {
                  const { data: pub } = sb.storage
                    .from("aulas-interativas-imagens")
                    .getPublicUrl(path);
                  urls.push(pub.publicUrl);
                  todasImagens.push(pub.publicUrl);
                }
              } catch {
                /* skip imagem com problema */
              }
            }

            // Substitui referências da imagem no markdown da página
            let mdPagina = pg.markdown;
            pg.images.forEach((img, i) => {
              if (urls[i]) {
                const novoUrl = urls[i];
                mdPagina = mdPagina.replaceAll(`(${img.id})`, `(${novoUrl})`);
              }
            });

            paginasOut.push({
              n: pg.index,
              texto: limparMarkdown(mdPagina),
              imagens: urls,
            });
          }

          const markdownCompleto = limparMarkdown(
            paginasOut.map((p) => p.texto).join("\n\n---\n\n"),
          );

          // 6) Apaga extracoes anteriores deste arquivo (idempotência)
          await sb
            .from("aulas_interativas_extracoes")
            .delete()
            .eq("arquivo_drive_id", arq.id);

          // 7) Salva nova extração
          const { error: eIns } = await sb.from("aulas_interativas_extracoes").insert({
            arquivo_drive_id: arq.id,
            markdown: markdownCompleto,
            paginas: paginasOut as never,
            imagens: todasImagens as never,
            paginas_total: ocr.pages.length,
            modelo: ocr.model ?? "mistral-ocr-latest",
          } as never);
          if (eIns) throw new Error(eIns.message);

          // 8) Atualiza status
          await sb
            .from("aulas_interativas_arquivos_drive")
            .update({
              status_ingestao: "extraido",
              erro_msg: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", arq.id);

          return Response.json({
            ok: true,
            paginas: ocr.pages.length,
            imagens: todasImagens.length,
            chars: markdownCompleto.length,
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
