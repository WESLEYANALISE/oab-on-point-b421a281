import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ---------- helpers ----------
async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "capitulo";
}

type OcrImage = { id: string; image_base64?: string };
type OcrPage = { index: number; markdown: string; images?: OcrImage[] };
type OcrResult = { pages: OcrPage[] };

class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly nonRetryable = false,
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

function normalizeGeminiError(status: number, body: string) {
  let providerMessage = body.slice(0, 300);
  let providerStatus = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; status?: string } };
    providerMessage = parsed.error?.message || providerMessage;
    providerStatus = parsed.error?.status || "";
  } catch {
    /* keep raw snippet */
  }

  const deniedProject = status === 403 && /denied access|permission_denied/i.test(`${providerMessage} ${providerStatus}`);
  if (deniedProject) {
    return {
      message: "Gemini bloqueado neste projeto Google. Verifique/rotacione a GEMINI_API_KEY em um projeto com acesso liberado à Gemini API.",
      nonRetryable: true,
    };
  }

  const nonRetryable = status === 400 || status === 401 || status === 403 || status === 404;
  return {
    message: `Gemini falhou [${status}]: ${providerMessage}`,
    nonRetryable,
  };
}

function toResumoError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return {
    message: msg,
    nonRetryable: e instanceof GeminiApiError ? e.nonRetryable : false,
  };
}

async function mistralOcrFull(apiKey: string, documentUrl: string): Promise<OcrResult> {
  const maxAttempts = 6;
  let res: Response | null = null;
  let lastTxt = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    res = await fetch("https://api.mistral.ai/v1/ocr", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: "document_url", document_url: documentUrl },
        include_image_base64: true,
      }),
    });
    if (res.ok) break;
    lastTxt = await res.text();
    const retriable = res.status === 429 || res.status >= 500;
    if (!retriable || attempt === maxAttempts) {
      throw new Error(`Mistral OCR falhou [${res.status}]: ${lastTxt.slice(0, 300)}`);
    }
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(30_000, 2_000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 500);
    await new Promise((r) => setTimeout(r, backoff));
  }
  const json = (await res!.json()) as { pages?: any[] };
  const pages: OcrPage[] = (json.pages ?? []).map((p, i) => ({
    index: typeof p.index === "number" ? p.index : i,
    markdown: p.markdown ?? "",
    images: Array.isArray(p.images) ? p.images : [],
  }));
  return { pages };
}

async function geminiCall(body: unknown): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const maxAttempts = 5;
  let lastErr = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      lastErr = `network: ${e instanceof Error ? e.message : String(e)}`;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
        continue;
      }
      throw new Error(`Gemini falhou [network]: ${lastErr}`);
    }
    if (res.ok) return await res.json();
    const t = await res.text();
    const normalized = normalizeGeminiError(res.status, t);
    lastErr = `[${res.status}]: ${normalized.message}`;
    // Retry on transient: 408, 429, 5xx
    const transient = res.status === 408 || res.status === 429 || res.status >= 500;
    if (transient && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      continue;
    }
    throw new GeminiApiError(normalized.message, res.status, normalized.nonRetryable);
  }
  throw new GeminiApiError(`Gemini falhou ${lastErr}`);
}

async function geminiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const j = await geminiCall({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
  });
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

async function geminiText(systemPrompt: string, userPrompt: string): Promise<string> {
  const j = await geminiCall({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.4 },
  });
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function b64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/^data:[^;]+;base64,/, "");
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function uploadImg(livroId: string, pageIdx: number, imgId: string, b64: string): Promise<string> {
  const ext = imgId.split(".").pop()?.toLowerCase() || "jpeg";
  const path = `${livroId}/p${pageIdx}-${imgId.replace(/\s+/g, "_")}`;
  const bytes = b64ToBytes(b64);
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const up = await supabaseAdmin.storage
    .from("resumos-imagens")
    .upload(path, bytes, { contentType, upsert: true });
  if (up.error) throw new Error(`Upload imagem: ${up.error.message}`);
  const pub = supabaseAdmin.storage.from("resumos-imagens").getPublicUrl(path);
  return pub.data.publicUrl;
}

