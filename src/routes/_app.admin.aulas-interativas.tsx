import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Library,
  Loader2,
  Play,
  ScanText,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
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
import {
  listarArquivosDrive,
  atualizarStatusDrive,
  listarAulasDoCurso,
  vincularMapaAula,
  obterPreviaArquivo,
  obterExtracaoArquivo,
  apagarExtracaoArquivo,
  apagarImagensExtracao,
  type ArquivoDrive,
} from "@/lib/aulas-interativas-drive.functions";
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

type TabKey = "drive" | "cronogramas" | "bonus" | "upload" | "mapas";

function AdminAulasInterativas() {
  const [tab, setTab] = useState<TabKey>("drive");

  return (
    <div className="px-2 sm:px-4 md:px-8 py-6 max-w-6xl mx-auto">
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
          Gere cursos a partir dos PDFs importados do Drive ou faça upload manual.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-border">
        <TabBtn icon={<Library className="h-4 w-4" />} active={tab === "drive"} onClick={() => setTab("drive")}>
          Materiais de estudo
        </TabBtn>
        <TabBtn icon={<FileText className="h-4 w-4" />} active={tab === "mapas"} onClick={() => setTab("mapas")}>
          Mapas mentais
        </TabBtn>
        <TabBtn icon={<FileText className="h-4 w-4" />} active={tab === "cronogramas"} onClick={() => setTab("cronogramas")}>
          Cronogramas
        </TabBtn>
        <TabBtn icon={<Sparkles className="h-4 w-4" />} active={tab === "bonus"} onClick={() => setTab("bonus")}>
          Bônus
        </TabBtn>
        <TabBtn icon={<Upload className="h-4 w-4" />} active={tab === "upload"} onClick={() => setTab("upload")}>
          Upload manual
        </TabBtn>
      </div>

      {tab === "drive" && <AbaDrive />}
      {tab === "cronogramas" && <AbaListaSimples tipo="cronograma" titulo="Cronogramas" descricao="Cronogramas de estudo importados do Drive." />}
      {tab === "bonus" && <AbaListaSimples tipo="bonus" titulo="Bônus" descricao="Materiais bônus, e-books e marcadores." />}
      {tab === "upload" && <AbaUpload />}
      {tab === "mapas" && <AbaMapas />}

      <CursosExistentes />
    </div>
  );
}

