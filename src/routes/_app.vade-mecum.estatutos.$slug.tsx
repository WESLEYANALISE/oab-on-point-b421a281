import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Copy,
  BookOpen,
  Flame,
  Heart,
  LogIn,
} from "lucide-react";
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
  relevancia?: string | null;
  relevancia_nota?: string | null;
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

type Aba = "artigos" | "capitulos" | "relevancia" | "favoritos";

// ----------- Helpers: estrutura -----------
const RE_ESTRUTURA = /^(livro|parte|t[íi]tulo|cap[íi]tulo|se[çc][ãa]o|subse[çc][ãa]o|disposi[çc][õo]es)\b/i;

function tipoEstrutura(n: string | null): string | null {
  if (!n) return null;
  const m = n.trim().match(RE_ESTRUTURA);
  if (!m) return null;
  const t = m[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t.startsWith("livro")) return "livro";
  if (t.startsWith("parte")) return "parte";
  if (t.startsWith("titulo")) return "titulo";
  if (t.startsWith("capitulo")) return "capitulo";
  if (t.startsWith("subsecao")) return "subsecao";
  if (t.startsWith("secao")) return "secao";
  if (t.startsWith("disposic")) return "disposicoes";
  return null;
}

const NIVEIS: Record<string, number> = {
  livro: 1,
  parte: 2,
  titulo: 3,
  capitulo: 4,
  secao: 5,
  subsecao: 6,
  disposicoes: 3,
};

type Nó = {
  id: string;
  tipo: string;
  rotulo: string;
  texto: string;
  filhos: Nó[];
  artigos: ArtigoLista[];
};

function montarArvore(artigos: ArtigoLista[]): Nó[] {
  const raiz: Nó[] = [];
  const pilha: Nó[] = [];

  const empurraEm = (lista: Nó[], no: Nó) => lista.push(no);

  for (const a of artigos) {
    const tipo = tipoEstrutura(a.numero);
    if (tipo) {
      const nivel = NIVEIS[tipo] ?? 99;
      while (pilha.length && (NIVEIS[pilha[pilha.length - 1].tipo] ?? 99) >= nivel) {
        pilha.pop();
      }
      const no: Nó = {
        id: a.id,
        tipo,
        rotulo: (a.numero ?? "").trim(),
        texto: a.texto,
        filhos: [],
        artigos: [],
      };
      if (pilha.length === 0) empurraEm(raiz, no);
      else pilha[pilha.length - 1].filhos.push(no);
      pilha.push(no);
    } else {
      if (pilha.length === 0) {
        // artigos antes de qualquer marcador → vão para um grupo "Disposições Preliminares"
        const fallback: Nó = {
          id: "_pre_" + a.id,
          tipo: "disposicoes",
          rotulo: "Disposições",
          texto: "",
          filhos: [],
          artigos: [a],
        };
        raiz.push(fallback);
        pilha.push(fallback);
      } else {
        pilha[pilha.length - 1].artigos.push(a);
      }
    }
  }
  return raiz;
}

