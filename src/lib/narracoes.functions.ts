import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { geminiGenerateContent } from "@/lib/gemini.server";
import { MAX_TTS_CHARS, dividirTextoEmChunks, montarTextoNarracao } from "@/lib/narracoes.utils";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado");
}

const BUCKET = "narracoes";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

/** Envelopa PCM 16-bit LE mono em um WAV (header 44 bytes). */
function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  const out = new Uint8Array(buffer);
  out.set(pcm, 44);
  return out;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- LIST LEIS ----------
export const listarLeisNarracao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("vade_mecum_leis")
      .select("id, nome, nome_curto, categoria, slug, total_artigos")
      .order("categoria")
      .order("ordem");
    if (error) throw new Error(error.message);
    const leis = data ?? [];

    // Conta artigos elegíveis (com numero) e já narrados por lei
    const ids = leis.map((l) => l.id as string);
    const totalNarravelMap = new Map<string, number>();
    const narradosMap = new Map<string, number>();

    if (ids.length) {
      // total narrável: artigos com numero não nulo/vazio
      const totalNarravel = await Promise.all(
        ids.map(async (id) => {
          const { count } = await supabaseAdmin
            .from("vade_mecum_artigos")
            .select("id", { count: "exact", head: true })
            .eq("lei_id", id)
            .not("numero", "is", null)
            .neq("numero", "");
          return [id, count ?? 0] as const;
        }),
      );
      totalNarravel.forEach(([id, c]) => totalNarravelMap.set(id, c));

      // narrados
      const narrados = await Promise.all(
        ids.map(async (id) => {
          const { count } = await supabaseAdmin
            .from("vade_mecum_narracoes")
            .select("artigo_id", { count: "exact", head: true })
            .eq("lei_id", id);
          return [id, count ?? 0] as const;
        }),
      );
      narrados.forEach(([id, c]) => narradosMap.set(id, c));
    }

    return leis.map((l) => ({
      ...l,
      total_narravel: totalNarravelMap.get(l.id as string) ?? 0,
      narrados: narradosMap.get(l.id as string) ?? 0,
    }));
  });

// ---------- LIST ARTIGOS DE UMA LEI ----------
const ListInput = z.object({
  leiId: z.string().uuid(),
  busca: z.string().max(120).optional(),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(10).max(200).default(50),
});

export const listarArtigosParaNarrar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    let q = supabaseAdmin
      .from("vade_mecum_artigos")
      .select("id, numero, texto, ordem", { count: "exact" })
      .eq("lei_id", data.leiId)
      .not("numero", "is", null)
      .neq("numero", "")
      .order("ordem", { ascending: true })
      .range(data.page * data.pageSize, (data.page + 1) * data.pageSize - 1);

    if (data.busca && data.busca.trim()) {
      const b = data.busca.trim();
      q = q.or(`numero.ilike.%${b}%,texto.ilike.%${b}%`);
    }

    const { data: artigos, error, count } = await q;
    if (error) throw new Error(error.message);

    const ids = (artigos ?? []).map((a) => a.id);
    let narrados = new Set<string>();
    if (ids.length) {
      const { data: nar } = await supabaseAdmin
        .from("vade_mecum_narracoes")
        .select("artigo_id")
        .in("artigo_id", ids);
      narrados = new Set((nar ?? []).map((n) => n.artigo_id as string));
    }

    return {
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      items: (artigos ?? []).map((a) => ({
        id: a.id as string,
        numero: (a.numero ?? "") as string,
        texto: (a.texto ?? "") as string,
        ordem: a.ordem as number,
        tem_narracao: narrados.has(a.id as string),
      })),
    };
  });

// ---------- PREVIEW DO TEXTO QUE SERÁ NARRADO ----------
export const previewTextoNarracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ artigoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: art, error } = await supabaseAdmin
      .from("vade_mecum_artigos")
      .select("id, numero, texto, lei_id")
      .eq("id", data.artigoId)
      .single();
    if (error || !art) throw new Error("Artigo não encontrado");
    const { data: lei } = await supabaseAdmin
      .from("vade_mecum_leis")
      .select("nome, nome_curto")
      .eq("id", art.lei_id as string)
      .single();
    const titulo = (lei?.nome_curto as string | null) || (lei?.nome as string) || "";
    const texto = montarTextoNarracao({
      leiTitulo: titulo,
      artigoNumero: art.numero ?? "",
      artigoTexto: art.texto ?? "",
    });
    return { texto, excedeLimite: texto.length > MAX_TTS_CHARS };
  });

