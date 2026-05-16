import { createServerFn } from "@tanstack/react-start";

const OAB_BASE = "https://examedeordem.oab.org.br";

type Arquivo = { titulo: string; url: string; data?: string };

type ProvaSegundaFase = {
  area: string;
  prova_url?: string;
  espelho_url?: string;
};

type ExameRow = {
  numero: number;
  titulo: string;
  ano: number | null;
  oab_exame_id: string;
  oab_source_url: string;
  edital_url: string | null;
  prova_1fase_url: string | null;
  gabarito_1fase_url: string | null;
  provas_2fase: ProvaSegundaFase[];
  outros_arquivos: Arquivo[];
};

const ROMAN: Record<string, number> = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
};
function romanToInt(s: string): number | null {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]];
    if (!v) return null;
    const next = ROMAN[s[i + 1]];
    if (next && next > v) total -= v;
    else total += v;
  }
  return total || null;
}

function parseNumero(titulo: string): number {
  // "46º EXAME ..." | "XXXVIII EXAME ..." | "EXAME ... 2010.2"
  const arabic = titulo.match(/^(\d+)º/);
  if (arabic) return parseInt(arabic[1], 10);
  const roman = titulo.match(/^([IVXLCDM]+)\s/i);
  if (roman) {
    const n = romanToInt(roman[1].toUpperCase());
    if (n) return n;
  }
  if (/2010\.3/.test(titulo)) return 3;
  if (/2010\.2/.test(titulo)) return 2;
  return 0;
}

function parseTitle(html: string, fallback: string): string {
  return fallback.trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function absolutizeUrl(href: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("//")) return "https:" + href;
  if (href.startsWith("/")) return OAB_BASE + href;
  return OAB_BASE + "/" + href;
}

/** Extrai lista de exames do dropdown da página inicial. */
async function listarExames(): Promise<Array<{ id: string; titulo: string }>> {
  const res = await fetch(`${OAB_BASE}/EditaisProvas?NumeroExame=0`);
  const html = await res.text();
  const select = html.match(/<select[^>]*id="cmb-edital"[\s\S]*?<\/select>/);
  if (!select) return [];
  const out: Array<{ id: string; titulo: string }> = [];
  const optRe = /<option\s+value="(\d+)"\s*>([^<]+)<\/option>/g;
  let m: RegExpExecArray | null;
  while ((m = optRe.exec(select[0]))) {
    const id = m[1];
    const titulo = decodeEntities(m[2]).trim();
    if (id === "0") continue;
    out.push({ id, titulo });
  }
  return out;
}

/** Busca os arquivos (links) de um exame específico. */
async function listarArquivos(exameId: string): Promise<Arquivo[]> {
  const res = await fetch(`${OAB_BASE}/EditaisProvas?NumeroExame=${exameId}`);
  const html = await res.text();
  // Lista de "Arquivos" — anchors com href para PDFs/links de download
  const arquivos: Arquivo[] = [];
  const anchorRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    const text = stripTags(m[2]);
    if (!text || text.length < 4) continue;
    // Apenas links que parecem ser arquivos da OAB (PDFs ou /arquivos/)
    if (
      /\.pdf(\?|$)/i.test(href) ||
      /\/arquivos\//i.test(href) ||
      /DownloadArquivo/i.test(href)
    ) {
      const dataMatch = text.match(/^(\d{2}\/\d{2}\/\d{4})\s*-\s*/);
      arquivos.push({
        titulo: text,
        url: absolutizeUrl(href),
        data: dataMatch?.[1],
      });
    }
  }
  // dedupe por URL
  const seen = new Set<string>();
  return arquivos.filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

const AREAS_2FASE = [
  "Direito Administrativo",
  "Direito Civil",
  "Direito Constitucional",
  "Direito do Trabalho",
  "Direito Empresarial",
  "Direito Penal",
  "Direito Tributário",
];

