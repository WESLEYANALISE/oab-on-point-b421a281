import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Search, ChevronRight, X, Copy, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ESTATUTOS_DESTAQUE } from "@/lib/vade-mecum-data";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/vade-mecum/estatutos/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${ESTATUTOS_DESTAQUE.find((e) => e.slug === params.slug)?.rotulo ?? "Estatuto"} — Vade Mecum` },
      { name: "description", content: "Leia os artigos do estatuto com explicações em níveis técnico, resumido e simples." },
    ],
  }),
  component: EstatutoArtigosPage,
});

type Lei = {
  id: string;
  slug: string;
  nome: string;
  nome_curto: string | null;
  total_artigos: number;
};

type ArtigoLista = {
  id: string;
  numero: string | null;
  texto: string;
  ordem: number;
};

type ArtigoCompleto = ArtigoLista & {
  comentario: string | null;
  explicacao_tecnico: string | null;
  explicacao_resumido: string | null;
  explicacao_simples_maior16: string | null;
  explicacao_simples_menor16: string | null;
  exemplo: string | null;
  termos: unknown;
  narracao_url: string | null;
};

function EstatutoArtigosPage() {
  const { slug } = Route.useParams();
  const [query, setQuery] = useState("");
  const [artigoId, setArtigoId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vade-mecum", "estatuto", slug],
    queryFn: async () => {
      const { data: leiData, error: leiErr } = await supabase
        .from("vade_mecum_leis")
        .select("id, slug, nome, nome_curto, total_artigos")
        .eq("slug", slug)
        .maybeSingle();
      if (leiErr) throw leiErr;
      if (!leiData) throw new Error("Estatuto não encontrado");

      const { data: artigos, error: artErr } = await supabase
        .from("vade_mecum_artigos")
        .select("id, numero, texto, ordem")
        .eq("lei_id", leiData.id)
        .order("ordem", { ascending: true })
        .limit(2000);
      if (artErr) throw artErr;

      return { lei: leiData as Lei, artigos: (artigos ?? []) as ArtigoLista[] };
    },
  });

  const artigos = data?.artigos ?? [];
  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return artigos;
    return artigos.filter(
      (a) =>
        (a.numero ?? "").toLowerCase().includes(q) ||
        a.texto.toLowerCase().includes(q),
    );
  }, [artigos, query]);

  const rotulo =
    ESTATUTOS_DESTAQUE.find((e) => e.slug === slug)?.rotulo ??
    data?.lei.nome_curto ??
    data?.lei.nome ??
    "Estatuto";

  const indiceAtual = artigoId ? filtrados.findIndex((a) => a.id === artigoId) : -1;
  const navegar = (delta: number) => {
    const next = filtrados[indiceAtual + delta];
    if (next) setArtigoId(next.id);
  };

  return (
    <div className="pb-20">
      <header className="border-b border-border/60 px-4 md:px-8 pt-5 pb-5 bg-card/30">
        <Link
          to="/vade-mecum/estatutos"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Estatutos
        </Link>
        <h1 className="font-display font-semibold text-[22px] md:text-[28px] tracking-tight mt-3 leading-tight">
          {rotulo}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          {data?.lei.total_artigos.toLocaleString("pt-BR") ?? "—"} artigos
        </p>

        <div className="mt-4 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artigo ou texto…"
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-card/80 backdrop-blur border border-border/70 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm placeholder:text-muted-foreground/70"
          />
        </div>
      </header>

      <section className="px-4 md:px-8 mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-xl border border-border/60 bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Nenhum artigo encontrado{query ? ` para "${query}".` : "."}
          </div>
        ) : (
          <ul className="rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/50 overflow-hidden">
            {filtrados.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setArtigoId(a.id)}
                  className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-card/80 transition-colors cursor-pointer group"
                >
                  <span className="shrink-0 mt-0.5 h-8 min-w-[44px] px-2 rounded-lg bg-gradient-to-br from-primary/20 to-gold/10 border border-border/50 grid place-items-center text-[11px] font-semibold text-gold">
                    {a.numero ? `Art. ${a.numero}` : `#${a.ordem}`}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-foreground/90 line-clamp-2 leading-snug">
                    {a.texto}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ArtigoSheet
        artigoId={artigoId}
        leiRotulo={rotulo}
        onClose={() => setArtigoId(null)}
        onPrev={() => navegar(-1)}
        onNext={() => navegar(1)}
        temAnterior={indiceAtual > 0}
        temProximo={indiceAtual >= 0 && indiceAtual < filtrados.length - 1}
      />
    </div>
  );
}