// ---------- SIGNED URL ----------
async function signed(audioPath: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(audioPath, 60 * 60);
  if (error || !data) throw new Error(error?.message || "Erro ao gerar URL");
  return data.signedUrl;
}

export const obterNarracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ artigoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: nar } = await supabaseAdmin
      .from("vade_mecum_narracoes")
      .select("audio_path, voz, texto_narrado, duracao_ms, updated_at")
      .eq("artigo_id", data.artigoId)
      .maybeSingle();
    if (!nar) return null;
    return {
      url: await signed(nar.audio_path as string),
      voz: nar.voz as string,
      texto_narrado: nar.texto_narrado as string,
      duracao_ms: nar.duracao_ms as number | null,
      updated_at: nar.updated_at as string,
    };
  });

// ---------- GERAR NARRAÇÃO ----------
export const gerarNarracaoArtigo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        artigoId: z.string().uuid(),
        voz: z.string().min(1).max(40).default("Kore"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);

    const { data: art, error } = await supabaseAdmin
      .from("vade_mecum_artigos")
      .select("id, numero, texto, lei_id")
      .eq("id", data.artigoId)
      .single();
    if (error || !art) throw new Error("Artigo não encontrado");

    const { data: lei } = await supabaseAdmin
      .from("vade_mecum_leis")
      .select("nome, nome_curto")
      .eq("id", art.lei_id as string)
      .single();
    const titulo =
      (lei?.nome_curto as string | null) || (lei?.nome as string) || "";

    const texto = montarTextoNarracao({
      leiTitulo: titulo,
      artigoNumero: art.numero ?? "",
      artigoTexto: art.texto ?? "",
    });

    if (texto.length > MAX_TTS_CHARS) {
      throw new Error(
        `Texto muito longo (${texto.length} caracteres, limite ${MAX_TTS_CHARS}).`,
      );
    }

    // Chama Gemini TTS
    const res = await geminiGenerateContent(TTS_MODEL, {
      contents: [{ parts: [{ text: texto }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: data.voz },
          },
          languageCode: "pt-BR",
        },
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini TTS falhou (${res.status}): ${body.slice(0, 300)}`);
    }
    const json = (await res.json()) as any;
    const part = json?.candidates?.[0]?.content?.parts?.[0];
    const b64 = part?.inlineData?.data as string | undefined;
    if (!b64) throw new Error("Resposta TTS sem áudio");

    const pcm = base64ToBytes(b64);
    const wav = pcmToWav(pcm, 24000);
    const audioPath = `${art.lei_id}/${art.id}.wav`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(audioPath, wav, {
        contentType: "audio/wav",
        upsert: true,
      });
    if (upErr) throw new Error(`Upload falhou: ${upErr.message}`);

    const duracaoMs = Math.round((pcm.length / 2 / 24000) * 1000);

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(audioPath);
    const publicUrl = pub.publicUrl;

    const { error: dbErr } = await supabaseAdmin
      .from("vade_mecum_narracoes")
      .upsert(
        {
          artigo_id: art.id,
          lei_id: art.lei_id,
          audio_path: audioPath,
          voz: data.voz,
          texto_narrado: texto,
          duracao_ms: duracaoMs,
          gerado_por: context.userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "artigo_id" },
      );
    if (dbErr) throw new Error(`DB falhou: ${dbErr.message}`);

    // Reflete a URL pública no artigo, pra o player do usuário final.
    await supabaseAdmin
      .from("vade_mecum_artigos")
      .update({ narracao_url: publicUrl })
      .eq("id", art.id);

    return {
      url: await signed(audioPath),
      duracao_ms: duracaoMs,
      texto_narrado: texto,
      voz: data.voz,
    };
  });

// ---------- EXCLUIR ----------
export const excluirNarracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ artigoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: nar } = await supabaseAdmin
      .from("vade_mecum_narracoes")
      .select("audio_path")
      .eq("artigo_id", data.artigoId)
      .maybeSingle();
    if (nar?.audio_path) {
      await supabaseAdmin.storage.from(BUCKET).remove([nar.audio_path as string]);
    }
    const { error } = await supabaseAdmin
      .from("vade_mecum_narracoes")
      .delete()
      .eq("artigo_id", data.artigoId);
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("vade_mecum_artigos")
      .update({ narracao_url: null })
      .eq("id", data.artigoId);
    return { ok: true };
  });
