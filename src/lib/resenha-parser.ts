// Parser puro da página "Resenha Diária" do Planalto.
// Recebe o HTML do mês e devolve a lista de dias com seus atos.

// SHA-1 puro em JS — evita import de "crypto" (Node) no bundle do cliente.
function sha1Hex(input: string): string {
  const msg: number[] = [];
  for (let i = 0; i < input.length; i++) {
    let c = input.charCodeAt(i);
    if (c < 0x80) msg.push(c);
    else if (c < 0x800) { msg.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
    else if (c < 0xd800 || c >= 0xe000) { msg.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
    else {
      i++;
      const c2 = 0x10000 + (((c & 0x3ff) << 10) | (input.charCodeAt(i) & 0x3ff));
      msg.push(0xf0 | (c2 >> 18), 0x80 | ((c2 >> 12) & 0x3f), 0x80 | ((c2 >> 6) & 0x3f), 0x80 | (c2 & 0x3f));
    }
  }
  const ml = msg.length * 8;
  msg.push(0x80);
  while ((msg.length % 64) !== 56) msg.push(0);
  for (let i = 7; i >= 0; i--) msg.push((ml >>> (i * 8)) & 0xff);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);
  for (let i = 0; i < msg.length; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = (msg[i + j * 4] << 24) | (msg[i + j * 4 + 1] << 16) | (msg[i + j * 4 + 2] << 8) | msg[i + j * 4 + 3];
    }
    for (let j = 16; j < 80; j++) {
      const x = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (x << 1) | (x >>> 31);
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) { f = (b & c) | ((~b) & d); k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d; d = c; c = ((b << 30) | (b >>> 2)) | 0; b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  const toHex = (n: number) => ("00000000" + (n >>> 0).toString(16)).slice(-8);
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

const MESES_PT: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, "março": 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

export type TipoAto =
  | "lei_complementar"
  | "lei"
  | "emenda_constitucional"
  | "medida_provisoria"
  | "decreto_lei"
  | "decreto"
  | "mensagem_veto"
  | "outro";

export type AtoParsed = {
  tipo: TipoAto;
  numero: string;
  data_assinatura: string | null; // YYYY-MM-DD
  ementa: string;
  url: string;
  hash: string;
};

export type DiaParsed = {
  data_dou: string; // YYYY-MM-DD
  edicao_extra: boolean;
  atos: AtoParsed[];
};

function slugMes(s: string): number | null {
  const n = MESES_PT[s.trim().toLowerCase()];
  return n ?? null;
}

function pad(n: number) { return n.toString().padStart(2, "0"); }

function parseDataExtenso(s: string): string | null {
  // "20 de maio de 2026"
  const m = s.match(/(\d{1,2})\s+de\s+([A-Za-zçÇãÃéÉ]+)\s+de\s+(\d{4})/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = slugMes(m[2]);
  const ano = Number(m[3]);
  if (!mes) return null;
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

function parseDataCurta(s: string): string | null {
  // "14.5.2026" ou "14.05.2026"
  const m = s.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
}

function classificarTipo(label: string): TipoAto {
  const l = label.toLowerCase();
  if (l.includes("emenda constitucional")) return "emenda_constitucional";
  if (l.includes("lei complementar")) return "lei_complementar";
  if (l.includes("medida provisória") || l.includes("medida provisoria")) return "medida_provisoria";
  if (l.includes("decreto-lei")) return "decreto_lei";
  if (l.includes("decreto")) return "decreto";
  if (l.includes("mensagem de veto") || l.includes("mensagem")) return "mensagem_veto";
  if (l.startsWith("lei")) return "lei";
  return "outro";
}

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashAto(tipo: string, numero: string, data: string | null): string {
  return createHash("sha1").update(`${tipo}|${numero}|${data ?? ""}`).digest("hex");
}

/**
 * Quebra o HTML em linhas da tabela "Data | Atos Publicados".
 * O Planalto usa <tr><td>data</td><td>atos…</td></tr>. Como o HTML é
 * inconsistente, fazemos regex tolerante por linha.
 */
export function parseResenhaMes(html: string): DiaParsed[] {
  const out: DiaParsed[] = [];

  // Captura cada <tr>…</tr>
  const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = trRegex.exec(html)) !== null) {
    const tr = m[1];
    const tds = [...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((x) => x[1]);
    if (tds.length < 2) continue;

    const cabec = stripTags(tds[0]);
    const data_dou = parseDataExtenso(cabec);
    if (!data_dou) continue; // pula header "Data de Publicação no D.O.U."
    const edicao_extra = /edi[çc][aã]o\s+extra/i.test(cabec);

    const corpo = tds.slice(1).join(" ");
    const atos = extrairAtos(corpo);
    if (atos.length === 0) continue;
    out.push({ data_dou, edicao_extra, atos });
  }
  return out;
}

function extrairAtos(corpoHtml: string): AtoParsed[] {
  const atos: AtoParsed[] = [];
  // Quebra por <br> para tratar cada ato em separado
  const pedacos = corpoHtml.split(/<br\s*\/?>/i);

  for (const pedacoRaw of pedacos) {
    // Cada pedaço típico: <a href="URL">LABEL</a> - EMENTA
    const linkMatch = pedacoRaw.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;
    const url = linkMatch[1].trim();
    const label = stripTags(linkMatch[2]);

    // Texto após o link = ementa (pode começar com " - " ou " – ")
    const afterLink = pedacoRaw.slice(linkMatch.index! + linkMatch[0].length);
    const ementa = stripTags(afterLink).replace(/^[\s\-–—]+/, "").trim();

    // Extrai tipo / número / data do label
    // Ex.: "Lei nº 15.408, de 14.5.2026"
    //      "Emenda Constitucional nº 139, de 5.5.2026"
    //      "Mensagem de Veto Total nº 423, de 19.5.2026"
    const labelMatch = label.match(
      /^([A-Za-zÀ-ú\.\-\s]+?)\s*n[ºo°]?\s*([\d\.\-A-Za-z\/]+),?\s*de\s*([\d\.\/]+)/i,
    );
    if (!labelMatch) continue;
    const tipo = classificarTipo(labelMatch[1]);
    const numero = labelMatch[2].trim();
    const data_assinatura = parseDataCurta(labelMatch[3]);

    atos.push({
      tipo,
      numero,
      data_assinatura,
      ementa: ementa.slice(0, 4000),
      url,
      hash: hashAto(tipo, numero, data_assinatura),
    });
  }
  return atos;
}

export const MESES_SLUG = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function mesSlugFromNumber(mes: number): string {
  return MESES_SLUG[mes - 1] ?? "janeiro";
}

export function mesRefFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}
