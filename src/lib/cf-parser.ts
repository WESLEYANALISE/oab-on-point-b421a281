// Parser de marcadores de alteração da Constituição (Planalto).
// Lê HTML/texto e extrai, por artigo: { numero, alteracoes[], ult_alteracao_em, revogado }.
//
// Os marcadores que importam vêm em parênteses logo abaixo do dispositivo:
//   (Redação dada pela Emenda Constitucional nº 132, de 2023)
//   (Incluído pela Emenda Constitucional nº 19, de 1998)
//   (Acrescentado pela Lei ... de ...)
//   (Revogado pela Emenda Constitucional nº 45, de 2004)
//
// "(Vide ...)" e "(Regulamento)" são ignorados — não são alteração de texto.

export type TipoAlteracao = "redacao" | "inclusao" | "revogacao";

export interface Alteracao {
  tipo: TipoAlteracao;
  norma: string;      // ex.: "EC 132/2023", "Lei 11.000/2004"
  data: string | null; // YYYY-MM-DD ou só YYYY-01-01 se só o ano for conhecido
  raw: string;        // texto original capturado
}

export interface ArtigoParsed {
  numero: string;             // "1", "5", "5-A", "100"
  parte: "principal" | "adct";
  texto: string;              // texto do bloco (até o próximo artigo)
  alteracoes: Alteracao[];
  ult_alteracao_em: string | null;
  revogado: boolean;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ordm;|&deg;/gi, "º")
    .replace(/&ordf;/gi, "ª")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n\n");
}

function parseNorma(raw: string): string {
  const ec = raw.match(/Emenda\s+Constitucional(?:\s+de\s+Revis[ãa]o)?\s*n[ºo°.]*\s*(\d+)(?:[\/,\s]*de\s*(\d{4}))?/i);
  if (ec) return `EC ${ec[1]}${ec[2] ? `/${ec[2]}` : ""}`;
  const lei = raw.match(/Lei(?:\s+Complementar)?\s*n[ºo°.]*\s*([\d.]+)(?:[\/,\s]*de\s*(\d{4}))?/i);
  if (lei) return `Lei ${lei[1]}${lei[2] ? `/${lei[2]}` : ""}`;
  const dec = raw.match(/Decreto[^,]{0,40}n[ºo°.]*\s*([\d.]+)(?:[\/,\s]*de\s*(\d{4}))?/i);
  if (dec) return `Decreto ${dec[1]}${dec[2] ? `/${dec[2]}` : ""}`;
  return raw.replace(/\s+/g, " ").trim().slice(0, 120);
}

function parseData(raw: string): string | null {
  const meses: Record<string, string> = {
    janeiro: "01", fevereiro: "02", "março": "03", marco: "03", abril: "04",
    maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
    outubro: "10", novembro: "11", dezembro: "12",
  };
  // "de 20 de dezembro de 2023"
  const full = raw.match(/de\s+(\d{1,2})\s+de\s+([a-zç]+)\s+de\s+(\d{4})/i);
  if (full) {
    const mes = meses[full[2].toLowerCase()];
    if (mes) return `${full[3]}-${mes}-${full[1].padStart(2, "0")}`;
  }
  // só ano: "de 2023"
  const ano = raw.match(/de\s+(\d{4})/);
  if (ano) return `${ano[1]}-01-01`;
  return null;
}

function classify(raw: string): TipoAlteracao | null {
  if (/revogad[oa]/i.test(raw)) return "revogacao";
  if (/(reda[cç][aã]o\s+dada|nova\s+reda[cç][aã]o)/i.test(raw)) return "redacao";
  if (/(inclu[ií]d[oa]|acrescentad[oa])/i.test(raw)) return "inclusao";
  return null;
}

// Captura "(...)" multi-linha
const PAREN_RE = /\(([^()]{5,400})\)/g;
// "Art. 5º", "Art. 5", "Art. 5º-A"
const ART_RE = /Art\.\s*(\d+)\s*[ºo°.]?\s*(-?[A-Z])?/gi;
const ADCT_MARKER = /ATO\s+DAS\s+DISPOSI[CÇ][OÕ]ES\s+CONSTITUCIONAIS\s+TRANSIT[OÓ]RIAS/i;

export function parseCF(rawHtml: string): ArtigoParsed[] {
  const text = htmlToText(rawHtml);
  const splitIdx = text.search(ADCT_MARKER);
  const principal = splitIdx > 0 ? text.slice(0, splitIdx) : text;
  const adct = splitIdx > 0 ? text.slice(splitIdx) : "";

  function extractBlocks(body: string, parte: "principal" | "adct"): ArtigoParsed[] {
    const matches: { numero: string; start: number; end: number }[] = [];
    const re = new RegExp(ART_RE.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      const numero = `${m[1]}${m[2] ? m[2].toUpperCase().replace(/^([A-Z])/, "-$1").replace("--", "-") : ""}`;
      matches.push({ numero, start: m.index, end: m.index + m[0].length });
    }
    // Dedupe by numero — primeiro match é o cabeçalho oficial; outras ocorrências são cross-refs.
    const seen = new Map<string, { numero: string; start: number; end: number }>();
    for (const x of matches) if (!seen.has(x.numero)) seen.set(x.numero, x);
    const ordered = [...seen.values()].sort((a, b) => a.start - b.start);

    const out: ArtigoParsed[] = [];
    for (let i = 0; i < ordered.length; i++) {
      const cur = ordered[i];
      const next = ordered[i + 1];
      const blockEnd = next ? next.start : body.length;
      const block = body.slice(cur.start, blockEnd);

      const alteracoes: Alteracao[] = [];
      let pm: RegExpExecArray | null;
      const preg = new RegExp(PAREN_RE.source, "g");
      while ((pm = preg.exec(block))) {
        const inner = pm[1];
        const tipo = classify(inner);
        if (!tipo) continue;
        alteracoes.push({
          tipo,
          norma: parseNorma(inner),
          data: parseData(inner),
          raw: inner.replace(/\s+/g, " ").trim(),
        });
      }
      const datas = alteracoes.map((a) => a.data).filter((d): d is string => !!d).sort();
      const ult = datas.length ? datas[datas.length - 1] : null;
      const revogado = alteracoes.length > 0 && alteracoes[alteracoes.length - 1].tipo === "revogacao";

      out.push({
        numero: cur.numero,
        parte,
        texto: block.replace(/\s+/g, " ").trim().slice(0, 8000),
        alteracoes,
        ult_alteracao_em: ult,
        revogado,
      });
    }
    return out;
  }

  return [...extractBlocks(principal, "principal"), ...extractBlocks(adct, "adct")];
}
