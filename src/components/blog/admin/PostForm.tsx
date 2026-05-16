import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Upload, Eye } from "lucide-react";
import {
  adminUpsertBlogPost,
  adminUploadBlogCapa,
} from "@/lib/blog-admin.functions";
import { MarkdownView } from "@/components/blog/MarkdownView";

const CATEGORIAS = [
  "Organização",
  "Estratégia",
  "Estudo",
  "Mente",
  "Conteúdo",
  "Reta final",
];

type Initial = {
  id?: string;
  slug?: string;
  titulo?: string;
  subtitulo?: string | null;
  categoria?: string;
  tempo_leitura_min?: number;
  capa_url?: string | null;
  resumo?: string;
  conteudo_md?: string;
  tags?: string[];
  publicado?: boolean;
};

export function PostForm({ initial, onSaved }: { initial?: Initial; onSaved?: () => void }) {
  const [form, setForm] = useState({
    id: initial?.id,
    slug: initial?.slug ?? "",
    titulo: initial?.titulo ?? "",
    subtitulo: initial?.subtitulo ?? "",
    categoria: initial?.categoria ?? "Estratégia",
    tempo_leitura_min: initial?.tempo_leitura_min ?? 6,
    capa_url: initial?.capa_url ?? "",
    resumo: initial?.resumo ?? "",
    conteudo_md: initial?.conteudo_md ?? "",
    tags: (initial?.tags ?? []).join(", "),
    publicado: initial?.publicado ?? false,
  });
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initial?.id) return;
  }, [initial?.id]);

  const upload = useMutation({
    mutationFn: adminUploadBlogCapa,
    onSuccess: (r) => setForm((f) => ({ ...f, capa_url: r.url })),
  });

  const save = useMutation({
    mutationFn: adminUpsertBlogPost,
    onSuccess: () => onSaved?.(),
  });

  const handleFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = String(reader.result || "");
      upload.mutate({ data: { filename: file.name, base64: b64 } });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({
      data: {
        id: form.id,
        slug: form.slug || undefined,
        titulo: form.titulo,
        subtitulo: form.subtitulo || null,
        categoria: form.categoria,
        tempo_leitura_min: Number(form.tempo_leitura_min) || 6,
        capa_url: form.capa_url || null,
        resumo: form.resumo,
        conteudo_md: form.conteudo_md,
        tags: form.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        publicado: form.publicado,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Field label="Título">
          <input
            required
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className={inputCls}
            maxLength={200}
          />
        </Field>
        <Field label="Subtítulo">
          <input
            value={form.subtitulo ?? ""}
            onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
            className={inputCls}
            maxLength={300}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className={inputCls}
            >
              {CATEGORIAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Tempo de leitura (min)">
            <input
              type="number"
              min={1}
              max={60}
              value={form.tempo_leitura_min}
              onChange={(e) =>
                setForm({ ...form, tempo_leitura_min: Number(e.target.value) })
              }
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Slug (opcional — gerado do título)">
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className={inputCls}
            placeholder="ex: como-estudar-oab-em-60-dias"
          />
        </Field>
        <Field label="Resumo (aparece nos cards)">
          <textarea
            required
            value={form.resumo}
            onChange={(e) => setForm({ ...form, resumo: e.target.value })}
            className={`${inputCls} min-h-[80px]`}
            maxLength={500}
          />
        </Field>
        <Field label="Capa">
          <div className="flex gap-2">
            <input
              value={form.capa_url}
              onChange={(e) => setForm({ ...form, capa_url: e.target.value })}
              className={inputCls}
              placeholder="URL da imagem"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
              className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 text-sm"
            >
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
          {form.capa_url && (
            <img
              src={form.capa_url}
              alt=""
              className="mt-2 w-full aspect-[16/9] object-cover rounded-md border border-border"
            />
          )}
        </Field>
        <Field label="Tags (separadas por vírgula)">
          <input
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
            className={inputCls}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.publicado}
            onChange={(e) => setForm({ ...form, publicado: e.target.checked })}
          />
          Publicar
        </label>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={save.isPending}
            className="px-4 py-2 rounded-md bg-gold text-gold-foreground font-semibold inline-flex items-center gap-2 disabled:opacity-50"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
          {save.isError && (
            <span className="text-xs text-destructive self-center">
              {(save.error as Error).message}
            </span>
          )}
          {save.isSuccess && (
            <span className="text-xs text-success self-center">Salvo ✓</span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Conteúdo (markdown)
          </label>
          <button
            type="button"
            onClick={() => setPreview((p) => !p)}
            className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <Eye className="h-3.5 w-3.5" /> {preview ? "Editar" : "Pré-visualizar"}
          </button>
        </div>
        {preview ? (
          <div className="rounded-md border border-border bg-card p-4 min-h-[420px] max-h-[70vh] overflow-y-auto">
            <MarkdownView source={form.conteudo_md || "*(vazio)*"} />
          </div>
        ) : (
          <textarea
            required
            value={form.conteudo_md}
            onChange={(e) => setForm({ ...form, conteudo_md: e.target.value })}
            className={`${inputCls} font-mono text-sm min-h-[420px] max-h-[70vh]`}
          />
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-md bg-card border border-border focus:outline-none focus:border-gold/50 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
