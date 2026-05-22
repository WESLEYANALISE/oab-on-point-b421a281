import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { geminiGenerateContent } from "@/lib/gemini.server";

// ============== Tipos ==============
export type FlashcardCurado = {
  id: string;
  resumo_livro_id: string;
  resumo_capitulo_id: string;
  ordem: number;
  frente: string;
  verso: string;
  explicacao: string | null;
  exemplo: string | null;
  dica: string | null;
  area: string | null;
  materia: string | null;
  livro_titulo: string | null;
  capitulo_titulo: string | null;
};

// ============== Helper Gemini ==============
async function geminiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await geminiGenerateContent(
    "gemini-2.5-flash",
    {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.5,
        maxOutputTokens: 8192,
      },
    },
    { maxAttemptsPerKey: 2 },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini falhou [${res.status}]: ${t.slice(0, 300)}`);
  }
  const j: any = await res.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
}

function calcularQtdCards(palavras: number): number {
  // ~1 card a cada 250 palavras, mínimo 5, máximo 35
  const target = Math.round(palavras / 250);
  return Math.max(5, Math.min(35, target));
}

// ============== Admin: listagem ==============
export const listarLivrosParaFlashcardsCurados = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: isAdminData } = await supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdminData) throw new Error("Acesso negado");

    const { data: livros, error } = await supabaseAdmin
      .from("resumo_livros")
      .select("id, biblioteca_slug, livro_id, titulo, autor, capa, area, total_capitulos, capitulos_gerados, status")
      .in("status", ["concluido", "gerando"])
      .order("titulo", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (livros ?? []).map((l) => l.id);
    if (ids.length === 0) return [];

    const { data: jobs } = await supabaseAdmin
      .from("flashcards_curados_jobs")
      .select("*")
      .in("resumo_livro_id", ids);
    const jobsMap = new Map((jobs ?? []).map((j) => [j.resumo_livro_id, j]));

    return (livros ?? []).map((l) => ({
      ...l,
      job: jobsMap.get(l.id) ?? null,
    }));
  });

// ============== Admin: gerar para um capítulo ==============
const GerarCapInput = z.object({
  resumo_capitulo_id: z.string().uuid(),
});

export const gerarFlashcardsDoCapitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => GerarCapInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdminData } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdminData) throw new Error("Acesso negado");

    const { data: cap, error: capErr } = await supabaseAdmin
      .from("resumo_capitulos")
      .select("id, resumo_livro_id, ordem, titulo, slug, conteudo_markdown, status")
      .eq("id", data.resumo_capitulo_id)
      .maybeSingle();
    if (capErr || !cap) throw new Error("Capítulo não encontrado");
    if (cap.status !== "ok" || !cap.conteudo_markdown) {
      throw new Error("Capítulo sem conteúdo gerado");
    }

    const { data: livro } = await supabaseAdmin
      .from("resumo_livros")
      .select("id, titulo, area")
      .eq("id", cap.resumo_livro_id)
      .maybeSingle();

    const texto = cap.conteudo_markdown.slice(0, 12_000);
    const palavras = texto.split(/\s+/).length;
    const qtd = calcularQtdCards(palavras);

    const system = `Você é uma professora querida e didática, especialista em preparar estudantes para a OAB.
Crie flashcards intuitivos a partir do conteúdo de um capítulo de livro jurídico.

REGRAS:
- Cards atômicos (uma ideia por card). Sem repetições.
- Frente: pergunta clara e direta (até 200 caracteres).
- Verso: resposta curta e precisa (até 300 caracteres). Cite artigo/súmula quando relevante.
- Explicação: 2 a 4 frases acolhedoras explicando o porquê, em tom de professora querida.
- Exemplo: situação prática começando com "Imagine que…" ou "Por exemplo…", de até 400 caracteres.
- Dica: mnemônico curto, analogia ou macete (opcional, pode ser null).
- Português jurídico claro, sem jargão excessivo.

Responda SOMENTE com JSON válido no formato:
[{"frente":"...","verso":"...","explicacao":"...","exemplo":"...","dica":"... ou null"}]`;

    const user = `Área: ${livro?.area ?? "Direito"}
Livro: ${livro?.titulo ?? ""}
Capítulo: ${cap.titulo}

