import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ArquivoDrive = {
  id: string;
  nome_arquivo: string;
  subpasta: string;
  tipo: "material" | "mapa" | "cronograma" | "bonus";
  storage_bucket: string;
  storage_path: string;
  pdf_url: string | null;
  bytes: number | null;
  curso_id: string | null;
  aula_id: string | null;
  status_ingestao: string;
  erro_msg: string | null;
};

export const listarArquivosDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ArquivoDrive[]> => {
    const { data, error } = await context.supabase
      .from("aulas_interativas_arquivos_drive")
      .select(
        "id, nome_arquivo, subpasta, tipo, storage_bucket, storage_path, pdf_url, bytes, curso_id, aula_id, status_ingestao, erro_msg",
      )
      .order("subpasta")
      .order("tipo")
      .order("nome_arquivo");
    if (error) throw new Error(error.message);
    return (data ?? []) as ArquivoDrive[];
  });

export const atualizarStatusDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status_ingestao: z.enum([
          "pendente",
          "processando",
          "extraindo",
          "extraido",
          "gerando_previa",
          "previa_pronta",
          "publicando",
          "concluido",
          "erro",
        ]),
        curso_id: z.string().uuid().nullable().optional(),
        aula_id: z.string().uuid().nullable().optional(),
        erro_msg: z.string().nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("aulas_interativas_arquivos_drive")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listarAulasDoCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cursoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: aulas, error } = await context.supabase
      .from("aulas_interativas_aulas")
      .select("id, titulo, modulo_id, ordem")
      .eq("curso_id", data.cursoId)
      .order("ordem");
    if (error) throw new Error(error.message);
    return aulas ?? [];
  });

export const vincularMapaAula = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        arquivoDriveId: z.string().uuid(),
        aulaId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Busca o arquivo (mapa) e a aula
    const { data: arq, error: e1 } = await supabase
      .from("aulas_interativas_arquivos_drive")
      .select("id, nome_arquivo, pdf_url, tipo, aula_id")
      .eq("id", data.arquivoDriveId)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!arq || arq.tipo !== "mapa") throw new Error("Arquivo inválido (precisa ser mapa)");
    if (!arq.pdf_url) throw new Error("Arquivo sem URL pública");

    // Acha a próxima ordem na aula
    const { data: ultimo } = await supabase
      .from("aulas_interativas_slides")
      .select("ordem")
      .eq("aula_id", data.aulaId)
      .order("ordem", { ascending: false })
      .limit(1);
    const novaOrdem = ((ultimo?.[0]?.ordem as number | undefined) ?? -1) + 1;

    // Cria slide do tipo mapa_mental
    const { error: e2 } = await supabase.from("aulas_interativas_slides").insert({
      aula_id: data.aulaId,
      ordem: novaOrdem,
      tipo: "mapa_mental",
      conteudo: {
        titulo: arq.nome_arquivo.replace(/\.pdf$/i, ""),
        pdf_url: arq.pdf_url,
      } as never,
      imagem_url: null,
      quiz_json: null,
    } as never);
    if (e2) throw new Error(e2.message);

    // Marca o arquivo como vinculado
    await supabase
      .from("aulas_interativas_arquivos_drive")
      .update({
        aula_id: data.aulaId,
        status_ingestao: "concluido",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.arquivoDriveId);

    return { ok: true };
  });

export const obterPreviaArquivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ arquivoDriveId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("aulas_interativas_previas")
      .select("id, estrutura, titulo_sugerido, materia_sugerida, created_at")
      .eq("arquivo_drive_id", data.arquivoDriveId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row as
      | {
          id: string;
          estrutura: { modulos: any[] };
          titulo_sugerido: string | null;
          materia_sugerida: string | null;
          created_at: string;
        }
      | null;
  });

export const obterExtracaoArquivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ arquivoDriveId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("aulas_interativas_extracoes")
      .select("id, paginas_total, modelo, created_at, imagens, paginas")
      .eq("arquivo_drive_id", data.arquivoDriveId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return {
      ...row,
      paginas_processadas: Array.isArray(row.paginas) ? row.paginas.length : 0,
    };
  });