// ----------- Page -----------
function EstatutoArtigosPage() {
  const { slug } = Route.useParams();
  const [query, setQuery] = useState("");
  const [artigoId, setArtigoId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("artigos");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserId(s?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

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
        .select("id, numero, texto, ordem, relevancia, relevancia_nota")
        .eq("lei_id", leiData.id)
        .order("ordem", { ascending: true })
        .limit(2000);
      if (artErr) throw artErr;

      return { lei: leiData as Lei, artigos: (artigos ?? []) as ArtigoLista[] };
    },
  });

  // Favoritos desta lei
  const { data: favoritos } = useQuery({
    enabled: !!userId && !!data?.lei.id,
    queryKey: ["vade-mecum", "favoritos", data?.lei.id, userId],
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any)
        .from("vade_mecum_favoritos")
        .select("artigo_id")
        .eq("user_id", userId!)
        .eq("lei_id", data!.lei.id);
      if (error) throw error;
      return new Set<string>((rows ?? []).map((r: any) => r.artigo_id));
    },
  });

  const artigos = data?.artigos ?? [];

  // Apenas artigos numerados (sem marcadores estruturais)
  const apenasArtigos = useMemo(
    () => artigos.filter((a) => !tipoEstrutura(a.numero)),
    [artigos],
  );

  const filtrarPorBusca = (lista: ArtigoLista[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(
      (a) =>
        (a.numero ?? "").toLowerCase().includes(q) ||
        a.texto.toLowerCase().includes(q),
    );
  };

  const listaArtigos = useMemo(() => filtrarPorBusca(apenasArtigos), [apenasArtigos, query]);

  const listaRelevancia = useMemo(() => {
    const ordem: Record<string, number> = { muito_alta: 0, alta: 1, media: 2 };
    return filtrarPorBusca(
      apenasArtigos.filter((a) => !!a.relevancia),
    ).sort((a, b) => (ordem[a.relevancia ?? ""] ?? 9) - (ordem[b.relevancia ?? ""] ?? 9));
  }, [apenasArtigos, query]);

  const listaFavoritos = useMemo(() => {
    if (!favoritos) return [];
    return filtrarPorBusca(apenasArtigos.filter((a) => favoritos.has(a.id)));
  }, [apenasArtigos, favoritos, query]);

  const arvore = useMemo(() => montarArvore(artigos), [artigos]);

  const rotulo =
    ESTATUTOS_DESTAQUE.find((e) => e.slug === slug)?.rotulo ??
    data?.lei.nome_curto ??
    data?.lei.nome ??
    "Estatuto";

  // navegação entre artigos no Sheet — usa a lista da aba atual
  const listaAtiva =
    aba === "relevancia" ? listaRelevancia : aba === "favoritos" ? listaFavoritos : listaArtigos;
  const indiceAtual = artigoId ? listaAtiva.findIndex((a) => a.id === artigoId) : -1;
  const navegar = (delta: number) => {
    const next = listaAtiva[indiceAtual + delta];
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

      {/* Tabs full-width */}
      <nav className="sticky top-0 z-10 grid grid-cols-4 bg-background/95 backdrop-blur border-b border-border/60">
        {([
          { id: "artigos", label: "Artigos" },
          { id: "capitulos", label: "Capítulos" },
          { id: "relevancia", label: "Relevância" },
          { id: "favoritos", label: "Favoritos" },
        ] as { id: Aba; label: string }[]).map((t) => {
          const ativo = aba === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              className={`relative h-11 text-[12px] font-medium transition-colors ${
                ativo ? "text-gold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`absolute left-2 right-2 bottom-0 h-[2px] rounded-full transition-all ${
                  ativo ? "bg-gold" : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </nav>

      <section className="px-4 md:px-8 mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-xl border border-border/60 bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : aba === "artigos" ? (
          <ListaArtigos lista={listaArtigos} onOpen={setArtigoId} query={query} />
        ) : aba === "capitulos" ? (
          <ArvoreCapitulos nos={arvore} onOpen={setArtigoId} />
        ) : aba === "relevancia" ? (
          listaRelevancia.length === 0 ? (
            <Vazio
              icone={<Flame className="h-5 w-5 text-gold/70" />}
              titulo="Sem dados de relevância ainda"
              descricao="Em breve marcaremos aqui os artigos mais cobrados em prova."
            />
          ) : (
            <ListaArtigos
              lista={listaRelevancia}
              onOpen={setArtigoId}
              query={query}
              mostrarRelevancia
            />
          )
        ) : (
          // favoritos
          !userId ? (
            <Vazio
              icone={<LogIn className="h-5 w-5 text-gold/70" />}
              titulo="Entre para favoritar artigos"
              descricao="Salve seus artigos preferidos para acessar rápido depois."
            />
          ) : listaFavoritos.length === 0 ? (
            <Vazio
              icone={<Heart className="h-5 w-5 text-gold/70" />}
              titulo="Nenhum favorito ainda"
              descricao="Toque no coração ao abrir um artigo para favoritá-lo."
            />
          ) : (
            <ListaArtigos lista={listaFavoritos} onOpen={setArtigoId} query={query} />
          )
        )}
      </section>

      <ArtigoSheet
        artigoId={artigoId}
        leiId={data?.lei.id ?? null}
        leiRotulo={rotulo}
        userId={userId}
        favorito={!!artigoId && favoritos?.has(artigoId)}
        onClose={() => setArtigoId(null)}
        onPrev={() => navegar(-1)}
        onNext={() => navegar(1)}
        temAnterior={indiceAtual > 0}
        temProximo={indiceAtual >= 0 && indiceAtual < listaAtiva.length - 1}
      />
    </div>
  );
}

// ----------- Subcomponentes -----------

function Vazio({
  icone,
  titulo,
  descricao,
}: {
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center">
      <div className="mx-auto h-10 w-10 grid place-items-center rounded-full bg-card border border-border/60 mb-3">
        {icone}
      </div>
      <p className="text-sm font-medium">{titulo}</p>
      <p className="text-xs text-muted-foreground mt-1">{descricao}</p>
    </div>
  );
}

function BadgeRelevancia({ peso }: { peso: string | null | undefined }) {
  if (!peso) return null;
  const map: Record<string, { label: string; cls: string }> = {
    muito_alta: { label: "Muito cobrado", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
    alta: { label: "Cai muito", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    media: { label: "Relevante", cls: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30" },
  };
  const m = map[peso] ?? map.media;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border ${m.cls}`}>
      <Flame className="h-2.5 w-2.5" />
      {m.label}
    </span>
  );
}

function ListaArtigos({
  lista,
  onOpen,
  query,
  mostrarRelevancia,
}: {
  lista: ArtigoLista[];
  onOpen: (id: string) => void;
  query: string;
  mostrarRelevancia?: boolean;
}) {
  if (lista.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        Nenhum artigo encontrado{query ? ` para "${query}".` : "."}
      </div>
    );
  }
  return (
    <ul className="rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/50 overflow-hidden">
      {lista.map((a) => (
        <li key={a.id}>
          <button
            type="button"
            onClick={() => onOpen(a.id)}
            className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-card/80 transition-colors cursor-pointer group"
          >
            <span className="shrink-0 mt-0.5 h-8 min-w-[44px] px-2 rounded-lg bg-gradient-to-br from-primary/20 to-gold/10 border border-border/50 grid place-items-center text-[11px] font-semibold text-gold">
              {a.numero ? `Art. ${a.numero}` : `#${a.ordem}`}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-foreground/90 line-clamp-2 leading-snug">
                {a.texto}
              </span>
              {mostrarRelevancia && (
                <span className="flex items-center gap-2 mt-1.5">
                  <BadgeRelevancia peso={a.relevancia} />
                  {a.relevancia_nota && (
                    <span className="text-[11px] text-muted-foreground line-clamp-1">
                      {a.relevancia_nota}
                    </span>
                  )}
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ArvoreCapitulos({
  nos,
  onOpen,
}: {
  nos: Nó[];
  onOpen: (id: string) => void;
}) {
  if (nos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        Esta lei não possui divisão em capítulos.
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {nos.map((n) => (
        <NoArvore key={n.id} no={n} nivel={0} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function totalArtigos(no: Nó): number {
  return (
    no.artigos.length +
    no.filhos.reduce((acc, f) => acc + totalArtigos(f), 0)
  );
}

function NoArvore({
  no,
  nivel,
  onOpen,
}: {
  no: Nó;
  nivel: number;
  onOpen: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(nivel === 0 ? false : true);
  const total = totalArtigos(no);
  const corBadge =
    no.tipo === "livro" || no.tipo === "parte" || no.tipo === "titulo"
      ? "from-primary/30 to-gold/15 text-gold border-gold/30"
      : "from-primary/15 to-gold/5 text-gold/80 border-border/60";

  return (
    <li
      className={`${
        nivel === 0
          ? "rounded-xl border border-border/60 bg-card/40 overflow-hidden"
          : "border-l border-border/40 ml-2 pl-2 mt-1"
      }`}
    >
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-card/60 rounded-lg transition-colors"
      >
        <span
          className={`shrink-0 mt-0.5 h-7 px-2 rounded-md bg-gradient-to-br border grid place-items-center text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${corBadge}`}
        >
          {no.rotulo}
        </span>
        <span className="min-w-0 flex-1 text-[13px] text-foreground/90 leading-snug">
          {no.texto || no.rotulo}
          <span className="block text-[10.5px] text-muted-foreground mt-0.5">
            {total} {total === 1 ? "artigo" : "artigos"}
          </span>
        </span>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform ${
            aberto ? "rotate-90" : ""
          }`}
        />
      </button>

      {aberto && (
        <div className="px-2 pb-2">
          {no.filhos.length > 0 && (
            <ul>
              {no.filhos.map((f) => (
                <NoArvore key={f.id} no={f} nivel={nivel + 1} onOpen={onOpen} />
              ))}
            </ul>
          )}
          {no.artigos.length > 0 && (
            <ul className="mt-1 rounded-lg border border-border/40 bg-background/40 divide-y divide-border/30">
              {no.artigos.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(a.id)}
                    className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-card/60 transition-colors group"
                  >
                    <span className="shrink-0 mt-0.5 text-[11px] font-semibold text-gold min-w-[44px]">
                      Art. {a.numero ?? a.ordem}
                    </span>
                    <span className="min-w-0 flex-1 text-[12.5px] text-foreground/80 line-clamp-1 leading-snug">
                      {a.texto}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

// ----------- Sheet -----------
function ArtigoSheet({
  artigoId,
  leiId,
  leiRotulo,
  userId,
  favorito,
  onClose,
  onPrev,
  onNext,
  temAnterior,
  temProximo,
}: {
  artigoId: string | null;
  leiId: string | null;
  leiRotulo: string;
  userId: string | null;
  favorito: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  temAnterior: boolean;
  temProximo: boolean;
}) {
  const queryClient = useQueryClient();

  const { data: artigo, isLoading } = useQuery({
    enabled: !!artigoId,
    queryKey: ["vade-mecum", "artigo", artigoId],
    queryFn: async (): Promise<ArtigoCompleto> => {
      const { data, error } = await supabase
        .from("vade_mecum_artigos")
        .select(
          "id, numero, texto, ordem, comentario, explicacao_tecnico, explicacao_resumido, explicacao_simples_maior16, explicacao_simples_menor16, exemplo, termos, narracao_url, relevancia, relevancia_nota",
        )
        .eq("id", artigoId!)
        .single();
      if (error) throw error;
      return data as ArtigoCompleto;
    },
  });

  const termos = Array.isArray(artigo?.termos) ? (artigo!.termos as unknown[]) : [];

  const toggleFavorito = async () => {
    if (!userId) {
      toast.error("Entre na sua conta para favoritar.");
      return;
    }
    if (!artigoId || !leiId) return;
    try {
      if (favorito) {
        const { error } = await (supabase as any)
          .from("vade_mecum_favoritos")
          .delete()
          .eq("user_id", userId)
          .eq("artigo_id", artigoId);
        if (error) throw error;
        toast.success("Removido dos favoritos");
      } else {
        const { error } = await (supabase as any)
          .from("vade_mecum_favoritos")
          .insert({ user_id: userId, artigo_id: artigoId, lei_id: leiId });
        if (error) throw error;
        toast.success("Adicionado aos favoritos");
      }
      queryClient.invalidateQueries({ queryKey: ["vade-mecum", "favoritos", leiId, userId] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao favoritar");
    }
  };

  return (
    <Sheet open={!!artigoId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-[560px] p-0 flex flex-col gap-0 border-r-gold/20"
      >
        <div className="px-5 pt-5 pb-4 border-b border-border/60 bg-gradient-to-br from-card to-card/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold/90 font-semibold">
                {leiRotulo}
              </p>
              <h2 className="font-display font-semibold text-[22px] tracking-tight mt-1 leading-tight">
                {artigo?.numero ? `Art. ${artigo.numero}` : "Artigo"}
              </h2>
              {artigo?.relevancia && (
                <div className="mt-2">
                  <BadgeRelevancia peso={artigo.relevancia} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 mr-9">
              <button
                type="button"
                onClick={toggleFavorito}
                className={`h-9 w-9 grid place-items-center rounded-lg transition-colors ${
                  favorito
                    ? "text-red-400 bg-red-500/10 hover:bg-red-500/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
                aria-label={favorito ? "Remover dos favoritos" : "Favoritar"}
              >
                <Heart className={`h-4 w-4 ${favorito ? "fill-current" : ""}`} />
              </button>
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

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {isLoading || !artigo ? (
            <div className="space-y-3">
              <div className="h-4 bg-card/60 rounded animate-pulse" />
              <div className="h-4 bg-card/60 rounded animate-pulse w-5/6" />
              <div className="h-4 bg-card/60 rounded animate-pulse w-4/6" />
            </div>
          ) : (
            <>
              <article className="font-serif text-[17px] leading-[1.75] text-foreground/95 whitespace-pre-wrap tracking-[0.005em] [text-wrap:pretty] first-letter:text-[28px] first-letter:font-semibold first-letter:text-gold first-letter:mr-0.5">
                {artigo.texto}
              </article>

              {artigo.relevancia_nota && (
                <section className="rounded-xl border border-gold/20 bg-gold/5 p-4">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-gold/90 font-semibold mb-1.5 inline-flex items-center gap-1.5">
                    <Flame className="h-3 w-3" /> Por que é cobrado
                  </p>
                  <p className="text-[13px] leading-relaxed text-foreground/90">
                    {artigo.relevancia_nota}
                  </p>
                </section>
              )}

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
                    {artigo.explicacao_tecnico || <VazioTxt />}
                  </TabsContent>
                  <TabsContent value="resumido" className="text-sm leading-relaxed text-foreground/90 mt-3">
                    {artigo.explicacao_resumido || <VazioTxt />}
                  </TabsContent>
                  <TabsContent value="simples" className="text-sm leading-relaxed text-foreground/90 mt-3">
                    {artigo.explicacao_simples_maior16 || artigo.explicacao_simples_menor16 || <VazioTxt />}
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

function VazioTxt() {
  return (
    <span className="text-muted-foreground italic">
      Em breve — explicação será gerada para este artigo.
    </span>
  );
}
