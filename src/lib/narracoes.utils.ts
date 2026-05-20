// Utilitários puros pra transformar o texto de um artigo em texto narrável
// pelo Gemini TTS. Sem dependências de servidor.

const UNIDADES = [
  "", "primeiro", "segundo", "terceiro", "quarto", "quinto",
  "sexto", "sétimo", "oitavo", "nono",
];
const DEZENAS_10_19 = [
  "décimo", "décimo primeiro", "décimo segundo", "décimo terceiro",
  "décimo quarto", "décimo quinto", "décimo sexto", "décimo sétimo",
  "décimo oitavo", "décimo nono",
];
const DEZENAS = [
  "", "", "vigésimo", "trigésimo", "quadragésimo", "quinquagésimo",
  "sexagésimo", "septuagésimo", "octogésimo", "nonagésimo",
];
const CENTENAS = [
  "", "centésimo", "ducentésimo", "trecentésimo", "quadringentésimo",
  "quingentésimo", "sexcentésimo", "septingentésimo", "octingentésimo",
  "noningentésimo",
];

/** Converte um inteiro 1..999 em ordinal masculino por extenso. */
export function ordinalPorExtenso(n: number): string {
  if (!Number.isFinite(n) || n <= 0 || n > 999) return String(n);
  if (n < 10) return UNIDADES[n];
  if (n < 20) return DEZENAS_10_19[n - 10];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? DEZENAS[d] : `${DEZENAS[d]} ${UNIDADES[u]}`;
  }
  const c = Math.floor(n / 100);
  const resto = n % 100;
  return resto === 0
    ? CENTENAS[c]
    : `${CENTENAS[c]} ${ordinalPorExtenso(resto)}`;
}

/** Converte "1", "1-A", "1º", "1.º" em ordinal narrável ("primeiro", "primeiro-A"). */
export function artigoNumeroPorExtenso(numero: string): string {
  const m = numero.trim().match(/^(\d{1,3})(?:[ºo°.]+)?(.*)$/i);
  if (!m) return numero;
  const base = ordinalPorExtenso(parseInt(m[1], 10));
  const sufixo = (m[2] || "").trim().replace(/^[-\s]+/, "");
  return sufixo ? `${base}-${sufixo.toUpperCase()}` : base;
}

const ROMANOS: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
};
function romanoParaInt(s: string): number | null {
  if (!/^[IVXLCDM]+$/i.test(s)) return null;
  const up = s.toUpperCase();
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const v = ROMANOS[up[i]];
    const next = ROMANOS[up[i + 1]];
    if (next && v < next) total -= v;
    else total += v;
  }
  return total > 0 ? total : null;
}

