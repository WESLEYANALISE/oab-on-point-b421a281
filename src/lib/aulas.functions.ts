import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { geminiGenerateContent, geminiStreamContent } from "@/lib/gemini.server";
import { getSubtemaAula, PASSOS_AULA, type PassoKey } from "@/data/aulas-oab";

const MODEL_TEXT = "gemini-2.5-flash";
const MODEL_JSON = "gemini-2.5-flash";

// ====================================================================
// 1) Contexto + progresso
// ====================================================================

export const getSubtemaContexto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ subtemaSlug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ref = getSubtemaAula(data.subtemaSlug);
    if (!ref) throw new Error("Subtema não encontrado");

    let resumoMarkdown: string | null = null;
    let resumoTitulo: string | null = null;
    if (ref.subtema.resumoLivroId && ref.subtema.capituloOrdem) {
      const { data: cap } = await supabaseAdmin
        .from("resumo_capitulos")
        .select("titulo, conteudo_markdown")
        .eq("resumo_livro_id", ref.subtema.resumoLivroId)
        .eq("ordem", ref.subtema.capituloOrdem)
        .maybeSingle();
      if (cap) { resumoMarkdown = cap.conteudo_markdown ?? null; resumoTitulo = cap.titulo ?? null; }
    }

    const { data: prog } = await supabase
      .from("aulas_progresso")
      .select("passo_atual, passos_concluidos")
      .eq("user_id", userId)
      .eq("subtema_slug", data.subtemaSlug)
      .maybeSingle();

    return {
      materia: { id: ref.materia.materiaId, nome: ref.materia.nome, emoji: ref.materia.emoji, cor: ref.materia.cor },
      modulo: { slug: ref.modulo.slug, titulo: ref.modulo.titulo, nivel: ref.modulo.nivel },
      subtema: { slug: ref.subtema.slug, titulo: ref.subtema.titulo, index: ref.index, topicos: ref.subtema.topicos ?? [] },
      resumo: { titulo: resumoTitulo, markdown: resumoMarkdown },
      progresso: {
        passoAtual: prog?.passo_atual ?? 1,
        passosConcluidos: (prog?.passos_concluidos as string[] | null) ?? [],
      },
    };
  });

export const concluirPasso = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      subtemaSlug: z.string().min(1).max(120),
      passo: z.enum(["resumo","flashcards","rodada1","erros1","rodada2","simulado","erros_sim","feedback"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: cur } = await supabase
      .from("aulas_progresso")
      .select("passos_concluidos, passo_atual")
      .eq("user_id", userId).eq("subtema_slug", data.subtemaSlug).maybeSingle();

    const concluidos: string[] = Array.from(new Set([...(cur?.passos_concluidos as string[] | null ?? []), data.passo]));
    const passoIdx = PASSOS_AULA.find((p) => p.key === data.passo)?.n ?? 1;
    const passoAtual = Math.max(cur?.passo_atual ?? 1, Math.min(passoIdx + 1, PASSOS_AULA.length));

    const { error } = await supabase
      .from("aulas_progresso")
      .upsert({ user_id: userId, subtema_slug: data.subtemaSlug, passo_atual: passoAtual, passos_concluidos: concluidos }, { onConflict: "user_id,subtema_slug" });
    if (error) throw new Error(error.message);
    return { ok: true, passoAtual, concluidos };
  });

// ====================================================================
// 2) Explicação IA (streaming)
// ====================================================================