// ---------- bibliotecas: descobrir tabela/colunas por slug ----------
// Por enquanto, apenas a biblioteca "Estudos" é elegível para resumos.
type BibSrc = { slug: string; table: string; tituloCol: string; autorCol: string | null; capaCol: string; areaCol: string; downloadCol: string; linkCol: string };
const BIBS: BibSrc[] = [
  { slug: "estudos", table: "BIBLIOTECA-ESTUDOS", tituloCol: "Tema", autorCol: null, capaCol: "Capa-livro", areaCol: "Área", downloadCol: "Download", linkCol: "Link" },
];

// ---------- Google Drive: extrair id e baixar PDF ----------
function extractDriveId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
    /[?&]id=([a-zA-Z0-9_-]{20,})/,
    /\/d\/([a-zA-Z0-9_-]{20,})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

async function fetchPdfBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const driveId = extractDriveId(url);
  const candidates: string[] = [];
  if (driveId) {
    candidates.push(`https://drive.usercontent.google.com/download?id=${driveId}&export=download&confirm=t`);
    candidates.push(`https://drive.google.com/uc?export=download&id=${driveId}&confirm=t`);
  } else {
    candidates.push(url);
  }
  let lastErr = "";
  for (const u of candidates) {
    try {
      const res = await fetch(u, { redirect: "follow" });
      if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
      const ct = res.headers.get("content-type") ?? "";
      const buf = new Uint8Array(await res.arrayBuffer());
      // valida assinatura "%PDF"
      if (buf.length > 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
        return { bytes: buf, contentType: "application/pdf" };
      }
      lastErr = `resposta não é PDF (content-type: ${ct})`;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Não foi possível baixar o PDF (${lastErr}). Verifique se o link do Drive está com acesso público.`);
}

async function ensurePublicPdfUrl(slug: string, livroId: number, sourceUrl: string): Promise<string> {
  // se já é PDF direto, devolve
  if (/\.pdf(\?|$)/i.test(sourceUrl) && !sourceUrl.includes("drive.google.com")) return sourceUrl;
  const { bytes } = await fetchPdfBytes(sourceUrl);
  const path = `${slug}/${livroId}.pdf`;
  const up = await supabaseAdmin.storage
    .from("resumos-pdfs")
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (up.error) throw new Error(`Upload PDF: ${up.error.message}`);
  return supabaseAdmin.storage.from("resumos-pdfs").getPublicUrl(path).data.publicUrl;
}

async function fetchLivroSource(slug: string, livroId: number) {
  const src = BIBS.find((b) => b.slug === slug);
  if (!src) throw new Error("Biblioteca inválida");
  const cols = [
    "id",
    `"${src.tituloCol}"`,
    src.autorCol ? `"${src.autorCol}"` : null,
    `"${src.capaCol}"`,
    `"${src.areaCol}"`,
    `"${src.downloadCol}"`,
    `"${src.linkCol}"`,
  ].filter(Boolean).join(", ");
  const { data, error } = await (supabaseAdmin.from(src.table as any) as any).select(cols).eq("id", livroId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Livro não encontrado");
  return {
    src,
    titulo: data[src.tituloCol] as string,
    autor: (src.autorCol ? (data[src.autorCol] as string | null) : null) ?? null,
    capa: data[src.capaCol] as string | null,
    area: data[src.areaCol] as string | null,
    pdfUrl: (data[src.downloadCol] as string | null) ?? (data[src.linkCol] as string | null),
  };
}

// ---------- LIST ----------
export const listarLivrosParaResumo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const livros: Array<{
      slug: string;
      livro_id: number;
      titulo: string;
      autor: string | null;
      capa: string | null;
      area: string | null;
      pdf_url: string | null;
    }> = [];
    for (const src of BIBS) {
      const cols = [
        "id",
        `"${src.tituloCol}"`,
        src.autorCol ? `"${src.autorCol}"` : null,
        `"${src.capaCol}"`,
        `"${src.areaCol}"`,
        `"${src.downloadCol}"`,
        `"${src.linkCol}"`,
      ].filter(Boolean).join(", ");
      const { data } = await (supabaseAdmin.from(src.table as any) as any).select(cols);
      for (const r of (data ?? [])) {
        livros.push({
          slug: src.slug,
          livro_id: r.id,
          titulo: r[src.tituloCol],
          autor: src.autorCol ? r[src.autorCol] : null,
          capa: r[src.capaCol] ?? null,
          area: r[src.areaCol] ?? null,
          pdf_url: r[src.downloadCol] ?? r[src.linkCol] ?? null,
        });
      }
    }
    const { data: resumos } = await supabaseAdmin
      .from("resumo_livros")
      .select("id, biblioteca_slug, livro_id, status, total_capitulos, capitulos_gerados, erro_msg, updated_at, previa");
    const byKey = new Map<string, any>();
    for (const r of resumos ?? []) byKey.set(`${r.biblioteca_slug}:${r.livro_id}`, r);
    return livros
      .map((l) => ({ ...l, resumo: byKey.get(`${l.slug}:${l.livro_id}`) ?? null }))
      .sort((a, b) => (a.slug + a.titulo).localeCompare(b.slug + b.titulo));
  });

// ---------- PREVIA ----------
export const gerarPreviaResumo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { slug: string; livro_id: number }) =>
    z.object({ slug: z.string(), livro_id: z.number().int().positive() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY não configurada");

    const livro = await fetchLivroSource(data.slug, data.livro_id);
    if (!livro.pdfUrl) throw new Error("Livro sem PDF (download/link)");

    // upsert resumo_livro com status gerando
    const existing = await supabaseAdmin
      .from("resumo_livros")
      .select("id")
      .eq("biblioteca_slug", data.slug)
      .eq("livro_id", data.livro_id)
      .maybeSingle();
    let resumoLivroId = existing.data?.id as string | undefined;
    if (!resumoLivroId) {
      const ins = await supabaseAdmin
        .from("resumo_livros")
        .insert({
          biblioteca_slug: data.slug,
          livro_id: data.livro_id,
          titulo: livro.titulo,
          autor: livro.autor,
          capa: livro.capa,
          area: livro.area,
          pdf_url: livro.pdfUrl,
          status: "gerando",
          gerado_por: context.userId,
        })
        .select("id")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      resumoLivroId = ins.data.id;
    } else {
      await supabaseAdmin
        .from("resumo_livros")
        .update({ status: "gerando", erro_msg: null, pdf_url: livro.pdfUrl, titulo: livro.titulo, capa: livro.capa, autor: livro.autor, area: livro.area })
        .eq("id", resumoLivroId);
    }

    try {
      // Drive `/view` não é PDF — baixa e republica em storage público
      const pdfPublicUrl = await ensurePublicPdfUrl(data.slug, data.livro_id, livro.pdfUrl);
      const ocr = await mistralOcrFull(apiKey, pdfPublicUrl);

      // upload de imagens por página e reescrita do markdown
      const paginas: Array<{ index: number; markdown: string }> = [];
      for (const p of ocr.pages) {
        let md = p.markdown;
        for (const img of p.images ?? []) {
          if (!img.image_base64 || !img.id) continue;
          try {
            const url = await uploadImg(resumoLivroId!, p.index, img.id, img.image_base64);
            // reescreve referências ![*](id) ou (id) para URL pública
            const safeId = img.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            md = md.replace(new RegExp(`\\(${safeId}\\)`, "g"), `(${url})`);
          } catch (_) { /* segue */ }
        }
        paginas.push({ index: p.index, markdown: md });
      }

      // Gemini: extrair sumário organizado, mesclando Parte I/II
      const fullText = paginas.map((p) => `\n\n[[PAGINA ${p.index}]]\n${p.markdown}`).join("");
      const truncated = fullText.slice(0, 180000);

      const sys = "Você analisa livros para criar uma lista de capítulos (resumos didáticos) a partir do sumário. Retorne SEMPRE JSON válido.";
      const user = `Identifique no livro abaixo a lista de CAPÍTULOS / TEMAS que devem virar resumos.

REGRAS:
- Use o sumário do livro como base. Se houver "Parte I" e "Parte II" (ou "1ª parte / 2ª parte") do MESMO tema, MESCLE em UM único capítulo.
- Liste em ordem.
- Para cada capítulo, retorne pagina_inicio e pagina_fim (números das marcações [[PAGINA N]] acima).
- Ignore prefácio, sumário, agradecimentos, índice remissivo, referências bibliográficas — só conteúdo de estudo.

Retorne EXATAMENTE:
{ "capitulos": [ { "titulo": "string", "pagina_inicio": <int>, "pagina_fim": <int> } ] }

===== LIVRO =====
${truncated}`;

      const raw = await geminiJson(sys, user);
      let parsed: any = {};
      try { parsed = JSON.parse(raw); } catch { parsed = {}; }
      const caps = Array.isArray(parsed.capitulos) ? parsed.capitulos : [];

      const previa = caps.map((c: any, i: number) => ({
        ordem: i + 1,
        titulo: String(c.titulo ?? `Capítulo ${i + 1}`).trim(),
        pagina_inicio: Number(c.pagina_inicio) || 0,
        pagina_fim: Number(c.pagina_fim) || 0,
        incluir: true,
      }));

      await supabaseAdmin
        .from("resumo_livros")
        .update({
          status: previa.length ? "previa_pronta" : "erro",
          previa,
          ocr_paginas: paginas,
          total_capitulos: previa.length,
          erro_msg: previa.length ? null : "Não foi possível extrair sumário",
        })
        .eq("id", resumoLivroId);

      return { ok: true, resumo_livro_id: resumoLivroId, total: previa.length };
    } catch (e) {
      const { message: msg, nonRetryable } = toResumoError(e);
      await supabaseAdmin
        .from("resumo_livros")
        .update({ status: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", resumoLivroId);
      return { ok: false, done: true, nonRetryable, error: msg, resumo_livro_id: resumoLivroId, total: 0 };
    }
  });

// ---------- ATUALIZAR PREVIA ----------
const PreviaItemSchema = z.object({
  ordem: z.number().int(),
  titulo: z.string().min(1),
  pagina_inicio: z.number().int().min(0),
  pagina_fim: z.number().int().min(0),
  incluir: z.boolean(),
});

export const atualizarPrevia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { resumo_livro_id: string; previa: unknown }) =>
    z.object({
      resumo_livro_id: z.string().uuid(),
      previa: z.array(PreviaItemSchema),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("resumo_livros")
      .update({ previa: data.previa })
      .eq("id", data.resumo_livro_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- GERAR UM CAPÍTULO (chamado em loop pelo client) ----------
export const gerarProximoCapitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { resumo_livro_id: string }) =>
    z.object({ resumo_livro_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const livro = await supabaseAdmin
      .from("resumo_livros")
      .select("id, titulo, autor, previa, ocr_paginas, status")
      .eq("id", data.resumo_livro_id)
      .maybeSingle();
    if (livro.error || !livro.data) throw new Error("Resumo não encontrado");
    const previa = (livro.data.previa as any[]) ?? [];
    const incluir = previa.filter((p) => p.incluir);
    if (!incluir.length) {
      await supabaseAdmin.from("resumo_livros").update({ status: "concluido" }).eq("id", data.resumo_livro_id);
      return { ok: true, done: true, restantes: 0 };
    }

    const { data: existentes } = await supabaseAdmin
      .from("resumo_capitulos")
      .select("ordem")
      .eq("resumo_livro_id", data.resumo_livro_id);
    const feitos = new Set((existentes ?? []).map((c: any) => c.ordem));
    const pendente = incluir.find((p) => !feitos.has(p.ordem));
    if (!pendente) {
      await supabaseAdmin
        .from("resumo_livros")
        .update({ status: "concluido", capitulos_gerados: incluir.length, total_capitulos: incluir.length })
        .eq("id", data.resumo_livro_id);
      return { ok: true, done: true, restantes: 0 };
    }

    if (livro.data.status !== "gerando") {
      await supabaseAdmin.from("resumo_livros").update({ status: "gerando" }).eq("id", data.resumo_livro_id);
    }

    try {
      const paginas = (livro.data.ocr_paginas as Array<{ index: number; markdown: string }>) ?? [];
      const slice = paginas
        .filter((p) => p.index >= pendente.pagina_inicio && p.index <= pendente.pagina_fim)
        .map((p) => p.markdown)
        .join("\n\n");
      const trecho = slice.slice(0, 140000);

      const sys = "Você escreve RESUMOS escritos (não aulas faladas) de Direito, em português do Brasil, em Markdown, com estrutura clara e didática. NUNCA use saudações ou linguagem oral. NUNCA escreva 'Olá', 'Olá pessoal', 'Bem-vindos', 'Sejam bem-vindos', 'Hoje vamos ver', 'Nesta aula', 'Neste vídeo', 'pessoal', 'galera', 'turma', 'queridos alunos' ou qualquer expressão semelhante. NUNCA se refira ao texto como 'aula'; trate-o sempre como 'resumo'. Não fale com o leitor em primeira pessoa do plural ('vamos ver', 'vamos estudar'). Escreva de forma direta, expositiva e impessoal, como um material didático escrito.";
      const user = `Escreva um RESUMO DIDÁTICO COMPLETO E ESCRITO do capítulo a seguir. Regras obrigatórias:

1. Comece DIRETO com o título "# ${pendente.titulo}" e, logo abaixo, um parágrafo expositivo entrando no conteúdo — sem saudação, sem "nesta aula", sem "olá", sem "vamos ver", sem se dirigir ao leitor.
2. Use subtítulos (##) para organizar os principais tópicos.
3. Explique conceitos com linguagem acessível e exemplos práticos quando possível, sempre em tom expositivo escrito.
4. Destaque pontos-chave em **negrito**.
5. Use listas e tabelas quando ajudar na compreensão.
6. Mantenha TODAS as imagens já presentes no texto original (sintaxe markdown ![](url)) — não invente novas.
7. Encerre com uma seção "## Em resumo" sintetizando os pontos centrais (sem despedidas, sem "espero que tenham gostado").
8. Seja COMPLETO e suficiente para o aluno entender o capítulo sem precisar ler o livro inteiro.

PROIBIDO: saudações ("Olá", "Bem-vindos"), vocativos ("pessoal", "galera", "turma", "alunos"), referências à "aula"/"vídeo"/"hoje", frases como "vamos estudar"/"vamos ver"/"veremos a seguir", introduções metalinguísticas ("Aqui está o resumo", "Neste resumo iremos"). Trate o texto como RESUMO ESCRITO, não como fala.

Livro: ${livro.data.titulo}${livro.data.autor ? ` — ${livro.data.autor}` : ""}
Capítulo: ${pendente.titulo}

===== CONTEÚDO ORIGINAL =====
${trecho}`;

      const markdown = await geminiText(sys, user);

      // extrai imagens já embutidas como URL pública do nosso bucket
      const imgs: Array<{ url: string }> = [];
      const re = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g;
      let m;
      while ((m = re.exec(markdown)) !== null) {
        if (!imgs.some((x) => x.url === m![1])) imgs.push({ url: m[1] });
      }

      await supabaseAdmin.from("resumo_capitulos").upsert(
        {
          resumo_livro_id: data.resumo_livro_id,
          ordem: pendente.ordem,
          titulo: pendente.titulo,
          slug: slugify(pendente.titulo),
          conteudo_markdown: markdown,
          imagens: imgs,
          status: "ok",
          erro_msg: null,
        },
        { onConflict: "resumo_livro_id,ordem" },
      );

      const feitosAgora = feitos.size + 1;
      const total = incluir.length;
      const done = feitosAgora >= total;
      await supabaseAdmin
        .from("resumo_livros")
        .update({
          capitulos_gerados: feitosAgora,
          total_capitulos: total,
          status: done ? "concluido" : "gerando",
        })
        .eq("id", data.resumo_livro_id);

      return { ok: true, done, restantes: total - feitosAgora, ordem: pendente.ordem, titulo: pendente.titulo };
    } catch (e) {
      const { message: msg, nonRetryable } = toResumoError(e);
      await supabaseAdmin.from("resumo_capitulos").upsert(
        {
          resumo_livro_id: data.resumo_livro_id,
          ordem: pendente.ordem,
          titulo: pendente.titulo,
          slug: slugify(pendente.titulo),
          status: "erro",
          erro_msg: msg.slice(0, 500),
        },
        { onConflict: "resumo_livro_id,ordem" },
      );
      await supabaseAdmin
        .from("resumo_livros")
        .update({ status: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", data.resumo_livro_id);
      return { ok: false, done: true, nonRetryable, error: msg, restantes: incluir.length - feitos.size, ordem: pendente.ordem, titulo: pendente.titulo };
    }
  });

// ---------- REGERAR ----------
export const regerarCapitulo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { capitulo_id: string }) =>
    z.object({ capitulo_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: cap } = await supabaseAdmin
      .from("resumo_capitulos")
      .select("resumo_livro_id, ordem")
      .eq("id", data.capitulo_id)
      .maybeSingle();
    if (!cap) throw new Error("Capítulo não encontrado");
    await supabaseAdmin.from("resumo_capitulos").delete().eq("id", data.capitulo_id);
    await supabaseAdmin
      .from("resumo_livros")
      .update({ status: "gerando" })
      .eq("id", cap.resumo_livro_id);
    return { ok: true, resumo_livro_id: cap.resumo_livro_id };
  });

// ---------- EXCLUIR ----------
export const excluirResumoLivro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { resumo_livro_id: string }) =>
    z.object({ resumo_livro_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("resumo_livros").delete().eq("id", data.resumo_livro_id);
    return { ok: true };
  });
