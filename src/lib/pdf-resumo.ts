import jsPDF from "jspdf";
import { normalizarTitulo } from "@/lib/titulo";

type Capitulo = {
  ordem: number;
  titulo: string;
  conteudo_markdown: string | null;
};

type Livro = {
  titulo: string;
  autor: string | null;
};

// Paleta jurídica: bordô profundo + dourado
const COR_BORDO: [number, number, number] = [88, 20, 28];
const COR_DOURADO: [number, number, number] = [176, 137, 60];
const COR_DOURADO_CLARO: [number, number, number] = [212, 175, 92];
const COR_TEXTO: [number, number, number] = [38, 30, 28];
const COR_TEXTO_SUAVE: [number, number, number] = [110, 96, 92];
const COR_CREME: [number, number, number] = [250, 246, 238];

const MARCA = "OAB na Risca";

type Bloco =
  | { tipo: "h2"; texto: string }
  | { tipo: "h3"; texto: string }
  | { tipo: "p"; segmentos: { texto: string; bold: boolean }[] }
  | { tipo: "li"; segmentos: { texto: string; bold: boolean }[] }
  | { tipo: "quote"; texto: string }
  | { tipo: "espaco" };

function segmentarNegrito(linha: string): { texto: string; bold: boolean }[] {
  const partes: { texto: string; bold: boolean }[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(linha)) !== null) {
    if (m.index > last) partes.push({ texto: linha.slice(last, m.index), bold: false });
    partes.push({ texto: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < linha.length) partes.push({ texto: linha.slice(last), bold: false });
  return partes.length ? partes : [{ texto: linha, bold: false }];
}

function parseMarkdown(md: string): Bloco[] {
  const blocos: Bloco[] = [];
  const linhas = md
    .replace(/\r\n/g, "\n")
    .replace(/^#\s+.+\n+/, "") // remove H1
    .split("\n");

  for (let i = 0; i < linhas.length; i++) {
    const raw = linhas[i];
    const linha = raw.trim();
    if (!linha) {
      blocos.push({ tipo: "espaco" });
      continue;
    }
    if (linha.startsWith("### ")) {
      blocos.push({ tipo: "h3", texto: linha.slice(4).replace(/\*\*/g, "") });
      continue;
    }
    if (linha.startsWith("## ")) {
      blocos.push({ tipo: "h2", texto: linha.slice(3).replace(/\*\*/g, "") });
      continue;
    }
    if (linha.startsWith("# ")) {
      blocos.push({ tipo: "h2", texto: linha.slice(2).replace(/\*\*/g, "") });
      continue;
    }
    if (linha.startsWith("> ")) {
      blocos.push({ tipo: "quote", texto: linha.slice(2).replace(/\*\*/g, "") });
      continue;
    }
    if (/^[-*]\s+/.test(linha)) {
      blocos.push({ tipo: "li", segmentos: segmentarNegrito(linha.replace(/^[-*]\s+/, "")) });
      continue;
    }
    if (/^\d+\.\s+/.test(linha)) {
      blocos.push({ tipo: "li", segmentos: segmentarNegrito(linha.replace(/^\d+\.\s+/, "")) });
      continue;
    }
    // detectar artigos como citação
    if (/^Art(?:igo)?\.?\s*\d+/i.test(linha)) {
      blocos.push({ tipo: "quote", texto: linha.replace(/\*\*/g, "") });
      continue;
    }
    blocos.push({ tipo: "p", segmentos: segmentarNegrito(linha) });
  }

  // colapsar espaços duplicados
  const out: Bloco[] = [];
  for (const b of blocos) {
    if (b.tipo === "espaco" && out[out.length - 1]?.tipo === "espaco") continue;
    out.push(b);
  }
  return out;
}

export async function gerarPdfCapitulo(
  livro: Livro,
  capitulo: Capitulo,
  totalCapitulos: number,
  extras?: { exemplo?: string | null; termos?: string | null },
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const margemX = 22;
  const margemTop = 26;
  const margemBottom = 22;
  const larguraTexto = W - margemX * 2;

  // ===== Capa =====
  desenharCapaCapitulo(doc, livro, capitulo, totalCapitulos, W, H);

  // ===== Conteúdo =====
  const secoes: { rotulo: string; titulo: string; markdown: string }[] = [
    {
      rotulo: `CAPÍTULO ${capitulo.ordem} DE ${totalCapitulos}`,
      titulo: normalizarTitulo(capitulo.titulo),
      markdown: capitulo.conteudo_markdown ?? "",
    },
  ];
  if (extras?.exemplo) {
    secoes.push({
      rotulo: "COMPLEMENTO",
      titulo: "Exemplo Prático",
      markdown: extras.exemplo,
    });
  }
  if (extras?.termos) {
    secoes.push({
      rotulo: "COMPLEMENTO",
      titulo: "Termos Jurídicos",
      markdown: extras.termos,
    });
  }

  for (const sec of secoes) {
    doc.addPage();
    desenharCabecalho(doc, livro.titulo, W);
    let y = margemTop;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COR_DOURADO);
    doc.text(sec.rotulo, margemX, y - 8);

    doc.setFont("times", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...COR_BORDO);
    const tituloLinhas = doc.splitTextToSize(sec.titulo, larguraTexto);
    doc.text(tituloLinhas, margemX, y);
    y += tituloLinhas.length * 8 + 2;

    doc.setDrawColor(...COR_DOURADO);
    doc.setLineWidth(0.5);
    doc.line(margemX, y, margemX + 38, y);
    y += 8;

    const blocos = parseMarkdown(sec.markdown);

    for (const b of blocos) {
      const garantirEspaco = (altura: number) => {
        if (y + altura > H - margemBottom) {
          desenharRodape(doc, W, H);
          doc.addPage();
          desenharCabecalho(doc, livro.titulo, W);
          y = margemTop;
        }
      };

      if (b.tipo === "espaco") {
        y += 2.5;
        continue;
      }

      if (b.tipo === "h2") {
        garantirEspaco(14);
        y += 3;
        doc.setFont("times", "bold");
        doc.setFontSize(15);
        doc.setTextColor(...COR_BORDO);
        const ls = doc.splitTextToSize(b.texto, larguraTexto);
        doc.text(ls, margemX, y);
        y += ls.length * 6.5 + 2;
        doc.setDrawColor(...COR_DOURADO);
        doc.setLineWidth(0.3);
        doc.line(margemX, y, margemX + 22, y);
        y += 4;
        continue;
      }

      if (b.tipo === "h3") {
        garantirEspaco(10);
        y += 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11.5);
        doc.setTextColor(...COR_DOURADO);
        const ls = doc.splitTextToSize(b.texto, larguraTexto);
        doc.text(ls, margemX, y);
        y += ls.length * 5.5 + 1.5;
        continue;
      }

      if (b.tipo === "quote") {
        const padX = 5;
        const larguraQ = larguraTexto - padX * 2;
        doc.setFont("times", "italic");
        doc.setFontSize(10.5);
        doc.setTextColor(...COR_BORDO);
        const ls = doc.splitTextToSize(b.texto, larguraQ);
        const altura = ls.length * 5.2 + 6;
        garantirEspaco(altura + 2);
        doc.setFillColor(...COR_CREME);
        doc.rect(margemX, y - 1, larguraTexto, altura, "F");
        doc.setFillColor(...COR_DOURADO);
        doc.rect(margemX, y - 1, 1.4, altura, "F");
        doc.text(ls, margemX + padX, y + 4);
        y += altura + 3;
        continue;
      }

      if (b.tipo === "li") {
        doc.setFont("times", "normal");
        doc.setFontSize(11);
        renderizarSegmentos(
          doc,
          b.segmentos,
          margemX + 6,
          larguraTexto - 6,
          () => y,
          (ny) => (y = ny),
          () => {
            desenharRodape(doc, W, H);
            doc.addPage();
            desenharCabecalho(doc, livro.titulo, W);
            y = margemTop;
          },
          H - margemBottom,
          {
            prefixo: "•",
            corPrefixo: COR_DOURADO,
            corBold: COR_DOURADO,
            corNormal: COR_TEXTO,
          },
        );
        y += 1.5;
        continue;
      }

      doc.setFont("times", "normal");
      doc.setFontSize(11);
      renderizarSegmentos(
        doc,
        b.segmentos,
        margemX,
        larguraTexto,
        () => y,
        (ny) => (y = ny),
        () => {
          desenharRodape(doc, W, H);
          doc.addPage();
          desenharCabecalho(doc, livro.titulo, W);
          y = margemTop;
        },
        H - margemBottom,
        { corBold: COR_DOURADO, corNormal: COR_TEXTO },
      );
      y += 3;
    }

    desenharRodape(doc, W, H);
  }

  numerarPaginas(doc, W, H);

  const nomeArquivo = `${slug(livro.titulo)}-cap${String(capitulo.ordem).padStart(2, "0")}-${slug(capitulo.titulo)}.pdf`;
  doc.save(nomeArquivo);
}