export const streamExplicacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      subtemaSlug: z.string().min(1).max(120),
      modo: z.enum(["melhor", "exemplo", "simples"]),
      trecho: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async function* ({ data }) {
    const ref = getSubtemaAula(data.subtemaSlug);
    if (!ref) throw new Error("Subtema não encontrado");

    let contexto = "";
    if (ref.subtema.resumoLivroId && ref.subtema.capituloOrdem) {
      const { data: cap } = await supabaseAdmin
        .from("resumo_capitulos")
        .select("titulo, conteudo_markdown")
        .eq("resumo_livro_id", ref.subtema.resumoLivroId)
        .eq("ordem", ref.subtema.capituloOrdem).maybeSingle();
      if (cap) contexto = (cap.conteudo_markdown ?? "").slice(0, 5000);
    }
    if (data.trecho) contexto = `Trecho selecionado:\n${data.trecho}\n\n${contexto}`;

    const systemBase = "Você é um professor de Direito brasileiro, didático, voltado a aprovar alunos na OAB 1ª fase. Responda em português do Brasil, com markdown (## subtítulos, **negrito** nos pontos-chave, > blockquotes em citações de lei). Nunca corte no meio de frase.";
    const instrucoes: Record<string, string> = {
      melhor: "Explique com profundidade o tema deste subtema. Estruture em 3 a 5 seções (## subtítulos): introdução, fundamento legal, classificação/divisões, exemplos práticos, pegadinhas de prova. Cite súmulas e artigos quando relevante. Mínimo 500 palavras.",
      exemplo: "Construa UM exemplo prático completo e contextualizado, como um caso real de advocacia ou questão da OAB. Use a estrutura ## Caso, ## Análise, ## Conclusão (com a regra extraída). Não repita teoria; aplique.",
      simples: "Reescreva o conteúdo em LINGUAGEM SIMPLES, como se explicasse a alguém sem formação jurídica. Use analogias do dia a dia, frases curtas. Evite jargão. Estrutura: ## A ideia central, ## Como funciona na prática, ## Por que isso cai na prova.",
    };

    const userPrompt = `Subtema: ${ref.subtema.titulo}\nMatéria: ${ref.materia.nome}\nMódulo: ${ref.modulo.titulo}\n\nContexto do resumo (apoio):\n${contexto || "(sem resumo escrito; use seu conhecimento técnico do edital OAB)"}\n\nTarefa: ${instrucoes[data.modo]}`;

    const res = await geminiStreamContent(MODEL_TEXT, {
      system_instruction: { parts: [{ text: systemBase }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      throw new Error(`Gemini falhou (${res.status}): ${t.slice(0, 200)}`);
    }

    const decoder = new TextDecoder();
    let buf = "";
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      buf += decoder.decode(chunk, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload);
          const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "";
          if (text) yield { delta: text };
        } catch { /* ignora chunk malformado */ }
      }
    }
  });

// ====================================================================
// 3) Flashcards do subtema (idempotente)
// ====================================================================

export const garantirFlashcardsSubtema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ subtemaSlug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ref = getSubtemaAula(data.subtemaSlug);
    if (!ref) throw new Error("Subtema não encontrado");

    const { data: existentes } = await supabase
      .from("flashcards")
      .select("id, frente, verso, due_at, state")
      .eq("user_id", userId)
      .eq("fonte_tipo", "aula_subtema")
      .eq("fonte_id", data.subtemaSlug);
    if ((existentes ?? []).length >= 6) return { cards: existentes ?? [], gerados: 0 };

    // gera com IA
    let conteudo = "";
    if (ref.subtema.resumoLivroId && ref.subtema.capituloOrdem) {
      const { data: cap } = await supabaseAdmin.from("resumo_capitulos")
        .select("conteudo_markdown")
        .eq("resumo_livro_id", ref.subtema.resumoLivroId)
        .eq("ordem", ref.subtema.capituloOrdem).maybeSingle();
      conteudo = (cap?.conteudo_markdown ?? "").slice(0, 4500);
    }

    const system = "Você gera flashcards de revisão para o exame da OAB em português do Brasil. Devolva APENAS JSON válido no formato {\"cards\":[{\"frente\":\"...\",\"verso\":\"...\"}]}. Frente: pergunta objetiva (uma frase). Verso: resposta direta, 1 a 3 frases, com fundamento legal quando pertinente. Gere EXATAMENTE 10 cards. Sem markdown, sem comentários.";
    const user = `Matéria: ${ref.materia.nome}\nSubtema: ${ref.subtema.titulo}\nTópicos: ${(ref.subtema.topicos ?? []).join("; ") || "—"}\n\nConteúdo de apoio:\n${conteudo || "(use seu conhecimento OAB)"}`;

    const res = await geminiGenerateContent(MODEL_JSON, {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 4096, responseMimeType: "application/json" },
    });
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const j: any = await res.json();
    const raw = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "{}";
    let parsed: { cards?: { frente: string; verso: string }[] } = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const cards = (parsed.cards ?? []).filter((c) => c?.frente && c?.verso).slice(0, 12);
    if (cards.length === 0) throw new Error("IA não gerou flashcards");

    const rows = cards.map((c) => ({
      user_id: userId,
      frente: c.frente,
      verso: c.verso,
      materia: ref.materia.nome,
      fonte_tipo: "aula_subtema",
      fonte_id: data.subtemaSlug,
    }));
    const { data: ins, error } = await supabase.from("flashcards").insert(rows).select("id, frente, verso, due_at, state");
    if (error) throw new Error(error.message);
    return { cards: ins ?? [], gerados: ins?.length ?? 0 };
  });

