import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchDirect, fetchRendered } from "./browserless.server";
import { parseResenhaMes, mesSlugFromNumber, type DiaParsed } from "./resenha-parser";

const BASE_URL = "https://www4.planalto.gov.br/legislacao/portal-legis/resenha-diaria";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

function fonteUrl(mesSlug: string): string {
  return `${BASE_URL}/${mesSlug}-resenha-diaria`;
}

function mesRef(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export type SyncResult = {
  meses: { mes_ref: string; dias: number; atos: number }[];
  novos: number;
  atualizados: number;
};

export async function executarSyncResenha(opts: {
  meses?: { ano: number; mes: number }[]; // se vazio, usa mês corrente (America/Sao_Paulo)
  useBrowserless?: boolean;
  gatilho?: string;
} = {}): Promise<SyncResult> {
  // Determina meses a sincronizar
  let alvos = opts.meses ?? [];
  if (alvos.length === 0) {
    // mês corrente em SP (UTC-3)
    const agora = new Date(Date.now() - 3 * 3600 * 1000);
    alvos = [{ ano: agora.getUTCFullYear(), mes: agora.getUTCMonth() + 1 }];
  }

  const resumo: SyncResult = { meses: [], novos: 0, atualizados: 0 };
  let erroGlobal: string | null = null;

  for (const alvo of alvos) {
    const mesSlug = mesSlugFromNumber(alvo.mes);
    const ref = mesRef(alvo.ano, alvo.mes);
    const url = fonteUrl(mesSlug);
    try {
      const html = opts.useBrowserless ? await fetchRendered(url) : await fetchDirect(url);
      const dias = parseResenhaMes(html).filter((d) => d.data_dou.startsWith(ref));

      let atosCount = 0;
      for (const dia of dias) {
        atosCount += dia.atos.length;
        await upsertDia(dia, ref, url);
        const { novos, atualizados } = await upsertAtos(dia);
        resumo.novos += novos;
        resumo.atualizados += atualizados;
      }
      resumo.meses.push({ mes_ref: ref, dias: dias.length, atos: atosCount });
    } catch (e) {
      erroGlobal = e instanceof Error ? e.message : String(e);
    }
  }

  await supabaseAdmin.from("legis_sync_runs").insert({
    gatilho: opts.gatilho ?? "manual",
    mes_ref: alvos.map((a) => mesRef(a.ano, a.mes)).join(","),
    novos: resumo.novos,
    atualizados: resumo.atualizados,
    erro: erroGlobal,
  });

  if (erroGlobal && resumo.meses.length === 0) throw new Error(erroGlobal);
  return resumo;
}

async function upsertDia(dia: DiaParsed, mesRefValue: string, url: string) {
  await supabaseAdmin
    .from("legis_resenha_dia")
    .upsert(
      {
        data_dou: dia.data_dou,
        edicao_extra: dia.edicao_extra,
        mes_ref: mesRefValue,
        fonte_url: url,
        extraido_em: new Date().toISOString(),
        total_atos: dia.atos.length,
      },
      { onConflict: "data_dou,edicao_extra" },
    );
}

async function upsertAtos(dia: DiaParsed): Promise<{ novos: number; atualizados: number }> {
  let novos = 0;
  let atualizados = 0;
  for (const ato of dia.atos) {
    const { data: existente } = await supabaseAdmin
      .from("legis_atos")
      .select("id, ementa, url")
      .eq("hash", ato.hash)
      .maybeSingle();

    if (!existente) {
      const { error } = await supabaseAdmin.from("legis_atos").insert({
        data_dou: dia.data_dou,
        edicao_extra: dia.edicao_extra,
        tipo: ato.tipo,
        numero: ato.numero,
        data_assinatura: ato.data_assinatura,
        ementa: ato.ementa,
        url: ato.url,
        hash: ato.hash,
      });
      if (!error) novos += 1;
    } else if (existente.ementa !== ato.ementa || existente.url !== ato.url) {
      await supabaseAdmin
        .from("legis_atos")
        .update({ ementa: ato.ementa, url: ato.url })
        .eq("id", existente.id);
      atualizados += 1;
    }
  }
  return { novos, atualizados };
}

// ====== Server functions expostas ao app ======

export const runResenhaSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { meses?: { ano: number; mes: number }[]; useBrowserless?: boolean } | undefined) =>
      input ?? {},
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return executarSyncResenha({ ...data, gatilho: "manual" });
  });