/** Remove qualquer trecho entre parênteses (incl. simples aninhados). */
export function removerParenteses(texto: string): string {
  let prev = texto;
  for (let i = 0; i < 10; i++) {
    const next = prev.replace(/\([^()]*\)/g, " ");
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

/** Normaliza marcadores jurídicos inline pra texto falado. */
export function normalizarMarcadores(texto: string): string {
  let t = texto;

  // § único / § N
  t = t.replace(/§\s*único/gi, "Parágrafo único");
  t = t.replace(/§\s*(\d{1,3})[ºo°.]*/g, (_m, n) =>
    `Parágrafo ${ordinalPorExtenso(parseInt(n, 10))}`,
  );

  // Art. N / Artigo N (inline)
  t = t.replace(/\b[Aa]rt(?:igo)?\.?\s*(\d{1,3})[ºo°.]*([A-Z]?)/g, (_m, n, suf) => {
    const ext = ordinalPorExtenso(parseInt(n, 10));
    return suf ? `Artigo ${ext}-${suf}` : `Artigo ${ext}`;
  });

  // Incisos no início de linha/segmento: " I -", " II –", etc.
  t = t.replace(
    /(^|[\n;.])\s*([IVXLCDM]{1,6})\s*[-–—]\s*/g,
    (_m, pre, rom) => {
      const n = romanoParaInt(rom);
      return n ? `${pre} Inciso ${ordinalPorExtenso(n)}: ` : `${pre} ${rom} `;
    },
  );

  // Alíneas no início de segmento: " a)", " b)"
  t = t.replace(
    /(^|[\n;.])\s*([a-z])\)\s*/g,
    (_m, pre, letra) => `${pre} Alínea ${letra}: `,
  );

  return t;
}

/** Colapsa whitespace e ajusta pontuação. */
export function limparEspacos(texto: string): string {
  return texto
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .trim();
}

export type MontarTextoInput = {
  leiTitulo: string;
  artigoNumero: string;
  artigoTexto: string;
};

export const MAX_TTS_CHARS = 40000;

/**
 * Alvo de caracteres por chunk de TTS (~1 min de áudio em pt-BR a ~15 chars/s).
 * Mantém entre 1:00 e 1:10 quebrando em fronteiras naturais (. ; : , espaço).
 */
export const TTS_CHUNK_TARGET_CHARS = 900;
export const TTS_CHUNK_MAX_CHARS = 1050;

/** Divide texto longo em chunks ~1min, preferindo fronteiras de sentença/pontuação. */
export function dividirTextoEmChunks(
  texto: string,
  target = TTS_CHUNK_TARGET_CHARS,
  max = TTS_CHUNK_MAX_CHARS,
): string[] {
  const t = texto.trim();
  if (t.length <= max) return [t];

  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    const restante = t.length - i;
    if (restante <= max) {
      chunks.push(t.slice(i).trim());
      break;
    }
    // Janela de busca: do alvo até o máximo
    const inicio = i + Math.floor(target * 0.7);
    const fim = Math.min(i + max, t.length);
    const janela = t.slice(inicio, fim);

    // Tenta achar pontuação forte, depois fraca, depois espaço.
    const candidatos = [
      janela.lastIndexOf(". "),
      janela.lastIndexOf("; "),
      janela.lastIndexOf(": "),
      janela.lastIndexOf(", "),
      janela.lastIndexOf(" "),
    ];
    let corte = -1;
    for (const c of candidatos) {
      if (c >= 0) { corte = c; break; }
    }
    const cortePos = corte >= 0 ? inicio + corte + 1 : fim;
    chunks.push(t.slice(i, cortePos).trim());
    i = cortePos;
  }
  return chunks.filter((c) => c.length > 0);
}

/** Remove o marcador inicial "Art. N" / "Artigo N" do texto pra não duplicar com o prefixo. */
export function removerArtigoInicial(texto: string): string {
  return texto.replace(
    /^\s*[Aa]rt(?:igo)?\.?\s*\d{1,3}[ºo°.]*(?:[-\s]*[A-Z])?\s*[.\-–—:]?\s*/,
    "",
  );
}

/**
 * Remove o prefixo abreviado dos nomes de leis pra TTS não falar a sigla.
 * Ex.: "CF - Constituição Federal" → "Constituição Federal".
 *      "CTB Código de Trânsito Brasileiro" → "Código de Trânsito Brasileiro".
 *      "LC 75 - MINISTERIO PUBLICO UNIAO" → "MINISTERIO PUBLICO UNIAO".
 *      "ESTATUTO - ECA" → "ESTATUTO - ECA" (mantém, restante é curto).
 */
export function limparTituloLei(nome: string): string {
  const t = (nome || "").trim();
  const m = t.match(/^([A-Z]{1,6}(?:\s*\d+)?)\s*[-–—]?\s+(.+)$/);
  if (m && m[2].trim().length >= 6) return m[2].trim();
  return t;
}

/** Pipeline final: prefixo + transformações + limpeza. */
export function montarTextoNarracao({
  leiTitulo,
  artigoNumero,
  artigoTexto,
}: MontarTextoInput): string {
  const prefixo = `${leiTitulo.trim()}, artigo ${artigoNumeroPorExtenso(artigoNumero)}.`;
  const semParen = removerParenteses(artigoTexto || "");
  const semArtIni = removerArtigoInicial(semParen);
  const normalizado = normalizarMarcadores(semArtIni);
  const limpo = limparEspacos(normalizado);
  return limparEspacos(`${prefixo} ${limpo}`);
}