Crie ${qtd} flashcards a partir deste conteúdo:

${texto}`;

    const raw = await geminiJson(system, user);
    let parsed: Array<{
      frente: string;
      verso: string;
      explicacao?: string | null;
      exemplo?: string | null;
      dica?: string | null;
    }>;
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("não é array");
    } catch (e) {
      throw new Error(`Resposta inválida do Gemini: ${e instanceof Error ? e.message : "parse"}`);
    }

    const rows = parsed
      .filter((c) => c && typeof c.frente === "string" && typeof c.verso === "string")
      .slice(0, 35)
      .map((c, idx) => ({
        resumo_livro_id: cap.resumo_livro_id,
        resumo_capitulo_id: cap.id,
        ordem: idx,
        frente: c.frente.trim().slice(0, 800),
        verso: c.verso.trim().slice(0, 1200),
        explicacao: c.explicacao?.toString().trim().slice(0, 1500) || null,
        exemplo: c.exemplo?.toString().trim().slice(0, 1500) || null,
        dica: c.dica && c.dica !== "null" ? c.dica.toString().trim().slice(0, 500) : null,
        area: livro?.area ?? null,
        materia: livro?.area ?? null,
        livro_titulo: livro?.titulo ?? null,
        capitulo_titulo: cap.titulo,
      }));

    if (rows.length === 0) throw new Error("Gemini não retornou cards válidos");

    // Apaga cards antigos do mesmo capítulo (regerar é idempotente)
    await supabaseAdmin
      .from("flashcards_curados")
      .delete()
      .eq("resumo_capitulo_id", cap.id);

    const { error: insErr } = await supabaseAdmin.from("flashcards_curados").insert(rows);
    if (insErr) throw new Error(insErr.message);

    return { ok: true, criados: rows.length, ordem: cap.ordem, titulo: cap.titulo };
  });

// ============== Admin: iniciar/atualizar job de um livro ==============
const LivroInput = z.object({ resumo_livro_id: z.string().uuid() });

export const iniciarJobFlashcardsLivro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LivroInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdminData } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdminData) throw new Error("Acesso negado");

    const { count: total } = await supabaseAdmin
      .from("resumo_capitulos")
      .select("id", { count: "exact", head: true })
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("status", "ok");

    const totalCap = total ?? 0;
    if (totalCap === 0) throw new Error("Livro sem capítulos prontos");

    const { data: existing } = await supabaseAdmin
      .from("flashcards_curados_jobs")
      .select("id")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("flashcards_curados_jobs")
        .update({
          status: "gerando",
          total_capitulos: totalCap,
          capitulos_gerados: 0,
          total_cards: 0,
          erro_msg: null,
          gerado_por: context.userId,
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("flashcards_curados_jobs").insert({
        resumo_livro_id: data.resumo_livro_id,
        status: "gerando",
        total_capitulos: totalCap,
        capitulos_gerados: 0,
        total_cards: 0,
        gerado_por: context.userId,
      });
    }

    // Apaga todos os flashcards antigos do livro (regerar)
    await supabaseAdmin
      .from("flashcards_curados")
      .delete()
      .eq("resumo_livro_id", data.resumo_livro_id);

    return { ok: true, total: totalCap };
  });

// ============== Admin: gerar próximo capítulo pendente do livro ==============
export const gerarProximoCapituloFlashcards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LivroInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdminData } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdminData) throw new Error("Acesso negado");

    // pega job
    const { data: job } = await supabaseAdmin
      .from("flashcards_curados_jobs")
      .select("*")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .maybeSingle();
    if (!job) throw new Error("Job não iniciado");

    // pega próximo capítulo sem cards gerados
    const { data: capsProntos } = await supabaseAdmin
      .from("resumo_capitulos")
      .select("id, ordem, titulo")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("status", "ok")
      .order("ordem", { ascending: true });

    if (!capsProntos || capsProntos.length === 0) {
      await supabaseAdmin
        .from("flashcards_curados_jobs")
        .update({ status: "concluido" })
        .eq("id", job.id);
      return { done: true, ok: true };
    }

    // verifica quais capítulos já têm cards
    const { data: jaGerados } = await supabaseAdmin
      .from("flashcards_curados")
      .select("resumo_capitulo_id")
      .eq("resumo_livro_id", data.resumo_livro_id);
    const gerados = new Set((jaGerados ?? []).map((r) => r.resumo_capitulo_id));

    const proximo = capsProntos.find((c) => !gerados.has(c.id));
    if (!proximo) {
      // tudo gerado
      const { count } = await supabaseAdmin
        .from("flashcards_curados")
        .select("id", { count: "exact", head: true })
        .eq("resumo_livro_id", data.resumo_livro_id);
      await supabaseAdmin
        .from("flashcards_curados_jobs")
        .update({
          status: "concluido",
          capitulos_gerados: capsProntos.length,
          total_cards: count ?? 0,
        })
        .eq("id", job.id);
      return { done: true, ok: true };
    }

    try {
      // chama direto a lógica de geração (sem passar pela camada de fn)
      // reusa a mesma função internamente é mais complexo, vamos duplicar minimamente
      const { data: cap } = await supabaseAdmin
        .from("resumo_capitulos")
        .select("id, resumo_livro_id, ordem, titulo, slug, conteudo_markdown")
        .eq("id", proximo.id)
        .maybeSingle();
      if (!cap?.conteudo_markdown) throw new Error("Capítulo sem conteúdo");

      const { data: livro } = await supabaseAdmin
        .from("resumo_livros")
        .select("id, titulo, area")
        .eq("id", data.resumo_livro_id)
        .maybeSingle();

      const texto = cap.conteudo_markdown.slice(0, 12_000);
      const palavras = texto.split(/\s+/).length;
      const qtd = calcularQtdCards(palavras);

      const system = `Você é uma professora querida e didática, especialista em preparar estudantes para a OAB.
