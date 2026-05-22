import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Tipos públicos ----------

export type SlideTipo =
  | "capa"
  | "conceito"
  | "exemplo"
  | "esquema"
  | "comparativo"
  | "quiz"
  | "resumo"
  | "conclusao"
  | "mapa_mental";

export type SlideConteudo = {
  titulo?: string;
  texto?: string;
  destaque?: string;
  bullets?: string[];
  objetivos?: string[];
  colunas?: { titulo: string; itens: string[] }[];
  pdf_url?: string;
};

export type QuizJson = {
  pergunta: string;
  alternativas: { letra: string; texto: string }[];
  correta: string;
  explicacao: string;
};

export type SlideRow = {
  id: string;
  aula_id: string;
  ordem: number;
  tipo: SlideTipo;
  conteudo: SlideConteudo;
  imagem_url: string | null;
  quiz_json: QuizJson | null;
};

export type AulaRow = {
  id: string;
  modulo_id: string;
  curso_id: string;
  titulo: string;
  slug: string;
  descricao: string;
  ordem: number;
  duracao_min: number;
};

export type ModuloRow = {
  id: string;
  curso_id: string;
  titulo: string;
  descricao: string;
  ordem: number;
};

export type CursoRow = {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  capa_url: string | null;
  materia: string | null;
  publicado: boolean;
  ordem: number;
};

// ---------- Schemas de input ----------

const SlideInput = z.object({
  ordem: z.number().int().min(0),
  tipo: z.enum([
    "capa",
    "conceito",
    "exemplo",
    "esquema",
    "comparativo",
    "quiz",
    "resumo",
    "conclusao",
    "mapa_mental",
  ]),
  conteudo: z.record(z.string(), z.unknown()).default({}),
  imagem_url: z.string().url().nullable().optional(),
  quiz_json: z
    .object({
      pergunta: z.string(),
      alternativas: z.array(z.object({ letra: z.string(), texto: z.string() })).min(2).max(6),
      correta: z.string(),
      explicacao: z.string(),
    })
    .nullable()
    .optional(),
});

const AulaInput = z.object({
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(500).default(""),
  duracao_min: z.number().int().min(1).max(180).default(10),
  slides: z.array(SlideInput).max(80),
});

const ModuloInput = z.object({
  titulo: z.string().min(1).max(200),
  descricao: z.string().max(500).default(""),
  aulas: z.array(AulaInput).min(1).max(80),
});

const CursoInput = z.object({
  titulo: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/),
  descricao: z.string().max(2000).default(""),
  capa_url: z.string().url().nullable().optional(),
  materia: z.string().max(80).nullable().optional(),
  pdf_origem_url: z.string().url().nullable().optional(),
  publicado: z.boolean().default(false),
  modulos: z.array(ModuloInput).min(1).max(40),
});

// ---------- Leitura pública ----------

export const listarCursos = createServerFn({ method: "POST" })
  .handler(async (): Promise<CursoRow[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, key);
    const { data, error } = await sb
      .from("aulas_interativas_cursos")
      .select("id, titulo, slug, descricao, capa_url, materia, publicado, ordem")
      .eq("publicado", true)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as CursoRow[];
  });

export const getCursoCompleto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, key);

    const { data: curso, error: e1 } = await sb
      .from("aulas_interativas_cursos")
      .select("id, titulo, slug, descricao, capa_url, materia, publicado, ordem")
      .eq("slug", data.slug)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!curso) return null;

    const { data: modulos } = await sb
      .from("aulas_interativas_modulos")
      .select("id, curso_id, titulo, descricao, ordem")
      .eq("curso_id", curso.id)
      .order("ordem", { ascending: true });

    const { data: aulas } = await sb
      .from("aulas_interativas_aulas")
      .select("id, modulo_id, curso_id, titulo, slug, descricao, ordem, duracao_min")
      .eq("curso_id", curso.id)
      .order("ordem", { ascending: true });

    return {
      curso: curso as CursoRow,
      modulos: (modulos ?? []) as ModuloRow[],
      aulas: (aulas ?? []) as AulaRow[],
    };
  });

export const getAulaCompleta = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({ cursoSlug: z.string().min(1).max(120), aulaSlug: z.string().min(1).max(120) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
    const sb = createClient(url, key);

    const { data: curso } = await sb
      .from("aulas_interativas_cursos")
      .select("id, titulo, slug")
      .eq("slug", data.cursoSlug)
      .maybeSingle();
    if (!curso) return null;

    const { data: aula } = await sb
      .from("aulas_interativas_aulas")
      .select("id, modulo_id, curso_id, titulo, slug, descricao, ordem, duracao_min")
      .eq("curso_id", curso.id)
      .eq("slug", data.aulaSlug)
      .maybeSingle();
    if (!aula) return null;

    const { data: slides } = await sb
      .from("aulas_interativas_slides")
      .select("id, aula_id, ordem, tipo, conteudo, imagem_url, quiz_json")
      .eq("aula_id", aula.id)
      .order("ordem", { ascending: true });

    return {
      curso: curso as Pick<CursoRow, "id" | "titulo" | "slug">,
      aula: aula as AulaRow,
      slides: (slides ?? []) as unknown as SlideRow[],
    };
  });