function classificar(arquivos: Arquivo[]): {
  edital: string | null;
  prova1: string | null;
  gabarito1: string | null;
  provas2: ProvaSegundaFase[];
  outros: Arquivo[];
} {
  let edital: string | null = null;
  let prova1: string | null = null;
  let gabarito1: string | null = null;
  const provas2Map = new Map<string, ProvaSegundaFase>();
  const outros: Arquivo[] = [];

  for (const a of arquivos) {
    const t = a.titulo.toLowerCase();

    // 1ª fase
    if (!prova1 && /prova\b.*1[ªa]\s*fase|prova\s*objetiva/.test(t)) {
      prova1 = a.url;
      continue;
    }
    if (!gabarito1 && /gabarito\s*(definitivo|preliminar)?.*1[ªa]\s*fase|gabarito\s*(definitivo|preliminar)?.*objetiv/.test(t)) {
      gabarito1 = a.url;
      continue;
    }
    if (!gabarito1 && /^gabarito/.test(t) && !/2[ªa]\s*fase/.test(t)) {
      gabarito1 = a.url;
      continue;
    }
    if (!prova1 && /^prova\b/.test(t) && !/2[ªa]\s*fase/.test(t)) {
      prova1 = a.url;
      continue;
    }

    // Edital
    if (!edital && /\bedital\b/.test(t) && !/retifica/.test(t)) {
      edital = a.url;
      continue;
    }

    // 2ª fase por área
    let matchedArea: string | null = null;
    for (const area of AREAS_2FASE) {
      const areaShort = area.replace(/^Direito\s+/i, "").toLowerCase();
      if (t.includes(areaShort)) {
        matchedArea = area;
        break;
      }
    }
    if (matchedArea && /2[ªa]\s*fase|prático|pratico|espelho/.test(t)) {
      const cur = provas2Map.get(matchedArea) ?? { area: matchedArea };
      if (/espelho|padrão de resposta|padrao de resposta|gabarito/.test(t)) {
        cur.espelho_url = cur.espelho_url ?? a.url;
      } else if (/prova/.test(t)) {
        cur.prova_url = cur.prova_url ?? a.url;
      }
      provas2Map.set(matchedArea, cur);
      continue;
    }

    outros.push(a);
  }

  return {
    edital,
    prova1,
    gabarito1,
    provas2: Array.from(provas2Map.values()),
    outros,
  };
}

/**
 * Seed do catálogo de provas da OAB. Rode manualmente uma vez (e quando
 * a OAB liberar um novo exame).
 *
 * Protegido por um token simples definido na env SEED_PROVAS_TOKEN.
 */
export const seedProvasOab = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; dryRun?: boolean }) => input)
  .handler(async ({ data }) => {
    const expectedToken = process.env.SEED_PROVAS_TOKEN;
    if (!expectedToken || data.token !== expectedToken) {
      throw new Error("Token inválido. Defina SEED_PROVAS_TOKEN e use-o.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const exames = await listarExames();
    if (exames.length === 0) {
      throw new Error("Não consegui listar os exames no site da OAB.");
    }

    const rows: ExameRow[] = [];
    const erros: Array<{ titulo: string; erro: string }> = [];

    for (const ex of exames) {
      try {
        const arquivos = await listarArquivos(ex.id);
        const c = classificar(arquivos);
        const numero = parseNumero(ex.titulo);
        const anoMatch = ex.titulo.match(/20\d{2}/);
        rows.push({
          numero,
          titulo: ex.titulo,
          ano: anoMatch ? parseInt(anoMatch[0], 10) : null,
          oab_exame_id: ex.id,
          oab_source_url: `${OAB_BASE}/EditaisProvas?NumeroExame=${ex.id}`,
          edital_url: c.edital,
          prova_1fase_url: c.prova1,
          gabarito_1fase_url: c.gabarito1,
          provas_2fase: c.provas2,
          outros_arquivos: c.outros.slice(0, 30),
        });
        // Pequeno delay para não martelar o site
        await new Promise((r) => setTimeout(r, 120));
      } catch (e) {
        erros.push({ titulo: ex.titulo, erro: (e as Error).message });
      }
    }

    if (!data.dryRun) {
      const { error } = await supabaseAdmin
        .from("provas_oab")
        .upsert(rows, { onConflict: "numero" });
      if (error) {
        throw new Error("Falha ao salvar: " + error.message);
      }
    }

    return {
      total_exames: exames.length,
      total_salvos: rows.length,
      com_prova_1fase: rows.filter((r) => r.prova_1fase_url).length,
      com_gabarito_1fase: rows.filter((r) => r.gabarito_1fase_url).length,
      com_edital: rows.filter((r) => r.edital_url).length,
      com_2fase: rows.filter((r) => r.provas_2fase.length > 0).length,
      erros,
      dryRun: !!data.dryRun,
    };
  });
