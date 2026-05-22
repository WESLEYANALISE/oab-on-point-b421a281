import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Play,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  excluirCurso,
  listarCursosAdmin,
  publicarCurso,
  togglePublicarCurso,
  type SlideRow,
} from "@/lib/aulas-interativas.functions";
type PdfChunk = { modulo: string; texto: string };
import { SlidePlayer } from "@/components/aulas-interativas/SlidePlayer";

export const Route = createFileRoute("/_app/admin/aulas-interativas")({
  component: AdminAulasInterativas,
});

type SlideDraft = {
  ordem?: number;
  tipo: string;
  conteudo?: any;
  imagem_url?: string | null;
  quiz_json?: any;
};
type AulaDraft = {
  titulo: string;
  descricao?: string;
  duracao_min?: number;
  slides: SlideDraft[];
};
type ModuloDraft = { titulo: string; descricao?: string; aulas: AulaDraft[] };
type Estrutura = { modulos: ModuloDraft[] };

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
  const [erros, setErros] = useState<string[]>([]);
  const [previewSlide, setPreviewSlide] = useState<{
    slides: SlideRow[];
    aulaTitulo: string;
    inicio: number;
  } | null>(null);

  async function extrairEEstruturar() {
    if (!file || !titulo.trim()) {
      toast.error("Selecione um PDF e informe o título");
      return;
    }
    setProcessando(true);
    setEstrutura({ modulos: [] });
    setErros([]);
    try {
      setProgresso("Lendo PDF…");
      const { chunks: c, totalPaginas } = await parsePdfToChunks(file, (p, t) => {
        setProgresso(`Lendo PDF… ${p}/${t}`);
      });
      setChunks(c);
      setProgresso(`PDF lido (${totalPaginas} págs, ${c.length} capítulos).`);

      // 1 chunk por request — evita timeout do Worker
      for (let i = 0; i < c.length; i++) {
        const ch = c[i];
        setProgresso(`Processando ${i + 1}/${c.length} — ${ch.modulo}`);
        try {
          const res = await fetch("/api/aulas-interativas-ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tituloCurso: titulo,
              modulo: ch.modulo,
              texto: ch.texto,
            }),
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
          }
          const { modulo } = (await res.json()) as { modulo: ModuloDraft };
          setEstrutura((prev) => ({
            modulos: [...(prev?.modulos ?? []), modulo],
          }));
        } catch (e: any) {
          const msg = `${ch.modulo}: ${e?.message ?? "falhou"}`;
          setErros((prev) => [...prev, msg]);
          toast.error(`Capítulo "${ch.modulo}" falhou`);
        }
      }
      setProgresso(`Pronto! Revise abaixo e publique.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao processar PDF");
      setProgresso(`Erro: ${e?.message ?? "desconhecido"}`);
    } finally {
      setProcessando(false);
    }
  }

  const publicar = useMutation({
    mutationFn: (publicado: boolean) => {
      if (!estrutura || !estrutura.modulos.length) throw new Error("Nada para publicar");
      const slug = slugify(titulo);
      return publicarCurso({
        data: {
          titulo,
          slug,
          descricao: "",
          materia,
          publicado,
          modulos: estrutura.modulos
            .filter((m) => m.aulas.length > 0)
            .map((m) => ({
              titulo: m.titulo,
              descricao: m.descricao ?? "",
              aulas: m.aulas.map((a) => ({
                titulo: a.titulo,
                descricao: a.descricao ?? "",
                duracao_min: a.duracao_min ?? 10,
                slides: (a.slides ?? []).map((s, i) => ({
                  ordem: s.ordem ?? i,
                  tipo: s.tipo as any,
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
      setErros([]);
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

  const stats = useMemo(() => {
    if (!estrutura) return null;
    let aulas = 0;
    let slides = 0;
    let quizzes = 0;
    let minutos = 0;
    for (const m of estrutura.modulos) {
      for (const a of m.aulas) {
        aulas++;
        minutos += a.duracao_min ?? 10;
        for (const s of a.slides ?? []) {
          slides++;
          if (s.tipo === "quiz") quizzes++;
        }
      }
    }
    return { modulos: estrutura.modulos.length, aulas, slides, quizzes, minutos };
  }, [estrutura]);

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
                Será lido no navegador e enviado capítulo por capítulo à IA.
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
        {erros.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300 space-y-1">
            <p className="font-display">Capítulos que falharam (você pode publicar o resto):</p>
            {erros.map((e, i) => (
              <p key={i}>• {e}</p>
            ))}
          </div>
        )}
      </section>

      {/* Preview da estrutura */}
      {estrutura && estrutura.modulos.length > 0 && stats && (
        <section className="rounded-2xl border border-border bg-card p-5 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-display text-lg">Prévia da estrutura</h2>
              <p className="text-xs text-muted-foreground">
                {stats.modulos} módulos · {stats.aulas} aulas · {stats.slides} slides ·{" "}
                {stats.quizzes} quizzes · ~{stats.minutos} min
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => publicar.mutate(false)}
                disabled={publicar.isPending || processando}
                className="h-10 px-4 rounded-full border border-border text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                Salvar rascunho
              </button>
              <button
                onClick={() => publicar.mutate(true)}
                disabled={publicar.isPending || processando}
                className="h-10 px-4 rounded-full bg-gradient-gold text-gold-foreground font-display text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                {publicar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Publicar agora
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {estrutura.modulos.map((m, mi) => (
              <details key={mi} className="rounded-xl border border-border bg-background p-3" open={mi === 0}>
                <summary className="cursor-pointer font-display text-sm">
                  {mi + 1}. {m.titulo}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({m.aulas.length} aulas)
                  </span>
                </summary>
                <div className="mt-3 space-y-2">
                  {m.aulas.map((a, ai) => (
                    <details key={ai} className="rounded-lg border border-border/60 bg-card/40 p-2">
                      <summary className="cursor-pointer text-xs flex items-center justify-between gap-2">
                        <span>
                          <span className="text-muted-foreground">{mi + 1}.{ai + 1}</span>{" "}
                          {a.titulo}{" "}
                          <span className="opacity-70">
                            ({a.slides?.length ?? 0} slides · {a.duracao_min ?? 10}min)
                          </span>
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            const slides = (a.slides ?? []).map((s, i) => ({
                              id: `preview-${mi}-${ai}-${i}`,
                              aula_id: `preview-${mi}-${ai}`,
                              ordem: s.ordem ?? i,
                              tipo: s.tipo as any,
                              conteudo: s.conteudo ?? {},
                              imagem_url: s.imagem_url ?? null,
                              quiz_json: s.quiz_json ?? null,
                            })) as SlideRow[];
                            if (!slides.length) return;
                            setPreviewSlide({ slides, aulaTitulo: a.titulo, inicio: 0 });
                          }}
                          className="h-7 px-3 rounded-full border border-border text-[11px] inline-flex items-center gap-1 hover:bg-accent"
                        >
                          <Play className="h-3 w-3" /> Pré-visualizar
                        </button>
                      </summary>
                      <ol className="mt-2 pl-4 space-y-1 text-[11px] text-muted-foreground">
                        {(a.slides ?? []).map((s, si) => (
                          <li key={si} className="flex items-center gap-2">
                            <span className="inline-flex h-5 px-2 rounded-full bg-muted text-foreground/80 items-center text-[10px] uppercase tracking-wider">
                              {s.tipo}
                            </span>
                            <span className="truncate">
                              {s.conteudo?.titulo ?? s.conteudo?.texto?.slice(0, 60) ?? "—"}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
          {chunks.length > 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {chunks.length} chunk(s) detectados no PDF.
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

      {/* Modal preview */}
      {previewSlide && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <button
            onClick={() => setPreviewSlide(null)}
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full border border-border bg-card inline-flex items-center justify-center hover:bg-accent"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          <SlidePlayer
            slides={previewSlide.slides}
            tituloAula={`[Prévia] ${previewSlide.aulaTitulo}`}
            voltarHref="/admin/aulas-interativas"
            slideInicial={previewSlide.inicio}
          />
        </div>
      )}
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