function renderizarSegmentos(
  doc: jsPDF,
  segs: { texto: string; bold: boolean }[],
  x: number,
  largura: number,
  getY: () => number,
  setY: (v: number) => void,
  novaPagina: () => void,
  limiteY: number,
  opts: {
    prefixo?: string;
    corPrefixo?: [number, number, number];
    corBold: [number, number, number];
    corNormal: [number, number, number];
  },
): void {
  const lineHeight = 5.6;
  const espacoLargura = doc.getTextWidth(" ");
  let cursorX = x;
  let primeiraLinha = true;

  if (opts.prefixo) {
    doc.setTextColor(...(opts.corPrefixo ?? opts.corBold));
    doc.setFont("helvetica", "bold");
    doc.text(opts.prefixo, x - 4, getY());
  }

  const escreverPalavra = (palavra: string, bold: boolean) => {
    doc.setFont("times", bold ? "bold" : "normal");
    doc.setTextColor(...(bold ? opts.corBold : opts.corNormal));
    const w = doc.getTextWidth(palavra);
    if (cursorX + w > x + largura) {
      // quebra
      setY(getY() + lineHeight);
      if (getY() > limiteY) {
        novaPagina();
      }
      cursorX = x;
      primeiraLinha = false;
    }
    doc.text(palavra, cursorX, getY());
    cursorX += w;
  };

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const palavras = seg.texto.split(/(\s+)/);
    for (const tok of palavras) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) {
        // espaço
        if (cursorX > x) {
          cursorX += espacoLargura;
        }
        continue;
      }
      escreverPalavra(tok, seg.bold);
    }
  }
  setY(getY() + lineHeight);
  void primeiraLinha;
}