// ====================================================================
// 4) Questões (real + IA quando faltar)
// ====================================================================

type QuestaoUI = {
  id: string;
  fonte: "real" | "gerada";
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  resposta_correta: string;
  justificativa: string | null;
};

async function buscarQuestoesReais(materiaNome: string, alvo: number): Promise<QuestaoUI[]> {
  // tenta filtrar por matéria; se vier menos que `alvo`, faz fallback amplo
  const { data: q1 } = await supabaseAdmin
    .from("simulado_questoes")
    .select("id, enunciado, alternativas, resposta_correta, justificativa, materia")
    .eq("status", "ok")
    .ilike("materia", `%${materiaNome.replace(/^Direito\s+/i, "")}%`)
    .limit(alvo * 2);
  const lista = (q1 ?? []).filter((q: any) => q.resposta_correta);
  // embaralha leve
  for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
  return lista.slice(0, alvo).map((q: any) => ({
    id: q.id,
    fonte: "real" as const,
    enunciado: q.enunciado,
    alternativas: Object.entries((q.alternativas ?? {}) as Record<string, string>).map(([letra, texto]) => ({ letra, texto })),
    resposta_correta: q.resposta_correta,
    justificativa: q.justificativa ?? null,
  }));
}

async function gerarQuestoesIA(subtemaSlug: string, materiaNome: string, subtemaTitulo: string, contextoResumo: string, quantidade: number, tipo: "rodada" | "simulado"): Promise<QuestaoUI[]> {
  const system = "Você é examinador da FGV gerando questões para OAB 1ª fase em português. Devolva APENAS JSON válido no formato {\"questoes\":[{\"enunciado\":\"...\",\"alternativas\":{\"A\":\"...\",\"B\":\"...\",\"C\":\"...\",\"D\":\"...\"},\"correta\":\"A\",\"justificativa\":\"...\"}]}. Enunciado: 4-8 linhas com caso prático. 4 alternativas A-D plausíveis. Justificativa: 2-4 frases com fundamento legal/jurisprudência. Sem markdown.";
  const user = `Matéria: ${materiaNome}\nSubtema: ${subtemaTitulo}\nQuantidade: ${quantidade}\nNível: ${tipo === "simulado" ? "prova real OAB" : "estudo dirigido"}\n\nConteúdo de apoio:\n${contextoResumo.slice(0, 4000) || "(use seu conhecimento do edital OAB)"}`;
  const res = await geminiGenerateContent(MODEL_JSON, {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 8192, responseMimeType: "application/json" },
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const j: any = await res.json();
  const raw = j?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("") ?? "{}";
  let parsed: any = {}; try { parsed = JSON.parse(raw); } catch { parsed = {}; }
  const questoes: any[] = parsed?.questoes ?? [];
  if (!questoes.length) throw new Error("IA não gerou questões");

  const toInsert = questoes.slice(0, quantidade).map((q) => ({
    subtema_slug: subtemaSlug,
    materia: materiaNome,
    tipo,
    enunciado: String(q.enunciado ?? ""),
    alternativas: q.alternativas ?? {},
    resposta_correta: String(q.correta ?? "A").toUpperCase(),
    justificativa: String(q.justificativa ?? ""),
  })).filter((q) => q.enunciado && q.alternativas);

  const { data: ins, error } = await supabaseAdmin.from("aulas_questoes_geradas").insert(toInsert).select("*");
  if (error) throw new Error(error.message);
  return (ins ?? []).map((q: any) => ({
    id: q.id, fonte: "gerada" as const, enunciado: q.enunciado,
    alternativas: Object.entries((q.alternativas ?? {}) as Record<string, string>).map(([letra, texto]) => ({ letra, texto })),
    resposta_correta: q.resposta_correta, justificativa: q.justificativa,
  }));
}

export const montarRodada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      subtemaSlug: z.string().min(1).max(120),
      tipo: z.enum(["rodada1", "rodada2", "simulado"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ref = getSubtemaAula(data.subtemaSlug);
    if (!ref) throw new Error("Subtema não encontrado");

    // Rodada 2 = só as erradas da rodada 1
    if (data.tipo === "rodada2") {
      const { data: ultima } = await supabase
        .from("aulas_tentativas")
        .select("respostas")
        .eq("user_id", userId).eq("subtema_slug", data.subtemaSlug).eq("passo", "rodada1")
        .order("concluido_em", { ascending: false }).limit(1).maybeSingle();
      const respostas: any[] = (ultima?.respostas as any[]) ?? [];
      const errados = respostas.filter((r) => !r.correta);
      if (errados.length === 0) return { questoes: [] as QuestaoUI[] };

      // re-hidrata enunciados das erradas
      const idsReais = errados.filter((e) => e.fonte === "real").map((e) => e.questao_id);
      const idsGer = errados.filter((e) => e.fonte === "gerada").map((e) => e.questao_id);
      const [{ data: qr }, { data: qg }] = await Promise.all([
        idsReais.length ? supabaseAdmin.from("simulado_questoes").select("id, enunciado, alternativas, resposta_correta, justificativa").in("id", idsReais) : { data: [] as any[] },
        idsGer.length ? supabaseAdmin.from("aulas_questoes_geradas").select("id, enunciado, alternativas, resposta_correta, justificativa").in("id", idsGer) : { data: [] as any[] },
      ]);
      const merged: QuestaoUI[] = [
        ...((qr as any[]) ?? []).map((q) => ({ id: q.id, fonte: "real" as const, enunciado: q.enunciado, alternativas: Object.entries((q.alternativas ?? {}) as Record<string, string>).map(([letra, texto]) => ({ letra, texto })), resposta_correta: q.resposta_correta, justificativa: q.justificativa })),
        ...((qg as any[]) ?? []).map((q) => ({ id: q.id, fonte: "gerada" as const, enunciado: q.enunciado, alternativas: Object.entries((q.alternativas ?? {}) as Record<string, string>).map(([letra, texto]) => ({ letra, texto })), resposta_correta: q.resposta_correta, justificativa: q.justificativa })),
      ];
      return { questoes: merged };
    }

    const alvo = data.tipo === "simulado" ? 12 : 8;

    // 1) tenta reusar geradas
    const { data: jaGeradas } = await supabaseAdmin
      .from("aulas_questoes_geradas")
      .select("id, enunciado, alternativas, resposta_correta, justificativa")
      .eq("subtema_slug", data.subtemaSlug)
      .eq("tipo", data.tipo === "simulado" ? "simulado" : "rodada")
      .limit(alvo);

    const geradas: QuestaoUI[] = ((jaGeradas as any[]) ?? []).map((q) => ({
      id: q.id, fonte: "gerada" as const, enunciado: q.enunciado,
      alternativas: Object.entries((q.alternativas ?? {}) as Record<string, string>).map(([letra, texto]) => ({ letra, texto })),
      resposta_correta: q.resposta_correta, justificativa: q.justificativa,
    }));

    // 2) completa com reais quando possível
    const restantes = Math.max(0, alvo - geradas.length);
    const reais = restantes > 0 ? await buscarQuestoesReais(ref.materia.nome, restantes) : [];
    const usadas = [...geradas, ...reais];

    // 3) ainda faltou? gera com IA
    if (usadas.length < alvo) {
      let contexto = "";
      if (ref.subtema.resumoLivroId && ref.subtema.capituloOrdem) {
        const { data: cap } = await supabaseAdmin.from("resumo_capitulos")
          .select("conteudo_markdown")
          .eq("resumo_livro_id", ref.subtema.resumoLivroId)
          .eq("ordem", ref.subtema.capituloOrdem).maybeSingle();
        contexto = cap?.conteudo_markdown ?? "";
      }
      try {
        const novas = await gerarQuestoesIA(
          data.subtemaSlug, ref.materia.nome, ref.subtema.titulo, contexto,
          alvo - usadas.length, data.tipo === "simulado" ? "simulado" : "rodada",
        );
        usadas.push(...novas);
      } catch (e) {
        // segue com o que tem
      }
    }

    return { questoes: usadas.slice(0, alvo) };
  });

// ====================================================================
// 5) Tentativa
// ====================================================================

export const registrarTentativa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      subtemaSlug: z.string().min(1).max(120),
      passo: z.enum(["rodada1", "rodada2", "simulado"]),
      respostas: z.array(z.object({
        questao_id: z.string(),
        fonte: z.enum(["real", "gerada"]),
        marcada: z.string(),
        correta: z.boolean(),
      })).min(1).max(50),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const total = data.respostas.length;
    const acertos = data.respostas.filter((r) => r.correta).length;
    const { data: ins, error } = await supabase.from("aulas_tentativas").insert({
      user_id: userId, subtema_slug: data.subtemaSlug, passo: data.passo,
      respostas: data.respostas, acertos, total,
      iniciado_em: new Date().toISOString(),
      concluido_em: new Date().toISOString(),
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id, acertos, total };
  });

