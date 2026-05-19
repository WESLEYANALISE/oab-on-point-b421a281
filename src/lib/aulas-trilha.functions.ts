import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { geminiGenerateContent } from "@/lib/gemini.server";

const MODEL = "gemini-2.5-flash";

// ---------- tipos ----------
export type Flashcard = { frente: string; verso: string; exemplo?: string };
export type Questao = {
  enunciado: string;
  alternativas: { A: string; B: string; C: string; D: string; E: string };
  correta: "A" | "B" | "C" | "D" | "E";
  justificativa: string;
};

export type AulaParte = {
  titulo: string;
  resumo_curto?: string;
  conteudo_markdown: string;
  exemplo_pratico?: string;
  pontos_chave?: string[];
};
export type AulaEstruturada = {
  introducao: string;
  partes: AulaParte[];
  fechamento?: string;
};

async function getCapitulo(resumo_livro_id: string, ordem: number) {
  const { data, error } = await supabaseAdmin
    .from("resumo_capitulos")
    .select("id, titulo, conteudo_markdown")
    .eq("resumo_livro_id", resumo_livro_id)
    .eq("ordem", ordem)
    .maybeSingle();
  if (error || !data) throw new Error("Capítulo não encontrado");
  return data;
}

async function getMateriaDoLivro(resumo_livro_id: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("resumo_livros")
    .select("area")
    .eq("id", resumo_livro_id)
    .maybeSingle();
  return data?.area ?? null;
}

async function chamarGeminiJson(system: string, user: string, maxTokens = 6000): Promise<any> {
  const res = await geminiGenerateContent(MODEL, {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const json: any = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "{}";
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("IA devolveu JSON inválido");
  }
}

// ====================================================================
// FLASHCARDS — cache por capítulo
// ====================================================================

export const obterFlashcardsCapitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      resumo_livro_id: z.string().uuid(),
      ordem: z.number().int().min(1).max(999),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const existente = await supabaseAdmin
      .from("aula_capitulo_flashcards")
      .select("cards")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("ordem", data.ordem)
      .maybeSingle();

    if (existente.data) {
      return { cards: existente.data.cards as Flashcard[] };
    }

    const cap = await getCapitulo(data.resumo_livro_id, data.ordem);
    const conteudo = (cap.conteudo_markdown ?? "").slice(0, 6000);

    const system =
      "Você gera flashcards de estudo para concursos jurídicos brasileiros (OAB). " +
      'Devolva APENAS JSON no formato {"cards":[{"frente":"...","verso":"...","exemplo":"..."}]}. ' +
      "Frente: uma pergunta objetiva e clara (uma frase). " +
      "Verso: resposta direta em 1 a 3 frases, com fundamento legal quando pertinente. " +
      "Exemplo: um caso prático curto (2 a 4 frases) que ilustre a aplicação concreta do conceito, no estilo enunciado de prova OAB. " +
      "Gere EXATAMENTE 10 cards cobrindo os pontos mais importantes do capítulo. Sem markdown.";
    const user = `Capítulo: ${cap.titulo}\n\nConteúdo:\n${conteudo}`;

    const parsed = await chamarGeminiJson(system, user, 6000);
    const cards: Flashcard[] = (parsed?.cards ?? [])
      .filter((c: any) => c?.frente && c?.verso)
      .slice(0, 12);
    if (!cards.length) throw new Error("IA não gerou flashcards");

    await supabaseAdmin
      .from("aula_capitulo_flashcards")
      .upsert(
        { resumo_livro_id: data.resumo_livro_id, ordem: data.ordem, cards },
        { onConflict: "resumo_livro_id,ordem" },
      );
    return { cards };
  });

// ====================================================================
// QUESTÕES — cache por capítulo
// ====================================================================

export const obterQuestoesCapitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      resumo_livro_id: z.string().uuid(),
      ordem: z.number().int().min(1).max(999),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const existente = await supabaseAdmin
      .from("aula_capitulo_questoes")
      .select("questoes")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("ordem", data.ordem)
      .maybeSingle();

    if (existente.data) {
      return { questoes: existente.data.questoes as Questao[] };
    }

    const cap = await getCapitulo(data.resumo_livro_id, data.ordem);
    const conteudo = (cap.conteudo_markdown ?? "").slice(0, 6000);

    const system =
      "Você é examinador estilo FGV / OAB 1ª fase, em português do Brasil. " +
      'Devolva APENAS JSON no formato {"questoes":[{"enunciado":"...","alternativas":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correta":"A","justificativa":"..."}]}. ' +
      "Gere EXATAMENTE 5 questões de múltipla escolha (A–E) sobre o capítulo. " +
      "Enunciado: 3 a 6 linhas, com caso prático quando possível. " +
      "Apenas UMA alternativa correta. Justificativa: 2-4 frases com fundamento.";
    const user = `Capítulo: ${cap.titulo}\n\nConteúdo:\n${conteudo}`;

    const parsed = await chamarGeminiJson(system, user, 8000);
    const questoes: Questao[] = (parsed?.questoes ?? [])
      .filter(
        (q: any) =>
          q?.enunciado && q?.alternativas?.A && q?.alternativas?.B && q?.correta,
      )
      .slice(0, 5);
    if (!questoes.length) throw new Error("IA não gerou questões");

    await supabaseAdmin
      .from("aula_capitulo_questoes")
      .upsert(
        { resumo_livro_id: data.resumo_livro_id, ordem: data.ordem, questoes },
        { onConflict: "resumo_livro_id,ordem" },
      );
    return { questoes };
  });