function desenharCapa(doc: jsPDF, livro: Livro, totalCaps: number, W: number, H: number) {
  // Fundo bordô
  doc.setFillColor(...COR_BORDO);
  doc.rect(0, 0, W, H, "F");

  // Moldura dourada
  doc.setDrawColor(...COR_DOURADO);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, W - 24, H - 24);
  doc.setLineWidth(0.3);
  doc.rect(15, 15, W - 30, H - 30);

  // Selo decorativo no topo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COR_DOURADO_CLARO);
  doc.text("RESUMO JURÍDICO", W / 2, 38, { align: "center" });

  // Linha dourada
  doc.setDrawColor(...COR_DOURADO);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 18, 42, W / 2 + 18, 42);

  // Título
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(245, 235, 215);
  const tituloLinhas = doc.splitTextToSize(livro.titulo, W - 50);
  let yTit = H / 2 - (tituloLinhas.length * 11) / 2;
  doc.text(tituloLinhas, W / 2, yTit, { align: "center" });
  yTit += tituloLinhas.length * 11 + 6;

  if (livro.autor) {
    doc.setFont("times", "italic");
    doc.setFontSize(13);
    doc.setTextColor(...COR_DOURADO_CLARO);
    doc.text(livro.autor, W / 2, yTit, { align: "center" });
    yTit += 8;
  }

  // Ornamento
  doc.setDrawColor(...COR_DOURADO);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 30, yTit + 6, W / 2 - 6, yTit + 6);
  doc.line(W / 2 + 6, yTit + 6, W / 2 + 30, yTit + 6);
  doc.setFillColor(...COR_DOURADO);
  doc.circle(W / 2, yTit + 6, 1.2, "F");

  // Total de capítulos
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COR_DOURADO_CLARO);
  doc.text(`${totalCaps} ${totalCaps === 1 ? "capítulo" : "capítulos"}`, W / 2, yTit + 18, {
    align: "center",
  });

  // Marca no rodapé da capa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COR_DOURADO);
  doc.text(MARCA.toUpperCase(), W / 2, H - 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COR_DOURADO_CLARO);
  doc.text("Preparação inteligente para a OAB", W / 2, H - 22, { align: "center" });
}