export const listResenhaMes = createServerFn({ method: "POST" })
  .inputValidator((input: { ano: number; mes: number }) => input)
  .handler(async ({ data }) => {
    const ref = mesRef(data.ano, data.mes);
    const inicio = `${ref}-01`;
    const fim =
      data.mes === 12
        ? `${data.ano + 1}-01-01`
        : `${data.ano}-${String(data.mes + 1).padStart(2, "0")}-01`;

    const { data: atos, error } = await supabaseAdmin
      .from("legis_atos")
      .select("id, data_dou, edicao_extra, tipo, numero, data_assinatura, ementa, url, created_at")
      .gte("data_dou", inicio)
      .lt("data_dou", fim)
      .order("data_dou", { ascending: false });
    if (error) throw error;

    const { data: dias } = await supabaseAdmin
      .from("legis_resenha_dia")
      .select("data_dou, edicao_extra, extraido_em, total_atos")
      .gte("data_dou", inicio)
      .lt("data_dou", fim)
      .order("data_dou", { ascending: false });

    return { atos: atos ?? [], dias: dias ?? [] };
  });

export const listResenhaRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("legis_sync_runs")
      .select("id, executado_em, gatilho, mes_ref, novos, atualizados, erro")
      .order("executado_em", { ascending: false })
      .limit(50);
    if (error) throw error;
    return { runs: data ?? [] };
  });

// ====== Conteúdo do ato (leitor estruturado tipo Vade Mecum) ======