// ====================================================================
// REGISTRAR RESPOSTA
// ====================================================================

export const registrarRespostaCapitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      resumo_livro_id: z.string().uuid(),
      ordem: z.number().int().min(1).max(999),
      questao_idx: z.number().int().min(0).max(50),
      alternativa_escolhida: z.string().min(1).max(2),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const qCache = await supabaseAdmin
      .from("aula_capitulo_questoes")
      .select("questoes")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("ordem", data.ordem)
      .maybeSingle();
    if (!qCache.data) throw new Error("Questões não encontradas");
    const lista = qCache.data.questoes as Questao[];
    const q = lista[data.questao_idx];
    if (!q) throw new Error("Questão inexistente");

    const acertou = data.alternativa_escolhida.toUpperCase() === q.correta;
    const materia = await getMateriaDoLivro(data.resumo_livro_id);

    const { error } = await supabase.from("aula_capitulo_respostas").insert({
      user_id: userId,
      resumo_livro_id: data.resumo_livro_id,
      ordem: data.ordem,
      questao_idx: data.questao_idx,
      alternativa_escolhida: data.alternativa_escolhida.toUpperCase(),
      alternativa_correta: q.correta,
      acertou,
      enunciado_snapshot: q.enunciado,
      alternativas_snapshot: q.alternativas,
      justificativa_snapshot: q.justificativa,
      materia,
    });
    if (error) throw new Error(error.message);

    return { acertou, correta: q.correta, justificativa: q.justificativa };
  });

// ====================================================================
// CADERNO DE ERROS
// ====================================================================

export const listarCadernoErros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // pega só a última resposta por (livro, ordem, questao_idx)
    const { data: rows, error } = await supabase
      .from("aula_capitulo_respostas")
      .select(
        "id, resumo_livro_id, ordem, questao_idx, alternativa_escolhida, alternativa_correta, acertou, enunciado_snapshot, alternativas_snapshot, justificativa_snapshot, materia, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const seen = new Set<string>();
    const erros: typeof rows = [];
    for (const r of rows ?? []) {
      const k = `${r.resumo_livro_id}:${r.ordem}:${r.questao_idx}`;
      if (seen.has(k)) continue;
      seen.add(k);
      if (!r.acertou) erros.push(r);
    }

    // hidrata título do livro
    const livroIds = Array.from(new Set(erros.map((e) => e.resumo_livro_id)));
    let livrosMap: Record<string, { titulo: string; area: string | null }> = {};
    if (livroIds.length) {
      const { data: livros } = await supabaseAdmin
        .from("resumo_livros")
        .select("id, titulo, area")
        .in("id", livroIds);
      livrosMap = Object.fromEntries(
        (livros ?? []).map((l: any) => [l.id, { titulo: l.titulo, area: l.area }]),
      );
    }

    return {
      erros: erros.map((e) => ({
        ...e,
        livro_titulo: livrosMap[e.resumo_livro_id]?.titulo ?? "Tema",
        materia: e.materia ?? livrosMap[e.resumo_livro_id]?.area ?? null,
      })),
    };
  });

// ====================================================================
// SIMULADO DO CAPÍTULO — 10 questões, cache por capítulo
// ====================================================================

export const obterSimuladoCapitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      resumo_livro_id: z.string().uuid(),
      ordem: z.number().int().min(1).max(999),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const existente = await supabaseAdmin
      .from("aula_capitulo_simulado")
      .select("questoes")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("ordem", data.ordem)
      .maybeSingle();

    if (existente.data) {
      return { questoes: existente.data.questoes as Questao[] };
    }

    const cap = await getCapitulo(data.resumo_livro_id, data.ordem);
    const conteudo = (cap.conteudo_markdown ?? "").slice(0, 6000);

    const system =
      "Você é examinador estilo FGV / OAB 1ª fase, em português do Brasil. " +
      'Devolva APENAS JSON no formato {"questoes":[{"enunciado":"...","alternativas":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"correta":"A","justificativa":"..."}]}. ' +
      "Gere EXATAMENTE 10 questões de múltipla escolha (A–E) simulando prova OAB sobre o capítulo. " +
      "Varie os temas dentro do capítulo. Enunciado: 3 a 6 linhas, com caso prático. " +
      "Apenas UMA alternativa correta. Justificativa: 2-4 frases com fundamento legal.";
    const user = `Capítulo: ${cap.titulo}\n\nConteúdo:\n${conteudo}`;

    const parsed = await chamarGeminiJson(system, user, 14000);
    const questoes: Questao[] = (parsed?.questoes ?? [])
      .filter(
        (q: any) =>
          q?.enunciado && q?.alternativas?.A && q?.alternativas?.B && q?.correta,
      )
      .slice(0, 10);
    if (!questoes.length) throw new Error("IA não gerou simulado");

    await supabaseAdmin
      .from("aula_capitulo_simulado")
      .upsert(
        { resumo_livro_id: data.resumo_livro_id, ordem: data.ordem, questoes },
        { onConflict: "resumo_livro_id,ordem" },
      );
    return { questoes };
  });

