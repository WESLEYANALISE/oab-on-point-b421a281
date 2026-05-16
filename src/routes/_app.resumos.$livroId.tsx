import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, BookOpen, Loader2, ChevronRight, Download } from "lucide-react";
import { obterLivroResumo } from "@/lib/resumos.functions";
import { normalizarTitulo } from "@/lib/titulo";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/resumos/$livroId")({
  component: ResumoTimeline,
});

function ResumoTimeline() {
  const { livroId } = Route.useParams();
  const fn = useServerFn(obterLivroResumo);
  const { data, isPending } = useQuery({
    queryKey: ["resumo-livro", livroId],
    queryFn: () => fn({ data: { resumo_livro_id: livroId } }),
    staleTime: 60_000,
  });
  const [gerandoPdf, setGerandoPdf] = useState(false);

  async function baixarPdf() {
    if (!data) return;
    setGerandoPdf(true);
    const tid = toast.loading("Preparando seu PDF…");
    try {
      const { gerarPdfResumo } = await import("@/lib/pdf-resumo");
      await gerarPdfResumo(
        { titulo: data.livro.titulo, autor: data.livro.autor },
        data.capitulos.map((c) => ({
          ordem: c.ordem,
          titulo: c.titulo,
          conteudo_markdown: c.conteudo_markdown,
        })),
      );
      toast.success("PDF baixado!", { id: tid });
    } catch (e: any) {
      toast.error("Não foi possível gerar o PDF.", { id: tid, description: e?.message });
    } finally {
      setGerandoPdf(false);
    }
  }

  if (isPending || !data) {
    return (
      <div className="px-4 py-12 text-center text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando resumo…
        </span>
      </div>
    );
  }

  const capitulos = data.capitulos ?? [];

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-3xl mx-auto">
      <Link
        to="/resumos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Todos os resumos
      </Link>

      <header className="mb-6 flex gap-4 items-start">
        {data.livro.capa && (
          <img
            src={data.livro.capa}
            alt=""
            className="w-16 md:w-20 aspect-[3/4] object-cover rounded-md flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-3xl leading-tight">{data.livro.titulo}</h1>
          {data.livro.autor && <p className="text-sm text-muted-foreground">{data.livro.autor}</p>}
          <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> {capitulos.length} capítulos
          </p>
        </div>
      </header>

      {!capitulos.length ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Nenhum capítulo disponível.</p>
      ) : (
        <ol className="relative ml-5 space-y-4 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-gold/60 before:via-gold/30 before:to-transparent">
          {capitulos.map((c, i) => (
            <li key={c.id} className="relative pl-7">
              <span className="absolute -left-4 top-4 h-8 w-8 rounded-full bg-gradient-toga border border-gold/50 grid place-items-center text-[11px] font-display font-bold text-gold shadow-[0_4px_14px_-2px_oklch(0.78_0.13_80/0.45)] ring-4 ring-background z-10">
                {c.ordem}
              </span>
              <Link
                to="/resumos/capitulo/$livroId/$ordem"
                params={{ livroId, ordem: String(c.ordem) }}
                style={{ ["--sheen-delay" as any]: `${(capitulos.length - 1 - i) * 90}ms` }}
                className="chapter-sheen group block min-h-[92px] rounded-xl border border-gold/15 bg-gradient-to-br from-[oklch(0.28_0.07_18)] to-[oklch(0.19_0.04_18)] p-4 hover:border-gold/40 hover:-translate-y-0.5 transition-all shadow-md shadow-black/30"
              >
                <div className="flex items-center justify-between gap-3 h-full">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-gold/80 font-semibold">
                      Capítulo {c.ordem}
                    </p>
                    <p className="font-display text-[15px] md:text-base leading-snug mt-1 break-words text-primary-foreground line-clamp-2">
                      {normalizarTitulo(c.titulo)}
                    </p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gold/15 border border-gold/30 grid place-items-center shrink-0 group-hover:bg-gold group-hover:text-gold-foreground transition">
                    <ChevronRight className="h-4 w-4 text-gold group-hover:text-gold-foreground" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