function ArtigoSheet({
  artigoId,
  leiRotulo,
  onClose,
  onPrev,
  onNext,
  temAnterior,
  temProximo,
}: {
  artigoId: string | null;
  leiRotulo: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  temAnterior: boolean;
  temProximo: boolean;
}) {
  const { data: artigo, isLoading } = useQuery({
    enabled: !!artigoId,
    queryKey: ["vade-mecum", "artigo", artigoId],
    queryFn: async (): Promise<ArtigoCompleto> => {
      const { data, error } = await supabase
        .from("vade_mecum_artigos")
        .select(
          "id, numero, texto, ordem, comentario, explicacao_tecnico, explicacao_resumido, explicacao_simples_maior16, explicacao_simples_menor16, exemplo, termos, narracao_url",
        )
        .eq("id", artigoId!)
        .single();
      if (error) throw error;
      return data as ArtigoCompleto;
    },
  });

  const termos = Array.isArray(artigo?.termos) ? (artigo!.termos as unknown[]) : [];

  return (
    <Sheet open={!!artigoId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-[560px] p-0 flex flex-col gap-0 border-r-gold/20"
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/60 bg-gradient-to-br from-card to-card/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold/90 font-semibold">
                {leiRotulo}
              </p>
              <h2 className="font-display font-semibold text-[22px] tracking-tight mt-1 leading-tight">
                {artigo?.numero ? `Art. ${artigo.numero}` : "Artigo"}
              </h2>
            </div>
            <div className="flex items-center gap-1 shrink-0 mr-9">
              <button
                type="button"
                onClick={() => {
                  if (artigo?.texto) {
                    navigator.clipboard.writeText(artigo.texto);
                    toast.success("Texto copiado");
                  }
                }}
                className="h-9 w-9 grid place-items-center rounded-lg hover:bg-card transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Copiar"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {isLoading || !artigo ? (
            <div className="space-y-3">
              <div className="h-4 bg-card/60 rounded animate-pulse" />
              <div className="h-4 bg-card/60 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-card/60 rounded animate-pulse w-4/6" />
            </div>
          ) : (
            <>
              <article className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap font-serif">
                {artigo.texto}
              </article>

              {/* Explicações */}
              <section>
                <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-2 inline-flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> Explicação
                </p>
                <Tabs defaultValue="tecnico" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full">
                    <TabsTrigger value="tecnico">Técnica</TabsTrigger>
                    <TabsTrigger value="resumido">Resumida</TabsTrigger>
                    <TabsTrigger value="simples">Simples</TabsTrigger>
                  </TabsList>
                  <TabsContent value="tecnico" className="text-sm leading-relaxed text-foreground/90 mt-3">
                    {artigo.explicacao_tecnico || <Vazio />}
                  </TabsContent>
                  <TabsContent value="resumido" className="text-sm leading-relaxed text-foreground/90 mt-3">
                    {artigo.explicacao_resumido || <Vazio />}
                  </TabsContent>
                  <TabsContent value="simples" className="text-sm leading-relaxed text-foreground/90 mt-3">
                    {artigo.explicacao_simples_maior16 || artigo.explicacao_simples_menor16 || <Vazio />}
                  </TabsContent>
                </Tabs>
              </section>

              {artigo.exemplo && (
                <section>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-2">
                    Exemplo prático
                  </p>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm leading-relaxed">
                    {artigo.exemplo}
                  </div>
                </section>
              )}

              {artigo.comentario && (
                <section>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-2">
                    Comentário
                  </p>
                  <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-sm leading-relaxed">
                    {artigo.comentario}
                  </div>
                </section>
              )}

              {termos.length > 0 && (
                <section>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-2">
                    Termos-chave
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {termos.slice(0, 24).map((t, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20"
                      >
                        {typeof t === "string" ? t : (t as { termo?: string })?.termo ?? ""}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer nav */}
        <div className="border-t border-border/60 px-3 py-3 flex items-center justify-between gap-2 bg-card/40">
          <button
            type="button"
            onClick={onPrev}
            disabled={!temAnterior}
            className="flex-1 h-10 rounded-lg text-sm font-medium border border-border/60 hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ‹ Anterior
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!temProximo}
            className="flex-1 h-10 rounded-lg text-sm font-medium border border-border/60 hover:bg-card disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Próximo ›
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Vazio() {
  return (
    <span className="text-muted-foreground italic">
      Em breve — explicação será gerada para este artigo.
    </span>
  );
}
