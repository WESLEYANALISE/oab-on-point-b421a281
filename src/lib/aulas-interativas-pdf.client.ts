// PDF parsing no browser usando pdfjs-dist.
// Identifica capítulos top-level (1., 2., 3.) e devolve "chunks" prontos para a IA.

import * as pdfjsLib from "pdfjs-dist";
// @ts-expect-error import asset
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type PdfChunk = { modulo: string; texto: string };

export type PdfParseResult = {
  totalPaginas: number;
  textoCompleto: string;
  chunks: PdfChunk[];
};

/**
 * Lê todo o PDF e segmenta por capítulos top-level (linhas que começam com "1.", "2.", "3."…).
 * Cada capítulo vira um chunk para a IA estruturar em aulas.
 * Se nenhum capítulo for detectado, usa fallback de chunks por contagem de páginas.
 */
export async function parsePdfToChunks(
  file: File,
  onProgress?: (paginaAtual: number, total: number) => void,
): Promise<PdfParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPaginas = pdf.numPages;
  let textoCompleto = "";

  for (let i = 1; i <= totalPaginas; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const linha = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    textoCompleto += `\n${linha}\n`;
    onProgress?.(i, totalPaginas);
  }

  // Detecta capítulos top-level: " 1. Título…", " 2. Título…"
  const linhas = textoCompleto.split("\n");
  const capRegex = /^\s*(\d{1,2})\.\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{6,120})/;
  const indices: { idx: number; num: number; titulo: string }[] = [];
  linhas.forEach((linha, idx) => {
    const m = linha.match(capRegex);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num >= 1 && num <= 50 && (!indices.length || num === indices[indices.length - 1].num + 1)) {
        indices.push({ idx, num, titulo: m[2].trim() });
      }
    }
  });

  let chunks: PdfChunk[] = [];
  if (indices.length >= 2) {
    for (let i = 0; i < indices.length; i++) {
      const start = indices[i].idx;
      const end = i + 1 < indices.length ? indices[i + 1].idx : linhas.length;
      const texto = linhas.slice(start, end).join("\n").trim();
      if (texto.length > 200) {
        chunks.push({
          modulo: `${indices[i].num}. ${indices[i].titulo}`,
          texto: texto.slice(0, 150_000),
        });
      }
    }
  }

  // Fallback: divide texto em chunks de ~25k chars
  if (!chunks.length) {
    const tamanho = 25_000;
    for (let i = 0; i < textoCompleto.length; i += tamanho) {
      chunks.push({
        modulo: `Parte ${chunks.length + 1}`,
        texto: textoCompleto.slice(i, i + tamanho),
      });
    }
  }

  return { totalPaginas, textoCompleto, chunks };
}