// ====================================================================
// 6) Caderno de erros do subtema (rodada ou simulado)
// ====================================================================

export const getCadernoErrosSubtema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      subtemaSlug: z.string().min(1).max(120),
      origem: z.enum(["rodada1", "simulado"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ultima } = await supabase
      .from("aulas_tentativas")
      .select("respostas, acertos, total, concluido_em")
      .eq("user_id", userId).eq("subtema_slug", data.subtemaSlug).eq("passo", data.origem)
      .order("concluido_em", { ascending: false }).limit(1).maybeSingle();
    const respostas: any[] = (ultima?.respostas as any[]) ?? [];
    const errados = respostas.filter((r) => !r.correta);
    if (errados.length === 0) return { erros: [], total: ultima?.total ?? 0, acertos: ultima?.acertos ?? 0 };

    const idsReais = errados.filter((e) => e.fonte === "real").map((e) => e.questao_id);
    const idsGer = errados.filter((e) => e.fonte === "gerada").map((e) => e.questao_id);
    const [{ data: qr }, { data: qg }] = await Promise.all([
      idsReais.length ? supabaseAdmin.from("simulado_questoes").select("id, enunciado, alternativas, resposta_correta, justificativa").in("id", idsReais) : { data: [] as any[] },
      idsGer.length ? supabaseAdmin.from("aulas_questoes_geradas").select("id, enunciado, alternativas, resposta_correta, justificativa").in("id", idsGer) : { data: [] as any[] },
    ]);
    const map = new Map<string, any>();
    for (const q of [...((qr as any[]) ?? []), ...((qg as any[]) ?? [])]) map.set(q.id, q);

    const erros = errados.map((e) => {
      const q = map.get(e.questao_id);
      return {
        questao_id: e.questao_id,
        marcada: e.marcada,
        enunciado: q?.enunciado ?? "",
        alternativas: q?.alternativas ?? {},
        resposta_correta: q?.resposta_correta ?? "",
        justificativa: q?.justificativa ?? null,
      };
    });
    return { erros, total: ultima?.total ?? 0, acertos: ultima?.acertos ?? 0 };
  });