function desenharCabecalho(doc: jsPDF, tituloLivro: string, W: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COR_TEXTO_SUAVE);
  const txt = tituloLivro.length > 70 ? tituloLivro.slice(0, 67) + "…" : tituloLivro;
  doc.text(txt, 22, 14);
  doc.setDrawColor(...COR_DOURADO);
  doc.setLineWidth(0.3);
  doc.line(22, 17, W - 22, 17);
}

function desenharCapaCapitulo(
  doc: jsPDF,
  livro: Livro,
  capitulo: Capitulo,
  totalCaps: number,
  W: number,
  H: number,
) {
  doc.setFillColor(...COR_BORDO);
  doc.rect(0, 0, W, H, "F");

  doc.setDrawColor(...COR_DOURADO);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, W - 24, H - 24);
  doc.setLineWidth(0.3);
  doc.rect(15, 15, W - 30, H - 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COR_DOURADO_CLARO);
  doc.text("RESUMO JURÍDICO", W / 2, 38, { align: "center" });

  doc.setDrawColor(...COR_DOURADO);
  doc.setLineWidth(0.5);
  doc.line(W / 2 - 18, 42, W / 2 + 18, 42);

  // Livro
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(...COR_DOURADO_CLARO);
  const livroLinhas = doc.splitTextToSize(livro.titulo, W - 50);
  doc.text(livroLinhas, W / 2, H / 2 - 40, { align: "center" });

  // Selo capítulo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COR_DOURADO);
  doc.text(
    `CAPÍTULO ${String(capitulo.ordem).padStart(2, "0")} DE ${String(totalCaps).padStart(2, "0")}`,
    W / 2,
    H / 2 - 20,
    { align: "center" },
  );

  // Título capítulo
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(245, 235, 215);
  const tituloLinhas = doc.splitTextToSize(normalizarTitulo(capitulo.titulo), W - 50);
  let yTit = H / 2 - 6;
  doc.text(tituloLinhas, W / 2, yTit, { align: "center" });
  yTit += tituloLinhas.length * 10 + 6;

  doc.setDrawColor(...COR_DOURADO);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 30, yTit + 6, W / 2 - 6, yTit + 6);
  doc.line(W / 2 + 6, yTit + 6, W / 2 + 30, yTit + 6);
  doc.setFillColor(...COR_DOURADO);
  doc.circle(W / 2, yTit + 6, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COR_DOURADO);
  doc.text(MARCA.toUpperCase(), W / 2, H - 28, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COR_DOURADO_CLARO);
  doc.text("Preparação inteligente para a OAB", W / 2, H - 22, { align: "center" });
}

function desenharRodape(doc: jsPDF, W: number, H: number) {
  doc.setDrawColor(...COR_DOURADO);
  doc.setLineWidth(0.3);
  doc.line(22, H - 14, W - 22, H - 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COR_BORDO);
  doc.text(MARCA, 22, H - 9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COR_TEXTO_SUAVE);
  doc.setFontSize(7.5);
  doc.text("Resumo jurídico — uso pessoal de estudo", W / 2, H - 9, { align: "center" });
}

function numerarPaginas(doc: jsPDF, W: number, H: number) {
  const total = doc.getNumberOfPages();
  for (let i = 2; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COR_TEXTO_SUAVE);
    doc.text(`${i - 1} / ${total - 1}`, W - 22, H - 9, { align: "right" });
  }
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
