/**
 * Sincroniza alterações pós-2020 do Código Civil (Lei 10.406/2002) com o Planalto
 * e preenche planalto_url + ult_alteracao_em + alteracoes em vade_mecum_artigos.
 *
 * Uso:  bun run scripts/sync-cc-planalto.ts
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY!;
const PLANALTO_BASE = "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406.htm";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

type Alteracao = {
  tipo: "redacao" | "inclusao" | "revogacao" | "vigencia" | "vide";
  lei: string;
  data: string; // YYYY-MM-DD
  ano: number;
  url: string | null;
  escopo: string;
  texto_original: string;
};

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function pad(n: number) { return n.toString().padStart(2, "0"); }

function normalizeDate(dia?: string, mes?: string, ano?: string): { data: string; ano: number } | null {
  if (!ano) return null;
  const y = parseInt(ano, 10);
  if (!y || y < 1900) return null;
  const m = mes ? MESES[mes.toLowerCase()] ?? 0 : 0;
  const d = dia ? parseInt(dia, 10) : 0;
  if (m && d) return { data: `${y}-${pad(m)}-${pad(d)}`, ano: y };
  if (m) return { data: `${y}-${pad(m)}-01`, ano: y };
  return { data: `${y}-01-01`, ano: y };
}

// regex que captura blocos "(Redação dada pela ... )"
const ALT_RE =
  /\((Redação dada|Incluíd[oa]|Revogad[oa]|Vigência|Vide)\s+(?:pel[oa]\s+)?(Lei(?:\s+Complementar)?|Emenda Constitucional|Medida Provisória|Decreto-Lei)?\s*(n[ºo°\.]?\s*[\d\.]+)?(?:[^)]*?de\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4}))?[^)]*\)/gi;

const ALT_RE_SO_ANO =
  /\((Redação dada|Incluíd[oa]|Revogad[oa])\s+(?:pel[oa]\s+)?(Lei(?:\s+Complementar)?|Emenda Constitucional)\s*(n[ºo°\.]?\s*[\d\.]+)[^)]*?(\d{4})[^)]*\)/gi;

function classifyTipo(raw: string): Alteracao["tipo"] {
  const t = raw.toLowerCase();
  if (t.startsWith("redação")) return "redacao";
  if (t.startsWith("incluí")) return "inclusao";
  if (t.startsWith("revogad")) return "revogacao";
  if (t.startsWith("vigência")) return "vigencia";
  return "vide";
}

function leiSlug(tipo: string | undefined, numero: string | undefined): string {
  const t = (tipo ?? "Lei").replace(/\s+/g, " ").trim();
  const n = (numero ?? "").replace(/n[ºo°\.]?\s*/i, "").trim();
  return `${t} nº ${n}`;
}

// Heurística para URL de uma Lei brasileira no Planalto (best-effort).
function guessPlanaltoLeiUrl(tipo: string | undefined, numero: string | undefined, ano: number): string | null {
  if (!numero) return null;
  const num = numero.replace(/\D/g, "");
  if (!num) return null;
  const t = (tipo ?? "Lei").toLowerCase();
  const bloco =
    ano >= 2023 ? "_ato2023-2026" :
    ano >= 2019 ? "_ato2019-2022" :
    ano >= 2015 ? "_ato2015-2018" :
    ano >= 2011 ? "_ato2011-2014" :
    ano >= 2007 ? "_ato2007-2010" :
    ano >= 2004 ? "_ato2004-2006" : null;
  if (!bloco) return null;
  if (t.includes("complementar")) {
    return `https://www.planalto.gov.br/ccivil_03/${bloco}/${ano}/lcp/lcp${num}.htm`;
  }
  if (t.includes("emenda")) {
    return `https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc${num}.htm`;
  }
  return `https://www.planalto.gov.br/ccivil_03/${bloco}/${ano}/lei/L${num}.htm`;
}

type Bloco = { anchor: string; numero: string; texto: string };