// ====================================================================
// 7) Feedback final do subtema
// ====================================================================

export const getFeedbackSubtema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ subtemaSlug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: tents } = await supabase
      .from("aulas_tentativas")
      .select("passo, acertos, total, concluido_em")
      .eq("user_id", userId).eq("subtema_slug", data.subtemaSlug)
      .order("concluido_em", { ascending: true });

    const ult = (passo: string) => [...(tents ?? [])].reverse().find((t: any) => t.passo === passo);
    const r1 = ult("rodada1"), r2 = ult("rodada2"), sim = ult("simulado");
    const pct = (a?: { acertos: number; total: number }) => a && a.total > 0 ? Math.round((a.acertos / a.total) * 100) : null;

    return {
      rodada1: r1 ? { acertos: r1.acertos, total: r1.total, pct: pct(r1)! } : null,
      rodada2: r2 ? { acertos: r2.acertos, total: r2.total, pct: pct(r2)! } : null,
      simulado: sim ? { acertos: sim.acertos, total: sim.total, pct: pct(sim)! } : null,
      tentativasTotais: tents?.length ?? 0,
    };
  });

// ====================================================================
// 10) Catálogo dinâmico de livros por matéria (vira lista de temas)
// ====================================================================

import { MATERIA_AREAS as _MA } from "@/data/aulas-oab";