function stripTags(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export type AtoSecao =
  | { kind: "preambulo"; text: string }
  | { kind: "estrutura"; rotulo: string; texto: string }
  | { kind: "artigo"; numero: string; titulo: string; itens: { text: string; italic?: boolean }[] };

export type AtoAnexo = {
  titulo: string;
  subtitulo?: string;
  tabelas: { rows: string[][] }[];
};

export type AtoEstruturado = {
  titulo: string | null;
  ementa: string | null;
  secoes: AtoSecao[];
  assinaturas: { text: string; italic?: boolean }[];
  anexos: AtoAnexo[];
  fonteUrl: string;
};

function parseAtoEstruturado(html: string, baseUrl: string): AtoEstruturado {
  // 1. Título oficial (link com "LEI Nº ... DE ...")
  let titulo: string | null = null;
  const titRe =
    /<strong[^>]*>\s*((?:LEI|DECRETO|EMENDA|MEDIDA\s+PROVIS[ÓO]RIA|MENSAGEM)[^<]*?N[ºo°]?\s*[\d.\-A-Z]+[^<]*?)<\/strong>/i;
  const titMatch = html.match(titRe);
  if (titMatch) titulo = collapse(stripTags(titMatch[1]));

  // 2. Ementa (texto em vermelho — color="#800000" ou similar)
  let ementa: string | null = null;
  const ementaRe = /<font[^>]*color\s*=\s*["']?#?800000["']?[^>]*>([\s\S]*?)<\/font>/i;
  const ementaMatch = html.match(ementaRe);
  if (ementaMatch) {
    const t = collapse(stripTags(ementaMatch[1]));
    if (t.length > 10) ementa = t;
  }

  // 3. Body — remove cabeçalhos (brasão+presidência), título+ementa e rodapé
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1] : html;
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<img[^>]*>/gi, "");

  // Tira tabelas do topo (primeira table = brasão+presidência; segunda costuma
  // ser título+ementa). Só remove as 2 primeiras.
  for (let i = 0; i < 2; i++) {
    body = body.replace(/<table[\s\S]*?<\/table>/i, "");
  }
  // Tira rodapé "Este texto não substitui..."
  body = body.replace(
    /<(?:p|small|font)[^>]*>\s*Este texto n[ãa]o substitui[\s\S]*?<\/(?:p|small|font)>/gi,
    "",
  );

  // 4. Extrai parágrafos
  type Para = { text: string; align: "left" | "center"; italic: boolean };
  const paras: Para[] = [];
  const pRe = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
  let m: RegExpExecArray | null;
  while ((m = pRe.exec(body)) !== null) {
    const attrs = m[1] || "";
    const inner = m[2] || "";
    const align =
      /align\s*=\s*["']?center["']?/i.test(attrs) ||
      /text-align\s*:\s*center/i.test(attrs) ||
      /text-align\s*:\s*center/i.test(inner)
        ? "center"
        : "left";
    // Quebra por <br> para separar nomes/linhas dentro do mesmo <p>
    // (importante nas assinaturas: presidente fica numa linha, ministro em outra)
    const fragments = inner.split(/<br\s*\/?>/i);
    for (const frag of fragments) {
      const italic = /<i\b|<em\b|font-style\s*:\s*italic/i.test(frag);
      const text = collapse(stripTags(frag));
      if (text) paras.push({ text, align, italic });
    }
  }

  // 5. Agrupa em seções
  const secoes: AtoSecao[] = [];
  const assinaturas: { text: string; italic?: boolean }[] = [];

  const ART_RE = /^(Art\.?\s*\d+[ºoOª°.]?(?:[-‑–][A-Za-z\d]+)?)\s*[.\-–—:]?\s*(.*)$/i;
  const ESTRUTURA_RE = /^(LIVRO|PARTE|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O|DISPOSI[ÇC][ÕO]ES)\b/i;
  const SIG_RE = /^Bras[íi]lia,/i;

  let currentArt: Extract<AtoSecao, { kind: "artigo" }> | null = null;
  let preambuloAdicionado = false;
  let inSignatures = false;

  const ANEXO_HEAD_RE = /^ANEXO\s+[IVXLCDM\d]+/i;
  for (const p of paras) {
    // Quando bate em ANEXO, paramos de coletar (vai pro bloco de anexos)
    if (ANEXO_HEAD_RE.test(p.text)) break;
    if (inSignatures) {
      assinaturas.push({ text: p.text, italic: p.italic });
      continue;
    }
    if (SIG_RE.test(p.text)) {
      inSignatures = true;
      assinaturas.push({ text: p.text, italic: p.italic });
      continue;
    }

    const artMatch = p.text.match(ART_RE);
    if (artMatch) {
      currentArt = {
        kind: "artigo",
        numero: artMatch[1].replace(/\s+/g, " ").trim(),
        titulo: artMatch[2] ? collapse(artMatch[2]) : "",
        itens: [{ text: p.text, italic: p.italic }],
      };
      secoes.push(currentArt);
      continue;
    }

    if (currentArt) {
      currentArt.itens.push({ text: p.text, italic: p.italic });
      continue;
    }

    // Antes do primeiro artigo
    if (!preambuloAdicionado && /PRESIDENTE\s+DA\s+REP[ÚU]BLICA/i.test(p.text)) {
      secoes.push({ kind: "preambulo", text: p.text });
      preambuloAdicionado = true;
      continue;
    }
    const estMatch = p.text.match(ESTRUTURA_RE);
    if (estMatch) {
      // Quebra título/subtítulo em rótulo + texto
      const linhas = stripTags(p.text).split(/\n+/).map((x) => x.trim()).filter(Boolean);
      const rotulo = linhas[0] ?? p.text;
      const texto = linhas.slice(1).join(" ");
      secoes.push({ kind: "estrutura", rotulo, texto });
    }
  }

  // 6. Extrai anexos (blocos após "ANEXO I/II/...") com suas tabelas
  const anexos: AtoAnexo[] = [];
  const blockRe = /<(p|table)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const blocks: Array<{ type: "p" | "table"; html: string; text: string }> = [];
  let bm: RegExpExecArray | null;
  while ((bm = blockRe.exec(body)) !== null) {
    const type = bm[1].toLowerCase() as "p" | "table";
    blocks.push({ type, html: bm[0], text: collapse(stripTags(bm[0])) });
  }
  const ANEXO_RE = /^ANEXO\s+[IVXLCDM\d]+/i;
  let currentAnexo: AtoAnexo | null = null;
  for (const b of blocks) {
    if (b.type === "p" && ANEXO_RE.test(b.text)) {
      currentAnexo = { titulo: b.text, tabelas: [] };
      anexos.push(currentAnexo);
      continue;
    }
    if (!currentAnexo) continue;
    if (b.type === "p") {
      if (!currentAnexo.subtitulo && currentAnexo.tabelas.length === 0 && b.text) {
        currentAnexo.subtitulo = b.text;
      }
      continue;
    }
    // table
    const rows: string[][] = [];
    const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let trm: RegExpExecArray | null;
    while ((trm = trRe.exec(b.html)) !== null) {
      const cells: string[] = [];
      const tdRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let tdm: RegExpExecArray | null;
      while ((tdm = tdRe.exec(trm[1])) !== null) {
        cells.push(collapse(stripTags(tdm[1])));
      }
      if (cells.length) rows.push(cells);
    }
    if (rows.length) currentAnexo.tabelas.push({ rows });
  }

  return { titulo, ementa, secoes, assinaturas, anexos, fonteUrl: baseUrl };
}

export const getAtoConteudo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const { data: ato, error } = await supabaseAdmin
      .from("legis_atos")
      .select("id, data_dou, edicao_extra, tipo, numero, data_assinatura, ementa, url, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!ato) throw new Error("Ato não encontrado");

    let estruturado: AtoEstruturado | null = null;
    let erroConteudo: string | null = null;
    try {
      const html = await fetchDirect(ato.url);
      estruturado = parseAtoEstruturado(html, ato.url);
    } catch (e) {
      erroConteudo = e instanceof Error ? e.message : String(e);
    }

    return { ato, estruturado, erroConteudo };
  });