Crie flashcards intuitivos a partir do conteúdo de um capítulo de livro jurídico.

REGRAS:
- Cards atômicos (uma ideia por card). Sem repetições.
- Frente: pergunta clara e direta (até 200 caracteres).
- Verso: resposta curta e precisa (até 300 caracteres). Cite artigo/súmula quando relevante.
- Explicação: 2 a 4 frases acolhedoras explicando o porquê, em tom de professora querida.
- Exemplo: situação prática começando com "Imagine que…" ou "Por exemplo…", de até 400 caracteres.
- Dica: mnemônico curto, analogia ou macete (opcional, pode ser null).
- Português jurídico claro, sem jargão excessivo.

Responda SOMENTE com JSON válido no formato:
[{"frente":"...","verso":"...","explicacao":"...","exemplo":"...","dica":"... ou null"}]`;

      const user = `Área: ${livro?.area ?? "Direito"}
Livro: ${livro?.titulo ?? ""}
Capítulo: ${cap.titulo}

Crie ${qtd} flashcards a partir deste conteúdo:

${texto}`;

      const raw = await geminiJson(system, user);
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("resposta não é array");

      const rows = parsed
        .filter((c: any) => c && typeof c.frente === "string" && typeof c.verso === "string")
        .slice(0, 35)
        .map((c: any, idx: number) => ({
          resumo_livro_id: cap.resumo_livro_id,
          resumo_capitulo_id: cap.id,
          ordem: idx,
          frente: c.frente.trim().slice(0, 800),
          verso: c.verso.trim().slice(0, 1200),
          explicacao: c.explicacao?.toString().trim().slice(0, 1500) || null,
          exemplo: c.exemplo?.toString().trim().slice(0, 1500) || null,
          dica: c.dica && c.dica !== "null" ? c.dica.toString().trim().slice(0, 500) : null,
          area: livro?.area ?? null,
          materia: livro?.area ?? null,
          livro_titulo: livro?.titulo ?? null,
          capitulo_titulo: cap.titulo,
        }));

      if (rows.length === 0) throw new Error("Gemini retornou 0 cards");

      await supabaseAdmin
        .from("flashcards_curados")
        .delete()
        .eq("resumo_capitulo_id", cap.id);
      const { error: insErr } = await supabaseAdmin.from("flashcards_curados").insert(rows);
      if (insErr) throw new Error(insErr.message);

      const novosGerados = (job.capitulos_gerados ?? 0) + 1;
      const novosCards = (job.total_cards ?? 0) + rows.length;
      const restantes = capsProntos.length - novosGerados;

      await supabaseAdmin
        .from("flashcards_curados_jobs")
        .update({
          capitulos_gerados: novosGerados,
          total_cards: novosCards,
          total_capitulos: capsProntos.length,
          status: restantes === 0 ? "concluido" : "gerando",
        })
        .eq("id", job.id);

      return {
        ok: true,
        done: restantes === 0,
        ordem: cap.ordem,
        titulo: cap.titulo,
        criados: rows.length,
        restantes,
      };
    } catch (e: any) {
      await supabaseAdmin
        .from("flashcards_curados_jobs")
        .update({ status: "erro", erro_msg: e?.message ?? "erro" })
        .eq("id", job.id);
      throw e;
    }
  });

// ============== Admin: apagar flashcards de um livro ==============
export const apagarFlashcardsLivro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LivroInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdminData } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdminData) throw new Error("Acesso negado");

    await supabaseAdmin
      .from("flashcards_curados")
      .delete()
      .eq("resumo_livro_id", data.resumo_livro_id);
    await supabaseAdmin
      .from("flashcards_curados_jobs")
      .delete()
      .eq("resumo_livro_id", data.resumo_livro_id);

    return { ok: true };
  });

// ============== Público: listar áreas ==============
export const listarAreasFlashcardsCurados = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data, error } = await supabaseAdmin
      .from("flashcards_curados")
      .select("area")
      .not("area", "is", null);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of data ?? []) {
      const a = r.area as string;
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([area, total]) => ({ area, total }))
      .sort((a, b) => a.area.localeCompare(b.area));
  },
);

// ============== Público: listar livros de uma área ==============
const AreaInput = z.object({ area: z.string().min(1).max(200) });
export const listarLivrosDaAreaFlashcards = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => AreaInput.parse(input))
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("flashcards_curados")
      .select("resumo_livro_id, livro_titulo")
      .eq("area", data.area);
    if (error) throw new Error(error.message);

    const map = new Map<string, { id: string; titulo: string; total: number }>();
    for (const r of rows ?? []) {
      const cur = map.get(r.resumo_livro_id) ?? {
        id: r.resumo_livro_id,
        titulo: r.livro_titulo ?? "Sem título",
        total: 0,
      };
      cur.total++;
      map.set(r.resumo_livro_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.titulo.localeCompare(b.titulo));
  });

// ============== Público: listar capítulos de um livro ==============
export const listarCapitulosFlashcards = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ resumo_livro_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("flashcards_curados")
      .select("resumo_capitulo_id, capitulo_titulo")
      .eq("resumo_livro_id", data.resumo_livro_id);
    if (error) throw new Error(error.message);

    const map = new Map<string, { id: string; titulo: string; total: number }>();
    for (const r of rows ?? []) {
      const cur = map.get(r.resumo_capitulo_id) ?? {
        id: r.resumo_capitulo_id,
        titulo: r.capitulo_titulo ?? "Capítulo",
        total: 0,
      };
      cur.total++;
      map.set(r.resumo_capitulo_id, cur);
    }
    // ordem via resumo_capitulos
    const ids = Array.from(map.keys());
    if (ids.length === 0) return [];
    const { data: ord } = await supabaseAdmin
      .from("resumo_capitulos")
      .select("id, ordem")
      .in("id", ids);
    const ordemMap = new Map((ord ?? []).map((c) => [c.id, c.ordem]));
    return Array.from(map.values())
      .map((v) => ({ ...v, ordem: ordemMap.get(v.id) ?? 0 }))
      .sort((a, b) => a.ordem - b.ordem);
  });

// ============== Público: listar cards de um capítulo ==============
export const listarCardsDoCapitulo = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ resumo_capitulo_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("flashcards_curados")
      .select("*")
      .eq("resumo_capitulo_id", data.resumo_capitulo_id)
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as FlashcardCurado[];
  });

// ============== Público: listar todos cards de uma área (modo navegação livre) ==============
export const listarCardsDaArea = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ area: z.string().min(1).max(200), limit: z.number().int().min(1).max(500).default(200) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("flashcards_curados")
      .select("*")
      .eq("area", data.area)
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return (rows ?? []) as FlashcardCurado[];
  });