function extractBlocos(html: string): Bloco[] {
  // remove tags <script>/<style>
  const limpo = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");

  // Encontrar todas as âncoras de artigo (name="art1", "art1A", "art2", ...)
  const anchorRe = /<a\s+(?:[^>]*\s)?name=["']?(art\d+[A-Z]?)["']?[^>]*>/gi;
  const matches: { anchor: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(limpo)) !== null) {
    matches.push({ anchor: m[1].toLowerCase(), index: m.index });
  }

  const blocos: Bloco[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : limpo.length;
    const chunk = limpo.slice(start, end);
    // texto sem tags
    const texto = chunk
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&ordm;|&deg;/gi, "º")
      .replace(/&ordf;/gi, "ª")
      .replace(/&aacute;/gi, "á").replace(/&eacute;/gi, "é").replace(/&iacute;/gi, "í")
      .replace(/&oacute;/gi, "ó").replace(/&uacute;/gi, "ú").replace(/&atilde;/gi, "ã")
      .replace(/&otilde;/gi, "õ").replace(/&ccedil;/gi, "ç").replace(/&ecirc;/gi, "ê")
      .replace(/&acirc;/gi, "â").replace(/&ocirc;/gi, "ô").replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();

    // número do artigo a partir da âncora: art1 -> "1º", art1A -> "1º-A", art1245 -> "1.245"
    const anchor = matches[i].anchor;
    const mm = anchor.match(/^art(\d+)([A-Z])?$/);
    if (!mm) continue;
    const n = parseInt(mm[1], 10);
    const sufixo = mm[2] ? `-${mm[2]}` : "";
    const numero = n <= 9 ? `${n}º${sufixo}` : `${n}${sufixo}`;
    blocos.push({ anchor, numero, texto });
  }
  return blocos;
}

