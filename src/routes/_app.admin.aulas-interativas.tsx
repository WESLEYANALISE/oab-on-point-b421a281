import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  excluirCurso,
  listarCursosAdmin,
  publicarCurso,
  togglePublicarCurso,
} from "@/lib/aulas-interativas.functions";
import { parsePdfToChunks, type PdfChunk } from "@/lib/aulas-interativas-pdf.client";

export const Route = createFileRoute("/_app/admin/aulas-interativas")({
  component: AdminAulasInterativas,
});

type Estrutura = {
  modulos: Array<{
    titulo: string;
    descricao: string;
    aulas: Array<{
      titulo: string;
      descricao: string;
      duracao_min: number;
      slides: any[];
    }>;
  }>;
};

function AdminAulasInterativas() {
  const qc = useQueryClient();
  const cursosQ = useQuery({
    queryKey: ["admin", "aulas-interativas", "cursos"],
    queryFn: () => listarCursosAdmin(),
  });

  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("Direito Penal");
  const [progresso, setProgresso] = useState("");
  const [estrutura, setEstrutura] = useState<Estrutura | null>(null);
  const [processando, setProcessando] = useState(false);
  const [chunks, setChunks] = useState<PdfChunk[]>([]);

  async function extrairEEstruturar() {
    if (!file || !titulo.trim()) {
      toast.error("Selecione um PDF e informe o título");
      return;
    }
    setProcessando(true);
    setEstrutura(null);
    try {
      setProgresso("Lendo PDF…");
      const { chunks: c, totalPaginas } = await parsePdfToChunks(file, (p, t) => {
        setProgresso(`Lendo PDF… ${p}/${t}`);
      });
      setChunks(c);
      setProgresso(`PDF lido (${totalPaginas} págs, ${c.length} capítulos). Chamando IA…`);

      const res = await fetch("/api/aulas-interativas-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tituloCurso: titulo, chunks: c }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Ingest falhou: ${t.slice(0, 200)}`);
      }
      const json = (await res.json()) as Estrutura;
      setEstrutura(json);
      setProgresso(`Pronto! ${json.modulos.length} módulos gerados.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao processar PDF");
      setProgresso(`Erro: ${e?.message ?? "desconhecido"}`);
    } finally {
      setProcessando(false);
    }
  }

  const publicar = useMutation({
    mutationFn: (publicado: boolean) => {
      if (!estrutura) throw new Error("Nada para publicar");
      const slug = slugify(titulo);
      return publicarCurso({
        data: {
          titulo,
          slug,
          descricao: "",
          materia,
          publicado,
          modulos: estrutura.modulos.map((m) => ({
            titulo: m.titulo,
            descricao: m.descricao ?? "",
            aulas: m.aulas.map((a) => ({
              titulo: a.titulo,
              descricao: a.descricao ?? "",
              duracao_min: a.duracao_min ?? 10,
              slides: (a.slides ?? []).map((s: any, i: number) => ({
                ordem: s.ordem ?? i,
                tipo: s.tipo,
                conteudo: s.conteudo ?? {},
                imagem_url: s.imagem_url ?? null,
                quiz_json: s.quiz_json ?? null,
              })),
            })),
          })),
        },
      });
    },
    onSuccess: () => {
      toast.success("Curso salvo!");
      setEstrutura(null);
      setFile(null);
      setTitulo("");
      setProgresso("");
      qc.invalidateQueries({ queryKey: ["admin", "aulas-interativas"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao publicar"),
  });

  const togglePub = useMutation({
    mutationFn: (v: { id: string; publicado: boolean }) =>
      togglePublicarCurso({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "aulas-interativas"] }),
  });

  const remover = useMutation({
    mutationFn: (id: string) => excluirCurso({ data: { id } }),
    onSuccess: () => {
      toast.success("Curso removido");
      qc.invalidateQueries({ queryKey: ["admin", "aulas-interativas"] });
    },
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <Link
        to="/admin"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-gold inline-flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" /> Admin
        </p>
        <h1 className="font-display text-3xl md:text-4xl mt-1">Aulas Interativas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suba um PDF, deixe a IA estruturar em curso → módulos → aulas → slides e publique.
        </p>
      </header>

      {/* Uploader */}
      <section className="rounded-2xl border border-border bg-card p-5 mb-8">
        <h2 className="font-display text-lg mb-4">Novo curso a partir de PDF</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block text-sm">
            <span className="text-xs text-muted-foreground">Título do curso</span>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex.: Direito Penal — Prof. Nidal Ahmad"
              className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-background"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs text-muted-foreground">Matéria</span>
            <input
              type="text"
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-lg border border-border bg-background"
            />
          </label>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/50 p-4 cursor-pointer hover:bg-accent">
            <Upload className="h-5 w-5 text-gold" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{file ? file.name : "Selecionar PDF (até ~50MB)"}</p>
              <p className="text-xs text-muted-foreground">
                Será lido no navegador e enviado em chunks à IA.
              </p>
            </div>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={extrairEEstruturar}
            disabled={processando || !file || !titulo.trim()}
            className="h-11 px-5 rounded-full bg-gradient-toga text-primary-foreground font-display text-sm inline-flex items-center gap-2 disabled:opacity-50"
          >
            {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Extrair e estruturar com IA
          </button>
          {progresso && <span className="text-xs text-muted-foreground">{progresso}</span>}
        </div>
      </section>

      {/* Preview da estrutura */}
      {estrutura && (
        <section className="rounded-2xl border border-border bg-card p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-lg">Preview da estrutura</h2>
              <p className="text-xs text-muted-foreground">
                {estrutura.modulos.length} módulos ·{" "}
                {estrutura.modulos.reduce((s, m) => s + m.aulas.length, 0)} aulas ·{" "}
                {estrutura.modulos.reduce(
                  (s, m) => s + m.aulas.reduce((ss, a) => ss + (a.slides?.length ?? 0), 0),
                  0,
                )}{" "}
                slides
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => publicar.mutate(false)}
                disabled={publicar.isPending}
                className="h-10 px-4 rounded-full border border-border text-sm inline-flex items-center gap-2"
              >
                Salvar rascunho
              </button>
              <button
                onClick={() => publicar.mutate(true)}
                disabled={publicar.isPending}
                className="h-10 px-4 rounded-full bg-gradient-gold text-gold-foreground font-display text-sm inline-flex items-center gap-2"
              >
                {publicar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Publicar agora
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {estrutura.modulos.map((m, mi) => (
              <details key={mi} className="rounded-xl border border-border bg-background p-3">
                <summary className="cursor-pointer font-display text-sm">
                  {mi + 1}. {m.titulo}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({m.aulas.length} aulas)
                  </span>
                </summary>
                <ul className="mt-2 pl-4 space-y-1">
                  {m.aulas.map((a, ai) => (
                    <li key={ai} className="text-xs text-muted-foreground">
                      • {a.titulo}{" "}
                      <span className="opacity-70">({a.slides?.length ?? 0} slides)</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
          {chunks.length > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {chunks.length} chunk(s) enviados ao Gemini.
            </p>
          )}
        </section>
      )}

      {/* Lista de cursos */}
      <section>
        <h2 className="font-display text-lg mb-3">Cursos existentes</h2>
        {cursosQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {cursosQ.data && cursosQ.data.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum curso ainda.</p>
        )}
        <ul className="space-y-2">
          {cursosQ.data?.map((c: any) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm truncate">{c.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  /{c.slug} · {c.publicado ? "publicado" : "rascunho"}
                </p>
              </div>
              <button
                onClick={() => togglePub.mutate({ id: c.id, publicado: !c.publicado })}
                className="h-9 px-3 rounded-full border border-border text-xs inline-flex items-center gap-1"
                title={c.publicado ? "Despublicar" : "Publicar"}
              >
                {c.publicado ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => {
                  if (confirm("Excluir curso e todos os módulos/aulas/slides?")) {
                    remover.mutate(c.id);
                  }
                }}
                className="h-9 px-3 rounded-full border border-border text-xs text-red-400 inline-flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
