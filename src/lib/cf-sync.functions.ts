import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchDirect, fetchRendered } from "./browserless.server";
import { parseCF, type ArtigoParsed } from "./cf-parser";

const FONTE_URL = "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

type Diff = {
  total_planalto: number;
  total_banco: number;
  novos: { numero: string; parte: string; ult_alteracao_em: string | null }[];
  alterados: {
    numero: string;
    parte: string;
    de: string | null;
    para: string | null;
    norma: string | null;
  }[];
  revogados: { numero: string; norma: string | null }[];
};

export async function executarSyncCF(opts: { useBrowserless?: boolean } = {}) {
  const html = opts.useBrowserless
    ? await fetchRendered(FONTE_URL)
    : await fetchDirect(FONTE_URL);

  const parsed = parseCF(html);

  // Busca lei + artigos atuais
  const { data: lei, error: leiErr } = await supabaseAdmin
    .from("vade_mecum_leis")
    .select("id, slug")
    .eq("slug", "cf")
    .maybeSingle();
  if (leiErr || !lei) throw new Error("Lei 'cf' não encontrada no banco");

  const { data: atuais, error: artErr } = await supabaseAdmin
    .from("vade_mecum_artigos")
    .select("id, numero, ult_alteracao_em, alteracoes, revogado")
    .eq("lei_id", lei.id);
  if (artErr) throw artErr;

  const mapaBanco = new Map(
    (atuais ?? []).map((a) => [String(a.numero), a as { id: string; numero: string; ult_alteracao_em: string | null; alteracoes: unknown; revogado: boolean }]),
  );

  const diff: Diff = {
    total_planalto: parsed.length,
    total_banco: atuais?.length ?? 0,
    novos: [],
    alterados: [],
    revogados: [],
  };

  const updates: { id: string; ult_alteracao_em: string | null; alteracoes: ArtigoParsed["alteracoes"]; revogado: boolean }[] = [];

  for (const p of parsed) {
    const row = mapaBanco.get(p.numero);
    if (!row) {
      diff.novos.push({ numero: p.numero, parte: p.parte, ult_alteracao_em: p.ult_alteracao_em });
      continue;
    }
    const mudou =
      (row.ult_alteracao_em ?? null) !== (p.ult_alteracao_em ?? null) ||
      (row.revogado ?? false) !== p.revogado;
    if (mudou) {
      const ultima = p.alteracoes[p.alteracoes.length - 1] ?? null;
      diff.alterados.push({
        numero: p.numero,
        parte: p.parte,
        de: row.ult_alteracao_em,
        para: p.ult_alteracao_em,
        norma: ultima?.norma ?? null,
      });
      if (p.revogado && !row.revogado) {
        diff.revogados.push({ numero: p.numero, norma: ultima?.norma ?? null });
      }
      updates.push({
        id: row.id,
        ult_alteracao_em: p.ult_alteracao_em,
        alteracoes: p.alteracoes,
        revogado: p.revogado,
      });
    }
  }

  // Aplica updates (não toca em `texto` — preserva narrações/comentários)
  for (const u of updates) {
    await supabaseAdmin
      .from("vade_mecum_artigos")
      .update({
        ult_alteracao_em: u.ult_alteracao_em,
        alteracoes: JSON.parse(JSON.stringify(u.alteracoes)),
        revogado: u.revogado,
      })
      .eq("id", u.id);
  }

  const resumo_md = [
    `# Sync Constituição Federal`,
    `Fonte: ${FONTE_URL}`,
    `Planalto: **${diff.total_planalto}** artigos | Banco: **${diff.total_banco}**`,
    ``,
    `- 🆕 Novos: **${diff.novos.length}**`,
    `- ⚠ Alterados: **${diff.alterados.length}**`,
    `- ⛔ Revogados: **${diff.revogados.length}**`,
  ].join("\n");

  const { data: rel, error: relErr } = await supabaseAdmin
    .from("vade_mecum_sync_relatorios")
    .insert({
      lei_id: lei.id,
      fonte_url: FONTE_URL,
      status:
        diff.novos.length + diff.alterados.length + diff.revogados.length === 0
          ? "sem_mudanca"
          : "mudancas_detectadas",
      total_planalto: diff.total_planalto,
      total_banco: diff.total_banco,
      novos: diff.novos,
      alterados: diff.alterados,
      revogados: diff.revogados,
      resumo_md,
    })
    .select("id")
    .single();
  if (relErr) throw relErr;

  return { relatorio_id: rel.id, ...diff, resumo_md };
}

// Server function chamada pelo painel admin
export const runCFSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { useBrowserless?: boolean } | undefined) => input ?? {})
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return executarSyncCF(data);
  });

export const listarRelatoriosCF = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("vade_mecum_sync_relatorios")
      .select("id, executado_em, status, total_planalto, total_banco, novos, alterados, revogados, resumo_md, erro_msg")
      .order("executado_em", { ascending: false })
      .limit(50);
    if (error) throw error;
    return { relatorios: data ?? [] };
  });
