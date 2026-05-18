import { jsPDF } from "jspdf";
import { markdownToPlainText } from "./whatsapp-markdown";

export type ConversaPDFInput = {
  leiNome: string;
  artigoNumero: string;
  pergunta: string;
  resposta: string;
};

export function exportarConversaPDF({
  leiNome,
  artigoNumero,
  pergunta,
  resposta,
}: ConversaPDFInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const drawText = (
    text: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {},
  ) => {
    const { size = 11, bold = false, color = [30, 30, 30], gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(size + gap);
      doc.text(line, margin, y);
      y += size + gap;
    }
  };

  // Cabeçalho
  drawText("Profa. Ana — OAB On Point", { size: 16, bold: true, color: [184, 134, 11] });
  drawText(`Art. ${artigoNumero} · ${leiNome}`, { size: 10, color: [110, 110, 110], gap: 6 });

  // Linha
  ensureSpace(14);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 14;

  // Pergunta
  drawText("Sua pergunta", { size: 11, bold: true, color: [120, 80, 0], gap: 6 });
  drawText(pergunta, { size: 11, gap: 5 });
  y += 8;

  // Resposta
  drawText("Resposta", { size: 11, bold: true, color: [120, 80, 0], gap: 6 });
  const respostaPlain = markdownToPlainText(resposta);
  // Quebra por parágrafos para dar respiro
  for (const paragrafo of respostaPlain.split(/\n{2,}/)) {
    drawText(paragrafo, { size: 11, gap: 5 });
    y += 6;
  }

  // Rodapé
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `OAB On Point — ${i}/${totalPages}`,
      pageWidth - margin,
      pageHeight - 20,
      { align: "right" },
    );
  }

  const safeNum = String(artigoNumero).replace(/[^a-zA-Z0-9]+/g, "-");
  doc.save(`profa-ana-art-${safeNum}.pdf`);
}
