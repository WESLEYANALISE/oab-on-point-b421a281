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

// ====== Conteúdo do ato (leitor interno tipo artigo) ======

function resolverUrlsRelativas(html: string, baseUrl: string): string {
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return html;
  }
  const resolve = (val: string) => {
    if (!val) return val;
    if (/^(https?:|mailto:|tel:|data:|#)/i.test(val)) return val;
    try {
      return new URL(val, base).toString();
    } catch {
      return val;
    }
  };
  return html
    .replace(/(<a\b[^>]*?\shref=")([^"]+)(")/gi, (_, p, u, s) => p + resolve(u) + s)
    .replace(/(<a\b[^>]*?\shref=')([^']+)(')/gi, (_, p, u, s) => p + resolve(u) + s)
    .replace(/(<img\b[^>]*?\ssrc=")([^"]+)(")/gi, (_, p, u, s) => p + resolve(u) + s)
    .replace(/(<img\b[^>]*?\ssrc=')([^']+)(')/gi, (_, p, u, s) => p + resolve(u) + s);
}

function extrairConteudoPlanalto(
  html: string,
  baseUrl: string,
): { titulo: string | null; html: string } {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/ on\w+="[^"]*"/gi, "")
    .replace(/ on\w+='[^']*'/gi, "");

  const tituloMatch = h.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titulo = tituloMatch ? tituloMatch[1].replace(/\s+/g, " ").trim() : null;

  const bodyMatch = h.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let conteudo = bodyMatch ? bodyMatch[1] : h;

  // Força links a abrirem em nova aba e resolve URLs relativas (img/a).
  conteudo = conteudo.replace(/<a\b([^>]*)>/gi, (m, attrs) => {
    if (/\btarget=/i.test(attrs)) return m;
    return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
  });
  conteudo = resolverUrlsRelativas(conteudo, baseUrl);

  return { titulo, html: conteudo.trim() };
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

    let conteudoHtml = "";
    let tituloFonte: string | null = null;
    let erroConteudo: string | null = null;
    try {
      const html = await fetchDirect(ato.url);
      const parsed = extrairConteudoPlanalto(html, ato.url);
      conteudoHtml = parsed.html;
      tituloFonte = parsed.titulo;
    } catch (e) {
      erroConteudo = e instanceof Error ? e.message : String(e);
    }

    return { ato, conteudoHtml, tituloFonte, erroConteudo };
  });