export const listarLivrosPorMateria = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ materiaId: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data }) => {
    const areas = _MA[data.materiaId] ?? [];
    if (areas.length === 0) return { livros: [] as Array<{ id: string; titulo: string; capa: string | null; area: string; capitulos: number }> };
    const { data: livros, error } = await supabaseAdmin
      .from("resumo_livros")
      .select("id, titulo, capa, area, capitulos_gerados")
      .in("area", areas)
      .gt("capitulos_gerados", 0)
      .order("area", { ascending: true })
      .order("titulo", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      livros: (livros ?? []).map((l) => ({
        id: l.id,
        titulo: l.titulo,
        capa: l.capa,
        area: l.area ?? "",
        capitulos: l.capitulos_gerados ?? 0,
      })),
    };
  });

export const contarLivrosPorMaterias = createServerFn({ method: "GET" })
  .handler(async () => {
    const allAreas = Array.from(new Set(Object.values(_MA).flat()));
    if (allAreas.length === 0) return {} as Record<string, number>;
    const { data, error } = await supabaseAdmin
      .from("resumo_livros")
      .select("area, capitulos_gerados")
      .in("area", allAreas)
      .gt("capitulos_gerados", 0);
    if (error) throw new Error(error.message);
    const porArea = new Map<string, number>();
    for (const r of data ?? []) {
      if (!r.area) continue;
      porArea.set(r.area, (porArea.get(r.area) ?? 0) + 1);
    }
    const out: Record<string, number> = {};
    for (const [materiaId, areas] of Object.entries(_MA)) {
      out[materiaId] = areas.reduce((s, a) => s + (porArea.get(a) ?? 0), 0);
    }
    return out;
  });
