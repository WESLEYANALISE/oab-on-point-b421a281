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

async function mistralOcrFull(apiKey: string, documentUrl: string): Promise<OcrResult> {
  const res = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: { type: "document_url", document_url: documentUrl },
      include_image_base64: true,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Mistral OCR falhou [${res.status}]: ${txt.slice(0, 300)}`);
  }
  const json = (await res.json()) as { pages?: any[] };
  const pages: OcrPage[] = (json.pages ?? []).map((p, i) => ({
    index: typeof p.index === "number" ? p.index : i,
    markdown: p.markdown ?? "",
    images: Array.isArray(p.images) ? p.images : [],
  }));
  return { pages };
}

async function geminiJson(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini falhou [${res.status}]: ${t.slice(0, 300)}`);
  }
  const j = (await res.json()) as any;
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

async function geminiText(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4 },
      }),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini falhou [${res.status}]: ${t.slice(0, 300)}`);
  }
  const j = (await res.json()) as any;
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
type BibSrc = { slug: string; table: string; tituloCol: string; autorCol: string | null; capaCol: string; areaCol: string; downloadCol: string; linkCol: string };
const BIBS: BibSrc[] = [
  { slug: "estudos", table: "BIBLIOTECA-ESTUDOS", tituloCol: "Tema", autorCol: null, capaCol: "Capa-livro", areaCol: "Área", downloadCol: "Download", linkCol: "Link" },
  { slug: "classicos", table: "BIBLIOTECA-CLASSICOS", tituloCol: "livro", autorCol: "autor", capaCol: "imagem", areaCol: "area", downloadCol: "download", linkCol: "link" },
  { slug: "oratoria", table: "BIBLIOTECA-ORATORIA", tituloCol: "livro", autorCol: "autor", capaCol: "imagem", areaCol: "area", downloadCol: "download", linkCol: "link" },
  { slug: "lideranca", table: "BIBLIOTECA-LIDERANÇA", tituloCol: "livro", autorCol: "autor", capaCol: "imagem", areaCol: "area", downloadCol: "download", linkCol: "link" },
  { slug: "politica", table: "BIBLIOTECA-POLITICA", tituloCol: "livro", autorCol: "autor", capaCol: "imagem", areaCol: "area", downloadCol: "download", linkCol: "link" },
  { slug: "fora-da-toga", table: "BIBLIOTECA-FORA-DA-TOGA", tituloCol: "livro", autorCol: "autor", capaCol: "capa-livro", areaCol: "area", downloadCol: "download", linkCol: "link" },
];

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
  const { data, error } = await supabaseAdmin.from(src.table).select(cols).eq("id", livroId).maybeSingle() as any;
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
      const { data } = await supabaseAdmin.from(src.table).select(cols) as any;
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
      .select("id, biblioteca_slug, livro_id, status, total_capitulos, capitulos_gerados, erro_msg, updated_at");
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
      const ocr = await mistralOcrFull(apiKey, livro.pdfUrl);

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
      const msg = e instanceof Error ? e.message : String(e);
      await supabaseAdmin
        .from("resumo_livros")
        .update({ status: "erro", erro_msg: msg.slice(0, 500) })
        .eq("id", resumoLivroId);
      throw new Error(msg);
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

      const sys = "Você é um professor experiente que cria resumos didáticos e claros para estudantes de Direito. Escreva em português do Brasil, em Markdown, com estrutura clara e didática.";
      const user = `Crie um RESUMO DIDÁTICO COMPLETO do capítulo a seguir, como se fosse uma AULA EXPLICADA POR UM PROFESSOR. O resumo deve:

1. Começar com um parágrafo introdutório explicando o tema e sua importância
2. Usar subtítulos (##) para organizar os principais tópicos
3. Explicar conceitos com linguagem acessível e exemplos práticos quando possível
4. Destacar pontos-chave em **negrito**
5. Usar listas e tabelas quando ajudar na compreensão
6. Manter TODAS as imagens já presentes no texto original (sintaxe markdown ![](url)) — não invente novas
7. Encerrar com um parágrafo "## Em resumo" sintetizando o que foi aprendido
8. Ser COMPLETO e suficiente para o aluno entender o capítulo sem precisar ler o livro inteiro

NÃO escreva introduções fora do conteúdo (nada como "Aqui está o resumo"). Comece direto com o título "# ${pendente.titulo}".

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
      const msg = e instanceof Error ? e.message : String(e);
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
      throw new Error(msg);
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