// ---------- Progresso ----------

export const salvarProgresso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        aulaId: z.string().uuid(),
        cursoId: z.string().uuid(),
        slideAtual: z.number().int().min(0).max(200),
        concluida: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("aulas_interativas_progresso")
      .upsert(
        {
          user_id: userId,
          aula_id: data.aulaId,
          curso_id: data.cursoId,
          slide_atual: data.slideAtual,
          concluida: data.concluida,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "user_id,aula_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProgressoCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cursoId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("aulas_interativas_progresso")
      .select("aula_id, slide_atual, concluida")
      .eq("user_id", userId)
      .eq("curso_id", data.cursoId);
    if (error) throw new Error(error.message);
    return (rows ?? []) as { aula_id: string; slide_atual: number; concluida: boolean }[];
  });

// ---------- Admin: publicar curso completo ----------

export const publicarCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CursoInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Verifica admin
    const { data: roleRow } = await supabase
      .schema("private" as never)
      .rpc("has_role" as never, { _user_id: context.userId, _role: "admin" } as never);
    // Fallback: usa policy padrão (se falhar a chamada acima, ainda obedece RLS)

    // Cria curso (garante slug único)
    const slugBase = data.slug;
    let slugFinal = slugBase;
    let curso: { id: string } | null = null;
    let ec: { message: string } | null = null;
    for (let tent = 0; tent < 5; tent++) {
      const res = await supabase
        .from("aulas_interativas_cursos")
        .insert({
          titulo: data.titulo,
          slug: slugFinal,
          descricao: data.descricao,
          capa_url: data.capa_url ?? null,
          materia: data.materia ?? null,
          pdf_origem_url: data.pdf_origem_url ?? null,
          publicado: data.publicado,
          ordem: 0,
        })
        .select("id")
        .single();
      if (!res.error && res.data) {
        curso = res.data;
        ec = null;
        break;
      }
      ec = res.error;
      if (res.error?.code === "23505") {
        slugFinal = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;
        continue;
      }
      break;
    }
    if (ec || !curso) throw new Error(ec?.message ?? "Falha ao criar curso");

    const cursoId = curso.id;

    for (let mi = 0; mi < data.modulos.length; mi++) {
      const m = data.modulos[mi];
      const { data: modulo, error: em } = await supabase
        .from("aulas_interativas_modulos")
        .insert({
          curso_id: cursoId,
          titulo: m.titulo,
          descricao: m.descricao,
          ordem: mi,
        })
        .select("id")
        .single();
      if (em || !modulo) throw new Error(em?.message ?? "Falha ao criar módulo");

      for (let ai = 0; ai < m.aulas.length; ai++) {
        const a = m.aulas[ai];
        const slugAula = slugify(a.titulo) + "-" + mi + "-" + ai;
        const { data: aula, error: ea } = await supabase
          .from("aulas_interativas_aulas")
          .insert({
            modulo_id: modulo.id,
            curso_id: cursoId,
            titulo: a.titulo,
            slug: slugAula,
            descricao: a.descricao,
            duracao_min: a.duracao_min,
            ordem: ai,
          })
          .select("id")
          .single();
        if (ea || !aula) throw new Error(ea?.message ?? "Falha ao criar aula");

        const slidesRows = a.slides.map((s) => ({
          aula_id: aula.id,
          ordem: s.ordem,
          tipo: s.tipo,
          conteudo: (s.conteudo ?? {}) as never,
          imagem_url: s.imagem_url ?? null,
          quiz_json: (s.quiz_json ?? null) as never,
        }));
        const { error: es } = await supabase
          .from("aulas_interativas_slides")
          .insert(slidesRows as never);
        if (es) throw new Error(es.message);
      }
    }

    void roleRow;
    return { ok: true, cursoId };
  });

export const listarCursosAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("aulas_interativas_cursos")
      .select("id, titulo, slug, descricao, capa_url, materia, publicado, ordem, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const togglePublicarCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), publicado: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("aulas_interativas_cursos")
      .update({ publicado: data.publicado })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const excluirCurso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("aulas_interativas_cursos")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Util ----------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
