import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import {
  mistralOcrFromUrl,
  limparMarkdown,
  decodeBase64Image,
} from "@/lib/mistral-ocr.server";

const Input = z.object({
  arquivoDriveId: z.string().uuid(),
  pageStart: z.number().int().min(0).optional(),
  batchSize: z.number().int().min(1).max(100).optional(),
});

type PaginaOut = { n: number; texto: string; imagens: string[]; status?: "ok" | "sem_texto_detectado" };

async function contarPaginasPdf(docUrl: string): Promise<number> {
  const pdfRes = await fetch(docUrl);
  if (!pdfRes.ok) {
    throw new Error(`Prova real falhou: não consegui baixar o PDF (${pdfRes.status})`);
  }
  const buf = new Uint8Array(await pdfRes.arrayBuffer());
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  const total = pdf.getPageCount();
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error("Prova real falhou: não consegui contar as páginas do PDF");
  }
  return total;
}

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

        const pageStart = parsed.pageStart ?? 0;
        const batchSize = parsed.batchSize ?? 25;

        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const { data: arq, error: e1 } = await sb
          .from("aulas_interativas_arquivos_drive")
          .select("id, nome_arquivo, storage_bucket, storage_path, pdf_url")
          .eq("id", parsed.arquivoDriveId)
          .maybeSingle();
        if (e1 || !arq) {
          return new Response(`Arquivo não encontrado: ${e1?.message ?? ""}`, { status: 404 });
        }

        try {
          // URL do PDF
          let docUrl = arq.pdf_url as string | null;
          if (!docUrl) {
            const { data: pub } = sb.storage
              .from(arq.storage_bucket)
              .getPublicUrl(arq.storage_path);
            docUrl = pub.publicUrl;
          }
          if (!docUrl) throw new Error("Sem URL pública para o PDF");

          // Primeira chamada: marca status, faz a prova real do PDF e limpa extracao anterior
          let totalPaginas: number | null = null;
          if (pageStart === 0) {
            await sb
              .from("aulas_interativas_arquivos_drive")
              .update({
                status_ingestao: "extraindo",
                erro_msg: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", arq.id);

            totalPaginas = await contarPaginasPdf(docUrl);

            // Reseta extracao
            await sb
              .from("aulas_interativas_extracoes")
              .delete()
              .eq("arquivo_drive_id", arq.id);

            await sb.from("aulas_interativas_extracoes").insert({
              arquivo_drive_id: arq.id,
              markdown: "",
              paginas: [] as never,
              imagens: [] as never,
              paginas_total: totalPaginas,
              modelo: "mistral-ocr-latest",
            } as never);
          } else {
            const { data: ex } = await sb
              .from("aulas_interativas_extracoes")
              .select("paginas_total")
              .eq("arquivo_drive_id", arq.id)
              .maybeSingle();
            totalPaginas = (ex?.paginas_total as number | null) ?? await contarPaginasPdf(docUrl);
          }

          // Calcula intervalo desta batch
          const pagesArr: number[] = [];
          const hardEnd = totalPaginas ?? pageStart + batchSize;
          for (let p = pageStart; p < Math.min(pageStart + batchSize, hardEnd); p++) {
            pagesArr.push(p);
          }

          if (pagesArr.length === 0) {
            // Nada mais a processar — finaliza
            await finalizar(sb, arq.id);
            return Response.json({
              done: true,
              processadas: totalPaginas ?? 0,
              total: totalPaginas,
              proximaPagina: pageStart,
            });
          }

          // OCR da batch
          const ocr = await mistralOcrFromUrl(docUrl, { pages: pagesArr });

          // Processa imagens da batch
          const paginasBatch: PaginaOut[] = [];
          const imagensBatch: string[] = [];

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
                  imagensBatch.push(pub.publicUrl);
                }
              } catch {
                /* skip */
              }
            }

            let mdPagina = pg.markdown;
            pg.images.forEach((img, i) => {
              if (urls[i]) {
                mdPagina = mdPagina.replaceAll(`(${img.id})`, `(${urls[i]})`);
              }
            });

            paginasBatch.push({
              n: pg.index,
              texto: limparMarkdown(mdPagina),
              imagens: urls,
              status: limparMarkdown(mdPagina) ? "ok" : "sem_texto_detectado",
            });
          }

          const recebidas = new Set(paginasBatch.map((p) => p.n));
          for (const n of pagesArr) {
            if (!recebidas.has(n)) {
              paginasBatch.push({ n, texto: "", imagens: [], status: "sem_texto_detectado" });
            }
          }

          // Lê acumulado e mescla
          const { data: existing } = await sb
            .from("aulas_interativas_extracoes")
            .select("paginas, imagens")
            .eq("arquivo_drive_id", arq.id)
            .maybeSingle();

          const paginasAcc: PaginaOut[] = ((existing?.paginas as any) ?? []) as PaginaOut[];
          const imagensAcc: string[] = ((existing?.imagens as any) ?? []) as string[];

          // dedupe por n
          const mapPag = new Map<number, PaginaOut>();
          for (const p of paginasAcc) mapPag.set(p.n, p);
          for (const p of paginasBatch) mapPag.set(p.n, p);
          const paginasFinal = Array.from(mapPag.values()).sort((a, b) => a.n - b.n);
          const imagensFinal = [...imagensAcc, ...imagensBatch];

          const markdownAcc = limparMarkdown(
            paginasFinal.map((p) => p.texto).join("\n\n---\n\n"),
          );

          await sb
            .from("aulas_interativas_extracoes")
            .update({
              paginas: paginasFinal as never,
              imagens: imagensFinal as never,
              markdown: markdownAcc,
            })
            .eq("arquivo_drive_id", arq.id);

          // Decide se acabou. A prova real é o total do PDF, não a quantidade retornada pelo OCR.
          const proximaPagina = pageStart + pagesArr.length;
          const done = totalPaginas != null && proximaPagina >= totalPaginas;

          if (done) {
            await finalizar(sb, arq.id);
          }

          return Response.json({
            ok: true,
            done,
            processadas: paginasFinal.length,
            total: totalPaginas,
            proximaPagina,
            chars: markdownAcc.length,
            imagens: imagensFinal.length,
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

async function finalizar(sb: any, arqId: string) {
  await sb
    .from("aulas_interativas_arquivos_drive")
    .update({
      status_ingestao: "extraido",
      erro_msg: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", arqId);
}