function parseAlteracoes(texto: string): Alteracao[] {
  const out: Alteracao[] = [];
  const seen = new Set<string>();

  const pushIfNew = (a: Alteracao) => {
    const key = `${a.tipo}|${a.lei}|${a.data}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(a);
  };

  // 1ª passada: com data completa
  let m: RegExpExecArray | null;
  while ((m = ALT_RE.exec(texto)) !== null) {
    const tipo = classifyTipo(m[1]);
    if (tipo === "vide" || tipo === "vigencia") continue; // só registramos efeito real
    const norm = normalizeDate(m[4], m[5], m[6]);
    if (!norm) continue;
    if (norm.ano < 2020) continue;
    const lei = leiSlug(m[2], m[3]);
    pushIfNew({
      tipo, lei, data: norm.data, ano: norm.ano,
      url: guessPlanaltoLeiUrl(m[2], m[3], norm.ano),
      escopo: "caput",
      texto_original: m[0],
    });
  }

  // 2ª passada: só ano (fallback p/ casos sem dia/mês)
  ALT_RE_SO_ANO.lastIndex = 0;
  while ((m = ALT_RE_SO_ANO.exec(texto)) !== null) {
    const tipo = classifyTipo(m[1]);
    const ano = parseInt(m[4], 10);
    if (!ano || ano < 2020) continue;
    const lei = leiSlug(m[2], m[3]);
    const data = `${ano}-01-01`;
    pushIfNew({
      tipo, lei, data, ano,
      url: guessPlanaltoLeiUrl(m[2], m[3], ano),
      escopo: "caput",
      texto_original: m[0],
    });
  }

  out.sort((a, b) => b.data.localeCompare(a.data));
  return out;
}

async function main() {
  console.log("→ Baixando texto compilado do CC no Planalto...");
  const res = await fetch(PLANALTO_BASE, {
    headers: { "User-Agent": "Mozilla/5.0 (vade-mecum-sync)" },
  });
  if (!res.ok) {
    console.error("Falha ao baixar Planalto:", res.status);
    process.exit(1);
  }
  const html = await res.text();
  console.log(`  HTML: ${(html.length / 1024).toFixed(1)} KB`);

  const blocos = extractBlocos(html);
  console.log(`  Encontrados ${blocos.length} blocos de artigo no Planalto.`);

  // Index by número for lookup
  const byNumero = new Map<string, Bloco>();
  for (const b of blocos) byNumero.set(b.numero, b);

  console.log("→ Buscando artigos do CC no Supabase...");
  const { data: lei, error: leiErr } = await supabase
    .from("vade_mecum_leis").select("id").eq("slug", "cc").single();
  if (leiErr || !lei) {
    console.error("Lei CC não encontrada:", leiErr); process.exit(1);
  }

  const { data: artigos, error: artErr } = await supabase
    .from("vade_mecum_artigos")
    .select("id, numero")
    .eq("lei_id", lei.id)
    .order("ordem");
  if (artErr || !artigos) {
    console.error(artErr); process.exit(1);
  }
  console.log(`  ${artigos.length} artigos no banco.`);

  let comLink = 0, semLink = 0, comAlteracoes = 0;
  const leisCounter = new Map<string, number>();
  const updates: { id: string; planalto_url: string | null; alteracoes: Alteracao[]; ult_alteracao_em: string | null; revogado: boolean }[] = [];

  for (const a of artigos) {
    // Normalizar número do banco para casar com a âncora.
    // ex: "1º" -> art1, "1.245" -> art1245, "1º-A" -> art1A
    const num = a.numero.trim();
    const mm = num.match(/^(\d+(?:\.\d+)*)º?(?:-([A-Z]))?$/);
    let anchor: string | null = null;
    if (mm) {
      const digits = mm[1].replace(/\./g, "");
      const sufx = mm[2] ?? "";
      anchor = `art${digits}${sufx}`;
    }
    const url = anchor ? `${PLANALTO_BASE}#${anchor}` : null;
    if (url) comLink++; else semLink++;

    const bloco = anchor ? byNumero.get(num) ?? blocos.find(b => b.anchor === anchor) : undefined;
    const alteracoes = bloco ? parseAlteracoes(bloco.texto) : [];
    const ult = alteracoes.length > 0 ? alteracoes[0].data : null;
    const revogado = alteracoes.some(x => x.tipo === "revogacao");
    if (alteracoes.length > 0) {
      comAlteracoes++;
      for (const al of alteracoes) {
        leisCounter.set(al.lei, (leisCounter.get(al.lei) ?? 0) + 1);
      }
    }
    updates.push({ id: a.id, planalto_url: url, alteracoes, ult_alteracao_em: ult, revogado });
  }

  console.log(`→ Aplicando updates (${updates.length})... isso pode demorar ~1min`);
  const CHUNK = 50;
  let done = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    await Promise.all(slice.map(async (u) => {
      const { error } = await supabase
        .from("vade_mecum_artigos")
        .update({
          planalto_url: u.planalto_url,
          alteracoes: u.alteracoes,
          ult_alteracao_em: u.ult_alteracao_em,
          revogado: u.revogado,
        })
        .eq("id", u.id);
      if (error) console.error("update err", u.id, error.message);
    }));
    done += slice.length;
    if (done % 500 === 0 || done === updates.length) {
      console.log(`  ${done}/${updates.length}`);
    }
  }

  console.log("\n=== RELATÓRIO ===");
  console.log(`Artigos com link Planalto: ${comLink}`);
  console.log(`Artigos sem link (falha de match): ${semLink}`);
  console.log(`Artigos com alteração desde 2020: ${comAlteracoes}`);
  console.log(`Leis alteradoras detectadas (pós-2020):`);
  const sorted = [...leisCounter.entries()].sort((a, b) => b[1] - a[1]);
  for (const [lei, n] of sorted) console.log(`  • ${lei} — ${n} artigos`);
}

main().catch(e => { console.error(e); process.exit(1); });