function TabBtn({
  icon,
  active,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 -mb-px text-sm border-b-2 transition-colors ${
        active
          ? "border-gold text-foreground font-display"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

/* ============================================================
   ABA — Lista simples (Cronogramas, Bônus)
   ============================================================ */
function AbaListaSimples({ tipo, titulo, descricao }: { tipo: "cronograma" | "bonus"; titulo: string; descricao: string }) {
  const q = useQuery({
    queryKey: ["admin", "aulas-interativas", "drive", tipo],
    queryFn: () => listarArquivosDrive(),
  });
  const itens = useMemo(() => {
    const filtrados = (q.data ?? []).filter((a) => a.tipo === tipo);
    return [...filtrados].sort((a, b) => a.nome_arquivo.localeCompare(b.nome_arquivo, "pt-BR"));
  }, [q.data, tipo]);
  return (
    <section className="rounded-2xl border border-border bg-card p-5 mb-8">
      <h2 className="font-display text-lg mb-2">{titulo}</h2>
      <p className="text-xs text-muted-foreground mb-4">{itens.length} arquivo(s). {descricao}</p>
      {q.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <ul className="space-y-2">
        {itens.map((a) => (
          <li key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-3">
            <FileText className="h-5 w-5 text-gold shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm truncate">{a.nome_arquivo}</p>
              <p className="text-[11px] text-muted-foreground">
                {a.subpasta} · {a.bytes ? `${(a.bytes / 1024 / 1024).toFixed(1)} MB` : "?"}
              </p>
            </div>
            {a.pdf_url && (
              <a href={a.pdf_url} target="_blank" rel="noreferrer" className="text-[11px] text-gold hover:underline">
                Abrir PDF
              </a>
            )}
          </li>
        ))}
        {!q.isLoading && itens.length === 0 && (
          <li className="text-sm text-muted-foreground">Nenhum arquivo nesta categoria.</li>
        )}
      </ul>
    </section>
  );
}

/* ============================================================
   ABA 1 — Importados do Drive
   ============================================================ */
function AbaDrive() {
  const qc = useQueryClient();
  const arquivosQ = useQuery({
    queryKey: ["admin", "aulas-interativas", "drive"],
    queryFn: () => listarArquivosDrive(),
  });

  const materiais = useMemo(
    () => ordenarOAB((arquivosQ.data ?? []).filter((a) => a.tipo === "material")),
    [arquivosQ.data],
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-5 mb-8">
      <h2 className="font-display text-lg mb-2">Materiais de estudo (gerar cursos)</h2>
      <p className="text-xs text-muted-foreground mb-4">
        {materiais.length} arquivo(s). Pipeline: <strong>1. Extrair</strong> (Mistral OCR) → <strong>2. Gerar prévia</strong> (Gemini) → <strong>3. Publicar curso</strong>.
      </p>
      {arquivosQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <ul className="space-y-2">
        {materiais.map((a) => (
          <ArquivoMaterialItem key={a.id} arquivo={a} onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "aulas-interativas"] })} />
        ))}
      </ul>
    </section>
  );
}

function ArquivoMaterialItem({
  arquivo,
  onChanged,
}: {
  arquivo: ArquivoDrive;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [acao, setAcao] = useState<null | "extrair" | "previa" | "publicar" | "apagar-imgs">(null);
  const [progresso, setProgresso] = useState("");
  const [titulo, setTitulo] = useState(arquivo.nome_arquivo.replace(/\.pdf$/i, ""));
  const [materia, setMateria] = useState(arquivo.subpasta);
  const [estrutura, setEstrutura] = useState<Estrutura | null>(null);
  const [previewSlide, setPreviewSlide] = useState<{ slides: SlideRow[]; aulaTitulo: string } | null>(null);
  const [imgsSelecionadas, setImgsSelecionadas] = useState<Set<string>>(new Set());

  // Carrega prévia salva (se houver) quando o status é 'previa_pronta'
  const previaQ = useQuery({
    queryKey: ["admin", "ai-previa", arquivo.id, arquivo.status_ingestao],
    queryFn: () => obterPreviaArquivo({ data: { arquivoDriveId: arquivo.id } }),
    enabled: arquivo.status_ingestao === "previa_pronta" || arquivo.status_ingestao === "concluido",
  });
  const extracaoQ = useQuery({
    queryKey: ["admin", "ai-extracao", arquivo.id, arquivo.status_ingestao],
    queryFn: () => obterExtracaoArquivo({ data: { arquivoDriveId: arquivo.id } }),
    enabled: ["extraido", "gerando_previa", "previa_pronta", "concluido"].includes(arquivo.status_ingestao),
  });

  useMemo(() => {
    if (previaQ.data?.estrutura) {
      setEstrutura(previaQ.data.estrutura as Estrutura);
      if (previaQ.data.titulo_sugerido) setTitulo(previaQ.data.titulo_sugerido);
      if (previaQ.data.materia_sugerida) setMateria(previaQ.data.materia_sugerida);
    }
    return null;
  }, [previaQ.data]);

  async function rodarExtrair() {
    setAcao("extrair");
    setProgresso("Iniciando extração com Mistral OCR…");
    try {
      await atualizarStatusDrive({
        data: { id: arquivo.id, status_ingestao: "extraindo", erro_msg: null },
      });

      const BATCH = 25;
      let pageStart = 0;
      let done = false;
      let last: any = null;
      while (!done) {
        const res = await fetch("/api/aulas-interativas-extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            arquivoDriveId: arquivo.id,
            pageStart,
            batchSize: BATCH,
          }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
        }
        const j = await res.json();
        last = j;
        const total = j.total as number | null;
        const proc = j.proximaPagina as number;
        const extraidas = j.processadas as number;
        const pct = total ? Math.min(100, Math.round((proc / total) * 100)) : null;
        const imgs = j.imagens as number | undefined;
        setProgresso(
          total
            ? `Extraindo… prova real ${proc}/${total} páginas (${pct}%) · ${extraidas} págs salvas · ${imgs ?? 0} imagens`
            : `Extraindo… ${extraidas} páginas salvas · ${imgs ?? 0} imagens`,
        );
        done = j.done;
        pageStart = j.proximaPagina;
      }
      toast.success(`Extraído: ${last?.processadas ?? "?"}/${last?.total ?? "?"} páginas, ${last?.imagens ?? 0} imagens`);
      setProgresso(
        `Extração pronta: ${last?.processadas ?? "?"}/${last?.total ?? "?"} páginas · ${last?.chars ?? 0} caracteres · ${last?.imagens ?? 0} imagens.`,
      );
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha na extração");
      setProgresso(`Erro: ${err?.message ?? "?"}`);
    } finally {
      setAcao(null);
    }
  }

  async function rodarPrevia() {
    setAcao("previa");
    setProgresso("Conectando ao Gemini…");
    setEstrutura(null);
    try {
      const res = await fetch("/api/aulas-interativas-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ arquivoDriveId: arquivo.id, tituloCurso: titulo, materia }),
      });
      if (!res.ok || !res.body) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finalPayload: any = null;
      let serverError: string | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const raw = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let evt = "message";
          let dataLine = "";
          for (const line of raw.split("\n")) {
            if (line.startsWith("event:")) evt = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
          }
          if (!dataLine) continue;
          let payload: any;
          try {
            payload = JSON.parse(dataLine);
          } catch {
            continue;
          }
          if (evt === "progress") {
            const fase = payload?.fase as string | undefined;
            if (fase === "esqueleto") {
              setProgresso("Gemini planejando módulos e aulas (passo 1/2)…");
            } else if (fase === "slides") {
              const a = payload?.aula ?? 0;
              const t = payload?.total ?? 0;
              const titAula = payload?.aulaTitulo ? ` — ${payload.aulaTitulo}` : "";
              setProgresso(`Gerando slides ${a}/${t}${titAula}`);
            } else if (typeof payload?.chars === "number") {
              setProgresso(`Gemini gerando… ${payload.chars.toLocaleString("pt-BR")} caracteres`);
            }
          } else if (evt === "done") {
            finalPayload = payload;
          } else if (evt === "error") {
            serverError = payload?.error ?? "erro desconhecido";
          } else if (evt === "start") {
            setProgresso("Gemini começou a planejar a estrutura…");
          }
        }
      }

      if (serverError) throw new Error(serverError);
      if (!finalPayload) {
        // stream caiu sem evento final — tenta recuperar o resultado persistido no DB
        for (let tentativa = 0; tentativa < 8 && !finalPayload; tentativa++) {
          if (tentativa > 0) await new Promise((r) => setTimeout(r, 2500));
          setProgresso("A conexão fechou; conferindo se a prévia terminou no servidor…");
          const arqs = await listarArquivosDrive();
          const arqAtual = arqs.find((x) => x.id === arquivo.id);
          if (arqAtual?.status_ingestao === "erro" && arqAtual.erro_msg) {
            throw new Error(arqAtual.erro_msg);
          }
          if (arqAtual?.status_ingestao === "previa_pronta") {
            const pv = await obterPreviaArquivo({ data: { arquivoDriveId: arquivo.id } });
            if (pv?.estrutura) {
              finalPayload = {
                estrutura: pv.estrutura,
                titulo_sugerido: pv.titulo_sugerido,
                materia_sugerida: pv.materia_sugerida,
              };
            }
          }
        }
        if (!finalPayload) {
          throw new Error("A prévia demorou demais e a conexão fechou antes do fim. Tente gerar novamente; reduzi a geração para evitar esse erro.");
        }
      }

      setEstrutura(finalPayload.estrutura);
      if (finalPayload.titulo_sugerido) setTitulo(finalPayload.titulo_sugerido);
      if (finalPayload.materia_sugerida) setMateria(finalPayload.materia_sugerida);
      setProgresso(`Prévia: ${finalPayload.estrutura.modulos.length} módulo(s). Revise abaixo.`);
      onChanged();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha");
      setProgresso(`Erro: ${err?.message ?? "?"}`);
    } finally {
      setAcao(null);
    }
  }

  const publicar = useMutation({
    mutationFn: async (publicado: boolean) => {
      if (!estrutura) throw new Error("Nada para publicar");
      const slug = slugify(titulo);
      const r = await publicarCurso({
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
      await atualizarStatusDrive({
        data: { id: arquivo.id, status_ingestao: "concluido", curso_id: r.cursoId },
      });
      return r;
    },
    onSuccess: () => {
      toast.success("Curso publicado!");
      onChanged();
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const stats = useMemo(() => {
    if (!estrutura) return null;
    let aulas = 0, slides = 0, quizzes = 0;
    for (const m of estrutura.modulos) for (const a of m.aulas) {
      aulas++;
      for (const s of a.slides ?? []) { slides++; if (s.tipo === "quiz") quizzes++; }
    }
    return { mod: estrutura.modulos.length, aulas, slides, quizzes };
  }, [estrutura]);

  const ordem = ordemOAB(arquivo.subpasta);
  const ordemTxt = ordem === 999 ? "—" : String(ordem + 1).padStart(2, "0");

  const status = arquivo.status_ingestao;
  const podeExtrair = status === "pendente" || status === "erro" || status === "extraido" || status === "previa_pronta" || status === "concluido";
  const podePrevia = (status === "extraido" || status === "previa_pronta" || status === "gerando_previa" || status === "concluido") && acao !== "previa";
  const temExtracao = !!extracaoQ.data;

  return (
    <li className="rounded-xl border border-border bg-background px-2 py-3 sm:p-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-10 w-10 rounded-lg bg-gold/10 border border-gold/30 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-wider text-gold/70 leading-none">OAB</span>
          <span className="text-xs font-display text-gold leading-none mt-0.5">{ordemTxt}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm leading-snug break-words">{arquivo.subpasta}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
            {arquivo.nome_arquivo.replace(/\.pdf$/i, "")}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[10px]">
            <span className="text-muted-foreground">{arquivo.bytes ? `${(arquivo.bytes / 1024 / 1024).toFixed(1)} MB` : "?"}</span>
            <span className={`px-1.5 py-0.5 rounded-full border border-border ${statusColor(status)}`}>
              {statusLabel(status)}
            </span>
            {temExtracao && extracaoQ.data?.paginas_total && (
              <span className="text-sky-400/80">
                • {extracaoQ.data.paginas_processadas ?? "?"}/{extracaoQ.data.paginas_total} pág.
              </span>
            )}
            {arquivo.curso_id && <span className="text-emerald-400">• vinculado</span>}
            {arquivo.pdf_url && (
              <a href={arquivo.pdf_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                Ver PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline 3 etapas */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={rodarExtrair}
          disabled={!podeExtrair || acao !== null}
          className="h-9 px-3 rounded-full border border-border bg-background text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          title="1. Extrair texto e imagens com Mistral OCR"
        >
          {acao === "extrair" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanText className="h-3 w-3" />}
          1. Extrair
          {(status === "extraido" || status === "previa_pronta" || status === "concluido") && (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          )}
        </button>

        <button
          onClick={rodarPrevia}
          disabled={!podePrevia || acao !== null}
          className="h-9 px-3 rounded-full border border-border bg-background text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          title="2. Gerar prévia (Gemini estrutura em módulos/aulas/slides)"
        >
          {acao === "previa" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
          2. Gerar prévia
          {(status === "previa_pronta" || status === "concluido") && (
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          )}
        </button>

        <button
          onClick={() => publicar.mutate(true)}
          disabled={!estrutura || publicar.isPending || status === "concluido"}
          className="h-9 px-3 rounded-full bg-gradient-gold text-gold-foreground text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
          title="3. Publicar o curso no Supabase"
        >
          {publicar.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {status === "concluido" ? "3. Publicado" : "3. Publicar curso"}
          {status === "concluido" && <CheckCircle2 className="h-3 w-3" />}
        </button>

        {temExtracao && (
          <button
            onClick={async () => {
              if (!confirm("Apagar páginas extraídas e prévia deste material? Você poderá extrair novamente do zero.")) return;
              setAcao("extrair");
              setProgresso("Apagando extração…");
              try {
                await apagarExtracaoArquivo({ data: { arquivoDriveId: arquivo.id } });
                toast.success("Extração apagada");
                setProgresso("");
                setEstrutura(null);
                qc.invalidateQueries({ queryKey: ["admin"] });
                onChanged();
              } catch (e: any) {
                toast.error(e?.message ?? "Falha ao apagar");
              } finally {
                setAcao(null);
              }
            }}
            disabled={acao !== null}
            className="h-9 px-3 rounded-full border border-destructive/40 text-destructive text-xs inline-flex items-center gap-1.5 disabled:opacity-50 hover:bg-destructive/10"
            title="Apagar páginas extraídas para refazer a extração"
          >
            <Trash2 className="h-3 w-3" />
            Apagar extração
          </button>
        )}

        <button
          onClick={async () => {
            const msg = arquivo.curso_id
              ? "Apagar o curso publicado E a extração deste material? Essa ação não pode ser desfeita."
              : "Apagar extração e resetar este material? Você poderá começar do zero.";
            if (!confirm(msg)) return;
            setAcao("extrair");
            setProgresso("Apagando…");
            try {
              if (arquivo.curso_id) {
                await excluirCurso({ data: { id: arquivo.curso_id } });
              }
              if (temExtracao) {
                await apagarExtracaoArquivo({ data: { arquivoDriveId: arquivo.id } });
              }
              await atualizarStatusDrive({
                data: { id: arquivo.id, status_ingestao: "pendente", curso_id: null, erro_msg: null },
              });
              toast.success("Material apagado e resetado");
              setProgresso("");
              setEstrutura(null);
              qc.invalidateQueries({ queryKey: ["admin"] });
              onChanged();
            } catch (e: any) {
              toast.error(e?.message ?? "Falha ao apagar");
            } finally {
              setAcao(null);
            }
          }}
          disabled={acao !== null}
          className="h-9 px-3 rounded-full border border-destructive/60 bg-destructive/10 text-destructive text-xs inline-flex items-center gap-1.5 disabled:opacity-50 hover:bg-destructive/20"
          title={arquivo.curso_id ? "Apagar o curso publicado e resetar o material" : "Resetar este material"}
        >
          <Trash2 className="h-3 w-3" />
          {arquivo.curso_id ? "Apagar curso" : "Apagar tudo"}
        </button>
      </div>

      {progresso && <p className="mt-2 text-[11px] text-muted-foreground">{progresso}</p>}
      {arquivo.erro_msg && status === "erro" && (
        <p className="mt-2 text-[11px] text-red-400 break-words">⚠ {arquivo.erro_msg}</p>
      )}

      {temExtracao && (() => {
        const imgs = (extracaoQ.data?.imagens as string[] | null) ?? [];
        if (imgs.length === 0) {
          return (
            <p className="mt-2 text-[11px] text-muted-foreground">Sem imagens extraídas.</p>
          );
        }
        const selCount = imgsSelecionadas.size;
        const toggle = (url: string) => {
          setImgsSelecionadas((prev) => {
            const next = new Set(prev);
            if (next.has(url)) next.delete(url);
            else next.add(url);
            return next;
          });
        };
        const selecionarTodas = () => setImgsSelecionadas(new Set(imgs));
        const limpar = () => setImgsSelecionadas(new Set());
        const apagar = async () => {
          if (selCount === 0) return;
          if (!confirm(`Apagar ${selCount} imagem(ns) selecionada(s)? A prévia atual será descartada.`)) return;
          setAcao("apagar-imgs");
          try {
            const r = await apagarImagensExtracao({
              data: { arquivoDriveId: arquivo.id, urls: Array.from(imgsSelecionadas) },
            });
            toast.success(`${r.removidas} imagem(ns) removida(s). Gere a prévia novamente.`);
            setImgsSelecionadas(new Set());
            setEstrutura(null);
            qc.invalidateQueries({ queryKey: ["admin"] });
            onChanged();
          } catch (e: any) {
            toast.error(e?.message ?? "Falha ao apagar imagens");
          } finally {
            setAcao(null);
          }
        };
        return (
          <div className="mt-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-[11px] text-muted-foreground">
                {imgs.length} imagem{imgs.length === 1 ? "" : "ns"} extraída{imgs.length === 1 ? "" : "s"}
                {selCount > 0 && <span className="text-gold"> · {selCount} selecionada(s)</span>}
              </p>
              <div className="flex items-center gap-2 text-[10px]">
                {selCount < imgs.length && (
                  <button onClick={selecionarTodas} className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                    Selecionar todas
                  </button>
                )}
                {selCount > 0 && (
                  <button onClick={limpar} className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                    Limpar
                  </button>
                )}
                {selCount > 0 && (
                  <button
                    onClick={apagar}
                    disabled={acao !== null}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {acao === "apagar-imgs" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Apagar {selCount}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {imgs.map((url, i) => {
                const checked = imgsSelecionadas.has(url);
                return (
                  <div
                    key={i}
                    className={`relative h-16 w-16 rounded-md overflow-hidden border ${checked ? "border-destructive ring-2 ring-destructive/40" : "border-border"} bg-background`}
                    title={`Imagem ${i + 1}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(url)}
                      className="absolute inset-0 w-full h-full"
                      aria-label={`${checked ? "Desmarcar" : "Marcar"} imagem ${i + 1}`}
                    >
                      <img src={url} alt={`Imagem ${i + 1}`} loading="lazy" className={`h-full w-full object-cover ${checked ? "opacity-40" : ""}`} />
                    </button>
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-sm border flex items-center justify-center text-[10px] pointer-events-none ${checked ? "bg-destructive border-destructive text-white" : "bg-background/80 border-border text-transparent"}`}>
                      ✓
                    </span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded bg-background/80 border border-border text-[9px] text-muted-foreground hover:text-foreground"
                      title="Abrir em nova aba"
                    >
                      ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {estrutura && (
        <div className="mt-3 grid md:grid-cols-2 gap-2">
          <label className="text-xs">
            <span className="text-muted-foreground">Título do curso</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
            />
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">Matéria</span>
            <input
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
            />
          </label>
        </div>
      )}

      {estrutura && stats && (
        <div className="mt-3 rounded-lg border border-border bg-card/40 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs text-muted-foreground">
              Prévia: {stats.mod} módulos · {stats.aulas} aulas · {stats.slides} slides · {stats.quizzes} quizzes
            </p>
            <button
              onClick={() => publicar.mutate(false)}
              disabled={publicar.isPending}
              className="h-8 px-3 rounded-full border border-border text-xs disabled:opacity-50"
            >
              Salvar rascunho
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-gold pr-1">
            {estrutura.modulos.map((m, mi) => (
              <details key={mi} className="text-xs" open={mi === 0}>
                <summary className="cursor-pointer">
                  {mi + 1}. {m.titulo} <span className="text-muted-foreground">({m.aulas.length} aulas)</span>
                </summary>
                <ul className="ml-4 mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                  {m.aulas.map((a, ai) => (
                    <li key={ai} className="flex items-center gap-2">
                      <span className="truncate flex-1">• {a.titulo} ({(a.slides ?? []).length} slides)</span>
                      <button
                        onClick={() => {
                          const slides = (a.slides ?? []).map((s, i) => ({
                            id: `p-${mi}-${ai}-${i}`,
                            aula_id: `p-${mi}-${ai}`,
                            ordem: s.ordem ?? i,
                            tipo: s.tipo as any,
                            conteudo: s.conteudo ?? {},
                            imagem_url: s.imagem_url ?? null,
                            quiz_json: s.quiz_json ?? null,
                          })) as SlideRow[];
                          if (slides.length) setPreviewSlide({ slides, aulaTitulo: a.titulo });
                        }}
                        className="text-gold hover:underline inline-flex items-center gap-1"
                      >
                        <Play className="h-3 w-3" /> ver
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      )}

      {previewSlide && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <button
            onClick={() => setPreviewSlide(null)}
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full border border-border bg-card inline-flex items-center justify-center hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
          <SlidePlayer
            slides={previewSlide.slides}
            tituloAula={`[Prévia] ${previewSlide.aulaTitulo}`}
            voltarHref="/admin/aulas-interativas"
          />
        </div>
      )}
    </li>
  );
}

/* ============================================================
   ABA 2 — Upload manual (mantém pipeline original chunked)
   ============================================================ */
function AbaUpload() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("Direito Penal");
  const [progresso, setProgresso] = useState("");
  const [estrutura, setEstrutura] = useState<Estrutura | null>(null);
  const [processando, setProcessando] = useState(false);
  const [previewSlide, setPreviewSlide] = useState<{ slides: SlideRow[]; aulaTitulo: string } | null>(null);

  async function gerarViaVision() {
    if (!file || !titulo.trim()) {
      toast.error("Selecione um PDF e informe o título");
      return;
    }
    if (file.size > 18 * 1024 * 1024) {
      toast.error("Arquivo grande (>18MB). Reduza ou use a aba Drive.");
      return;
    }
    setProcessando(true);
    setProgresso("Codificando PDF…");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      const chunk = 0x8000;
      for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
      const pdfBase64 = btoa(bin);
      setProgresso("Enviando para a IA (Gemini)…");
      const res = await fetch("/api/aulas-interativas-pdf-to-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tituloCurso: titulo, materia, pdfBase64 }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }
      const { estrutura: e } = (await res.json()) as { estrutura: Estrutura };
      setEstrutura(e);
      setProgresso(`Pronto! ${e.modulos.length} módulo(s).`);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha");
      setProgresso(`Erro: ${err?.message ?? "?"}`);
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
          titulo, slug, descricao: "", materia, publicado,
          modulos: estrutura.modulos.filter((m) => m.aulas.length > 0).map((m) => ({
            titulo: m.titulo, descricao: m.descricao ?? "",
            aulas: m.aulas.map((a) => ({
              titulo: a.titulo, descricao: a.descricao ?? "", duracao_min: a.duracao_min ?? 10,
              slides: (a.slides ?? []).map((s, i) => ({
                ordem: s.ordem ?? i, tipo: s.tipo as any, conteudo: s.conteudo ?? {},
                imagem_url: s.imagem_url ?? null, quiz_json: s.quiz_json ?? null,
              })),
            })),
          })),
        },
      });
    },
    onSuccess: () => {
      toast.success("Curso publicado!");
      setEstrutura(null); setFile(null); setTitulo(""); setProgresso("");
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5 mb-8">
      <h2 className="font-display text-lg mb-2">Novo curso a partir de PDF</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Upload direto. Para arquivos &gt;18MB, use a aba Drive.
      </p>
      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título do curso"
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
        />
        <input
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          placeholder="Matéria"
          className="h-10 px-3 rounded-lg border border-border bg-background text-sm"
        />
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/50 p-4 cursor-pointer hover:bg-accent">
        <Upload className="h-5 w-5 text-gold" />
        <div className="flex-1 min-w-0">
          <p className="text-sm">{file ? file.name : "Selecionar PDF (até 18MB)"}</p>
        </div>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={gerarViaVision}
          disabled={processando || !file || !titulo.trim()}
          className="h-10 px-4 rounded-full bg-gradient-toga text-primary-foreground text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          {processando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Gerar curso com IA (Gemini Vision)
        </button>
        {progresso && <span className="text-xs text-muted-foreground">{progresso}</span>}
      </div>

      {estrutura && (
        <div className="mt-4 rounded-xl border border-border bg-background p-3 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">
              {estrutura.modulos.length} módulos
            </p>
            <div className="flex gap-2">
              <button onClick={() => publicar.mutate(false)} className="h-8 px-3 rounded-full border border-border text-xs">Rascunho</button>
              <button onClick={() => publicar.mutate(true)} className="h-8 px-3 rounded-full bg-gradient-gold text-gold-foreground text-xs inline-flex items-center gap-1">
                {publicar.isPending && <Loader2 className="h-3 w-3 animate-spin" />} Publicar
              </button>
            </div>
          </div>
          {estrutura.modulos.map((m, mi) => (
            <details key={mi} className="text-xs mt-1" open={mi === 0}>
              <summary className="cursor-pointer">{mi + 1}. {m.titulo} ({m.aulas.length})</summary>
              <ul className="ml-4 text-[11px] text-muted-foreground">
                {m.aulas.map((a, ai) => (
                  <li key={ai} className="flex items-center gap-2">
                    <span className="flex-1 truncate">• {a.titulo}</span>
                    <button
                      onClick={() => {
                        const slides = (a.slides ?? []).map((s, i) => ({
                          id: `p-${mi}-${ai}-${i}`, aula_id: `p-${mi}-${ai}`,
                          ordem: s.ordem ?? i, tipo: s.tipo as any,
                          conteudo: s.conteudo ?? {}, imagem_url: s.imagem_url ?? null,
                          quiz_json: s.quiz_json ?? null,
                        })) as SlideRow[];
                        if (slides.length) setPreviewSlide({ slides, aulaTitulo: a.titulo });
                      }}
                      className="text-gold hover:underline"
                    >ver</button>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}

      {previewSlide && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <button onClick={() => setPreviewSlide(null)} className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full border border-border bg-card inline-flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
          <SlidePlayer slides={previewSlide.slides} tituloAula={`[Prévia] ${previewSlide.aulaTitulo}`} voltarHref="/admin/aulas-interativas" />
        </div>
      )}
    </section>
  );
}

/* ============================================================
   ABA 3 — Mapas mentais
   ============================================================ */
function AbaMapas() {
  const qc = useQueryClient();
  const arquivosQ = useQuery({
    queryKey: ["admin", "aulas-interativas", "drive"],
    queryFn: () => listarArquivosDrive(),
  });
  const cursosQ = useQuery({
    queryKey: ["admin", "aulas-interativas", "cursos"],
    queryFn: () => listarCursosAdmin(),
  });
  const mapas = useMemo(
    () => ordenarOAB((arquivosQ.data ?? []).filter((a) => a.tipo === "mapa")),
    [arquivosQ.data],
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-5 mb-8">
      <h2 className="font-display text-lg mb-2">Mapas mentais</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Vincule cada mapa a uma aula. Vira um slide do tipo "Mapa mental" no final/onde
        a ordem cair.
      </p>
      {arquivosQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      <ul className="space-y-2">
        {mapas.map((m) => (
          <MapaItem
            key={m.id}
            mapa={m}
            cursos={cursosQ.data ?? []}
            onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "aulas-interativas"] })}
          />
        ))}
      </ul>
    </section>
  );
}

function MapaItem({
  mapa,
  cursos,
  onChanged,
}: {
  mapa: ArquivoDrive;
  cursos: any[];
  onChanged: () => void;
}) {
  const [cursoId, setCursoId] = useState<string>("");
  const [aulaId, setAulaId] = useState<string>("");

  const aulasQ = useQuery({
    queryKey: ["admin", "aulas-do-curso", cursoId],
    queryFn: () => listarAulasDoCurso({ data: { cursoId } }),
    enabled: !!cursoId,
  });

  const vincular = useMutation({
    mutationFn: () => vincularMapaAula({ data: { arquivoDriveId: mapa.id, aulaId } }),
    onSuccess: () => {
      toast.success("Mapa vinculado!");
      setCursoId(""); setAulaId("");
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  const ordem = ordemOAB(mapa.subpasta);
  const ordemTxt = ordem === 999 ? "—" : String(ordem + 1).padStart(2, "0");

  return (
    <li className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-10 w-10 rounded-lg bg-gold/10 border border-gold/30 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-wider text-gold/70 leading-none">OAB</span>
          <span className="text-xs font-display text-gold leading-none mt-0.5">{ordemTxt}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm leading-snug break-words">{mapa.subpasta}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
            {mapa.nome_arquivo.replace(/\.pdf$/i, "")}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-[10px]">
            <span className={`px-1.5 py-0.5 rounded-full border border-border ${statusColor(mapa.status_ingestao)}`}>
              {statusLabel(mapa.status_ingestao)}
            </span>
            {mapa.aula_id && <span className="text-emerald-400">• vinculado</span>}
            {mapa.pdf_url && (
              <a href={mapa.pdf_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                Ver PDF
              </a>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 grid md:grid-cols-3 gap-2">
        <select
          value={cursoId}
          onChange={(e) => { setCursoId(e.target.value); setAulaId(""); }}
          className="h-9 px-2 rounded-lg border border-border bg-background text-xs"
        >
          <option value="">Curso…</option>
          {cursos.map((c) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
        </select>
        <select
          value={aulaId}
          onChange={(e) => setAulaId(e.target.value)}
          disabled={!cursoId || aulasQ.isLoading}
          className="h-9 px-2 rounded-lg border border-border bg-background text-xs"
        >
          <option value="">Aula…</option>
          {(aulasQ.data ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
        </select>
        <button
          onClick={() => vincular.mutate()}
          disabled={!aulaId || vincular.isPending}
          className="h-9 px-3 rounded-full bg-gradient-toga text-primary-foreground text-xs disabled:opacity-50 inline-flex items-center justify-center gap-1"
        >
          {vincular.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Vincular
        </button>
      </div>
    </li>
  );
}

/* ============================================================
   Lista de cursos existentes (sempre visível)
   ============================================================ */
function CursosExistentes() {
  const qc = useQueryClient();
  const cursosQ = useQuery({
    queryKey: ["admin", "aulas-interativas", "cursos"],
    queryFn: () => listarCursosAdmin(),
  });
  const togglePub = useMutation({
    mutationFn: (v: { id: string; publicado: boolean }) => togglePublicarCurso({ data: v }),
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
    <section>
      <h2 className="font-display text-lg mb-3">Cursos existentes</h2>
      {cursosQ.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {cursosQ.data && cursosQ.data.length === 0 && <p className="text-sm text-muted-foreground">Nenhum curso ainda.</p>}
      <ul className="space-y-2">
        {cursosQ.data?.map((c: any) => (
          <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm truncate">{c.titulo}</p>
              <p className="text-xs text-muted-foreground">/{c.slug} · {c.publicado ? "publicado" : "rascunho"}</p>
            </div>
            <button
              onClick={() => togglePub.mutate({ id: c.id, publicado: !c.publicado })}
              className="h-9 px-3 rounded-full border border-border text-xs inline-flex items-center gap-1"
              title={c.publicado ? "Despublicar" : "Publicar"}
            >
              {c.publicado ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => { if (confirm("Excluir curso?")) remover.mutate(c.id); }}
              className="h-9 px-3 rounded-full border border-border text-xs text-red-400 inline-flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function statusColor(s: string) {
  if (s === "concluido") return "text-emerald-400";
  if (s === "erro") return "text-red-400";
  if (s === "extraindo" || s === "gerando_previa" || s === "publicando" || s === "processando") return "text-amber-400";
  if (s === "extraido") return "text-sky-400";
  if (s === "previa_pronta") return "text-indigo-400";
  return "text-muted-foreground";
}

function statusLabel(s: string) {
  if (s === "concluido") return "Curso publicado";
  if (s === "erro") return "Erro";
  if (s === "extraindo") return "Extraindo PDF…";
  if (s === "extraido") return "Texto extraído";
  if (s === "gerando_previa") return "Gerando prévia…";
  if (s === "previa_pronta") return "Prévia pronta";
  if (s === "publicando") return "Publicando…";
  if (s === "processando") return "Processando…";
  return "Pendente";
}

/** Ordem cronológica oficial da 1ª fase da OAB. */
const OAB_ORDEM: string[] = [
  "Ética Profissional",
  "Filosofia do Direito",
  "Direito Constitucional",
  "Direitos Humanos",
  "Direito Internacional",
  "Direito Tributário",
  "Direito Financeiro",
  "Direito Administrativo",
  "Direito Ambiental",
  "Direito Civil",
  "Direito do Consumidor",
  "Direito da Criança e do Adolescente",
  "Direito Empresarial",
  "Direito do Trabalho",
  "Direito Processual do Trabalho",
  "Direito Penal",
  "Direito Processual Civil",
  "Direito Processual Penal",
  "Direito Previdenciário",
  "Direito Eleitoral",
];

function ordemOAB(subpasta: string): number {
  const i = OAB_ORDEM.findIndex((m) => m.toLowerCase() === (subpasta ?? "").toLowerCase());
  return i === -1 ? 999 : i;
}

function ordenarOAB<T extends { subpasta: string; nome_arquivo: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => {
    const da = ordemOAB(a.subpasta);
    const db = ordemOAB(b.subpasta);
    if (da !== db) return da - db;
    return a.nome_arquivo.localeCompare(b.nome_arquivo, "pt-BR");
  });
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