// ====================================================================
// AULA ESTRUTURADA — cache por capítulo
// ====================================================================

export const gerarAulaCapitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      resumo_livro_id: z.string().uuid(),
      ordem: z.number().int().min(1).max(999),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const existente = await supabaseAdmin
      .from("aula_capitulo_aulas")
      .select("aula")
      .eq("resumo_livro_id", data.resumo_livro_id)
      .eq("ordem", data.ordem)
      .maybeSingle();

    if (existente.data) {
      return { aula: existente.data.aula as AulaEstruturada };
    }

    const cap = await getCapitulo(data.resumo_livro_id, data.ordem);
    const conteudo = (cap.conteudo_markdown ?? "").slice(0, 8000);

    const system =
      "Você é um professor brasileiro experiente preparando alunos para a OAB. " +
      "Seu tom é ao mesmo tempo AMIGÁVEL e TÉCNICO: você fala com o aluno como se estivesse em sala, " +
      'usa "você", cumprimenta no começo, explica tim-tim por tim-tim, dá exemplos práticos do dia a dia jurídico, ' +
      "cita fundamento legal (lei + artigo) sempre que pertinente, e nunca é arrogante. " +
      "Você NÃO está apenas resumindo um livro — está construindo uma AULA estruturada a partir do material-base. " +
      "Devolva APENAS JSON estritamente no formato: " +
      '{"introducao":"...","partes":[{"titulo":"...","resumo_curto":"...","conteudo_markdown":"...","exemplo_pratico":"...","pontos_chave":["...","..."]}],"fechamento":"..."}. ' +
      "Regras: " +
      "• introducao: 2–4 frases, com uma saudação curta (ex.: 'Vamos lá!') e por que essa aula importa para a OAB. " +
      "• partes: entre 3 e 6 partes, divididas por tema lógico do capítulo. Cada parte deve ter: " +
      "   - titulo: nome curto (até 6 palavras). " +
      "   - resumo_curto: 1 frase do que será visto. " +
      "   - conteudo_markdown: explicação didática completa, em markdown simples (parágrafos, **negritos**, listas quando ajudar). Use linguagem clara, defina termos, " +
      "     traga fundamento legal e dicas de prova. Sem títulos H1/H2 (o título da parte já é renderizado fora). " +
      "   - exemplo_pratico: 2–4 frases de caso concreto estilo enunciado de OAB que ilustre o conceito. " +
      "   - pontos_chave: 3 a 5 bullets curtos (frases ou expressões) com o que NÃO pode esquecer. " +
      "• fechamento: 1–3 frases amarrando a aula e convidando o aluno a praticar nos flashcards/questões a seguir. " +
      "Não use emojis. Não envolva o JSON em ```.";
    const user = `Capítulo: ${cap.titulo}\n\nMaterial-base (use como insumo, NÃO copie como resumo):\n${conteudo}`;

    const parsed = await chamarGeminiJson(system, user, 16000);
    const partes: AulaParte[] = (parsed?.partes ?? [])
      .filter((p: any) => p?.titulo && p?.conteudo_markdown)
      .slice(0, 8)
      .map((p: any) => ({
        titulo: String(p.titulo),
        resumo_curto: p.resumo_curto ? String(p.resumo_curto) : undefined,
        conteudo_markdown: String(p.conteudo_markdown),
        exemplo_pratico: p.exemplo_pratico ? String(p.exemplo_pratico) : undefined,
        pontos_chave: Array.isArray(p.pontos_chave)
          ? p.pontos_chave.map((b: any) => String(b)).slice(0, 6)
          : undefined,
      }));
    if (!partes.length) throw new Error("IA não gerou aula");

    const aula: AulaEstruturada = {
      introducao: String(parsed?.introducao ?? "Vamos começar?"),
      partes,
      fechamento: parsed?.fechamento ? String(parsed.fechamento) : undefined,
    };

    await supabaseAdmin
      .from("aula_capitulo_aulas")
      .upsert(
        { resumo_livro_id: data.resumo_livro_id, ordem: data.ordem, aula },
        { onConflict: "resumo_livro_id,ordem" },
      );
    return { aula };
  });
