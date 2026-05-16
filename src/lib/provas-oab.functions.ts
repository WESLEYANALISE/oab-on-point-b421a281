import { createServerFn } from "@tanstack/react-start";

const OAB_BASE = "https://examedeordem.oab.org.br";
const BUCKET = "provas-oab";

type Arquivo = { titulo: string; url: string; data?: string };

type ExameRow = {
  numero: number;
  titulo: string;
  ano: number | null;
  oab_exame_id: string;
  oab_source_url: string;
  edital_url: string | null;
  prova_1fase_url: string | null;
  gabarito_1fase_url: string | null;
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

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
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

async function listarArquivos(exameId: string): Promise<Arquivo[]> {
  const res = await fetch(`${OAB_BASE}/EditaisProvas?NumeroExame=${exameId}`);
  const html = await res.text();
  const arquivos: Arquivo[] = [];
  const anchorRe = /<a\s+[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html))) {
    const href = m[1];
    const text = stripTags(m[2]);
    if (!text || text.length < 4) continue;
    if (
      /\.pdf(\?|$)/i.test(href) ||
      /\/arquivos\//i.test(href) ||
      /DownloadArquivo/i.test(href)
    ) {
      arquivos.push({ titulo: text, url: absolutizeUrl(href) });
    }
  }
  const seen = new Set<string>();
  return arquivos.filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)));
}

function classificar(arquivos: Arquivo[]): {
  edital: string | null;
  prova1: string | null;
  gabarito1: string | null;
} {
  let edital: string | null = null;
  let prova1: string | null = null;
  let gabarito1: string | null = null;

  for (const a of arquivos) {
    const t = a.titulo.toLowerCase();
    const semData = t.replace(/^\d{2}\/\d{2}\/\d{4}\s*-\s*/, "").trim();

    // pula 2ª fase
    if (/\(direito/.test(semData)) continue;

    if (!edital && /^edital de abertura\b/.test(semData)) { edital = a.url; continue; }

    if (/gabaritos?\s+definitivos?.*prova objetiva|gabaritos?\s+definitivos?.*1[ªa]\s*fase/.test(semData)) {
      gabarito1 = a.url; continue;
    }
    if (!gabarito1 && /gabaritos?\s+preliminar.*prova objetiva|gabaritos?\s+preliminar.*1[ªa]\s*fase/.test(semData)) {
      gabarito1 = a.url; continue;
    }

    if (!prova1 && /^caderno de prova\b.*tipo\s*1\b/.test(semData)) { prova1 = a.url; continue; }
    if (!prova1 && /^caderno de prova\b/.test(semData)) { prova1 = a.url; continue; }

    if (!edital && /\bedital\b/.test(semData) && !/retifica|locais|hor[áa]rio|complementar/.test(semData)) {
      edital = a.url; continue;
    }
  }
  return { edital, prova1, gabarito1 };
}

async function baixarESubir(
  supabaseAdmin: {
    storage: {
      from: (b: string) => {
        upload: (p: string, body: ArrayBuffer, opts: { contentType: string; upsert: boolean }) => Promise<{ error: { message: string } | null }>;
        getPublicUrl: (p: string) => { data: { publicUrl: string } };
      };
    };
  },
  sourceUrl: string,
  path: string,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, { redirect: "follow" });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (error) throw new Error(error.message);
    return supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}

export async function executarSeedProvasOab(data: { apenasNumero?: number; dryRun?: boolean } = {}) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const exames = await listarExames();
    if (exames.length === 0) throw new Error("Não consegui listar os exames no site da OAB.");

    const rows: ExameRow[] = [];
    const erros: Array<{ titulo: string; erro: string }> = [];

    for (const ex of exames) {
      const numero = parseNumero(ex.titulo);
      if (data.apenasNumero && numero !== data.apenasNumero) continue;
      try {
        const arquivos = await listarArquivos(ex.id);
        const c = classificar(arquivos);
        const anoMatch = ex.titulo.match(/20\d{2}/);

        let editalUrl: string | null = null;
        let provaUrl: string | null = null;
        let gabaritoUrl: string | null = null;

        if (!data.dryRun) {
          if (c.edital) {
            editalUrl = await baixarESubir(supabaseAdmin, c.edital, `${numero}/edital.pdf`);
            await new Promise((r) => setTimeout(r, 200));
          }
          if (c.prova1) {
            provaUrl = await baixarESubir(supabaseAdmin, c.prova1, `${numero}/prova.pdf`);
            await new Promise((r) => setTimeout(r, 200));
          }
          if (c.gabarito1) {
            gabaritoUrl = await baixarESubir(supabaseAdmin, c.gabarito1, `${numero}/gabarito.pdf`);
            await new Promise((r) => setTimeout(r, 200));
          }
        }

        rows.push({
          numero,
          titulo: ex.titulo,
          ano: anoMatch ? parseInt(anoMatch[0], 10) : null,
          oab_exame_id: ex.id,
          oab_source_url: `${OAB_BASE}/EditaisProvas?NumeroExame=${ex.id}`,
          edital_url: editalUrl,
          prova_1fase_url: provaUrl,
          gabarito_1fase_url: gabaritoUrl,
        });
      } catch (e) {
        erros.push({ titulo: ex.titulo, erro: (e as Error).message });
      }
    }

    if (!data.dryRun && rows.length > 0) {
      const { error } = await supabaseAdmin
        .from("provas_oab")
        .upsert(rows, { onConflict: "numero" });
      if (error) throw new Error("Falha ao salvar: " + error.message);
    }

    return {
      total_exames: exames.length,
      total_salvos: rows.length,
      com_prova: rows.filter((r) => r.prova_1fase_url).length,
      com_gabarito: rows.filter((r) => r.gabarito_1fase_url).length,
      com_edital: rows.filter((r) => r.edital_url).length,
      erros,
      dryRun: !!data.dryRun,
    };
}

/**
 * Seed do catálogo de provas da OAB.
 * Baixa edital + prova + gabarito da 1ª fase de cada exame e sobe para o
 * Supabase Storage (bucket `provas-oab`).
 *
 * Aceita `apenasNumero` para reprocessar um único exame.
 */
export const seedProvasOab = createServerFn({ method: "POST" })
  .inputValidator((input: { apenasNumero?: number; dryRun?: boolean } | undefined) => input ?? {})
  .handler(async ({ data }) => executarSeedProvasOab(data));
