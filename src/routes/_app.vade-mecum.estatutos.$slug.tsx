import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { limparTituloLei } from "@/lib/narracoes.utils";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { markdownToWhatsapp } from "@/lib/whatsapp-markdown";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Send,
  Copy,
  Heart,
  Flame,
  ExternalLink,
  Star,
  ListMusic,
  StickyNote,
  Sparkles,
  Radar,
  Scale,
  CheckCircle2,
  X,
  GraduationCap,
  Target,
  Volume2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  MessageCircle,
  Plus,
  Minus,
  Eye,
  EyeOff,
  FileDown,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ESTATUTOS_DESTAQUE, getEstatuto } from "@/lib/vade-mecum-data";
import { pushRecente } from "@/lib/vade-mecum-recentes";
import { useFontScale, SCALES } from "@/hooks/use-font-scale";
import { toast } from "sonner";
import brasao from "@/assets/brasao-republica.png";
import { PraticarPanel } from "@/components/vade-mecum/PraticarPanel";
import { AnotacoesPanel } from "@/components/vade-mecum/AnotacoesPanel";
import { ArtigoFocusOverlay } from "@/components/vade-mecum/ArtigoFocusOverlay";
import { AnimatePresence, motion } from "framer-motion";

export const Route = createFileRoute("/_app/vade-mecum/estatutos/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${ESTATUTOS_DESTAQUE.find((e) => e.slug === params.slug)?.nomeCompleto ?? "Estatuto"} — Vade Mecum` },
      { name: "description", content: "Leia os artigos do estatuto com explicações, exemplos e termos." },
    ],
  }),
  component: EstatutoArtigosPage,
});

type Lei = { id: string; slug: string; nome: string; nome_curto: string | null; total_artigos: number };
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

type Aba = "artigos" | "capitulos" | "relevantes";

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
  livro: 1, parte: 2, titulo: 3, capitulo: 4, secao: 5, subsecao: 6, disposicoes: 3,
};

type Nó = { id: string; tipo: string; rotulo: string; texto: string; filhos: Nó[]; artigos: ArtigoLista[] };

function montarArvore(artigos: ArtigoLista[]): Nó[] {
  const raiz: Nó[] = [];
  const pilha: Nó[] = [];
  for (const a of artigos) {
    const tipo = tipoEstrutura(a.numero);
    if (tipo) {
      const nivel = NIVEIS[tipo] ?? 99;
      while (pilha.length && (NIVEIS[pilha[pilha.length - 1].tipo] ?? 99) >= nivel) pilha.pop();
      const no: Nó = { id: a.id, tipo, rotulo: (a.numero ?? "").trim(), texto: a.texto, filhos: [], artigos: [] };
      if (pilha.length === 0) raiz.push(no);
      else pilha[pilha.length - 1].filhos.push(no);
      pilha.push(no);
    } else {
      if (pilha.length === 0) {
        const fb: Nó = { id: "_pre_" + a.id, tipo: "disposicoes", rotulo: "Disposições Preliminares", texto: "", filhos: [], artigos: [a] };
        raiz.push(fb);
        pilha.push(fb);
      } else pilha[pilha.length - 1].artigos.push(a);
    }
  }
  return raiz;
}

/** Mapa artigoId → caminho hierárquico (Título, Capítulo, Seção…). */
type CaminhoItem = { tipo: string; rotulo: string; texto: string };
function mapearCaminhos(artigos: ArtigoLista[]): Map<string, CaminhoItem[]> {
  const mapa = new Map<string, CaminhoItem[]>();
  const pilha: CaminhoItem[] = [];
  for (const a of artigos) {
    const tipo = tipoEstrutura(a.numero);
    if (tipo) {
      const nivel = NIVEIS[tipo] ?? 99;
      while (pilha.length && (NIVEIS[pilha[pilha.length - 1].tipo] ?? 99) >= nivel) pilha.pop();
      pilha.push({ tipo, rotulo: (a.numero ?? "").trim(), texto: (a.texto ?? "").trim() });
    } else {
      mapa.set(a.id, pilha.slice());
    }
  }
  return mapa;
}

/** Remove "Art. Nº " duplicado do início do texto do artigo. */
function limparPrefixoArtigo(texto: string): string {
  if (!texto) return texto;
  // Casa "Art. 1", "Art. 2º", "Art. 2º-A", "Art. 1.º", "Art. 1°" etc.
  return texto.replace(
    /^\s*art\.?\s*[\dIVXLCDM]+(?:[ºoOªªA]|\.º|°)?(?:[-‑–][A-Za-z\d]+)*\s*[.\-–—:]?\s*/i,
    "",
  );
}

// ----------- Page -----------
export function EstatutoArtigosPage() {
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? "";
  const [query, setQuery] = useState("");
  const [artigoId, setArtigoId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("artigos");
  const [userId, setUserId] = useState<string | null>(null);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  useEffect(() => {
    pushRecente(slug);
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, [slug]);

  const meta = getEstatuto(slug);

  // 1 chamada só: lei + artigos + favoritos + anotações do usuário.
  // RPC `get_estatuto_overview` colapsa 3 round-trips em 1. Conteúdo legal
  // muda raramente: 1h em memória, 24h no localStorage.
  const { data, isLoading } = useQuery({
    queryKey: ["vade-mecum", "estatuto", slug, userId],
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async () => {
      const { data: payload, error } = await (supabase as any).rpc(
        "get_estatuto_overview",
        { _slug: slug, _user_id: userId },
      );
      if (error) throw error;
      if (!payload?.lei) throw new Error("Estatuto não encontrado");
      const lei = payload.lei as Lei;
      const artigos = (payload.artigos ?? []) as ArtigoLista[];
      const favoritos = (payload.favoritos ?? []) as string[];
      const anotados = (payload.anotados ?? []) as string[];
      return { lei, artigos, favoritos, anotados };
    },
  });

  const favoritos = useMemo(
    () => new Set<string>(data?.favoritos ?? []),
    [data?.favoritos],
  );

  const artigos = data?.artigos ?? [];
  const apenasArtigos = useMemo(() => artigos.filter((a) => !!a.numero && !tipoEstrutura(a.numero)), [artigos]);

  const filtrar = (lista: ArtigoLista[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((a) => (a.numero ?? "").toLowerCase().includes(q) || a.texto.toLowerCase().includes(q));
  };

  // Chip-filtros (independentes da aba principal)
  const [filtroChip, setFiltroChip] = useState<null | "favoritos" | "anotacoes" | "radar">(null);

  const idsAnotados = useMemo(
    () => new Set<string>(data?.anotados ?? []),
    [data?.anotados],
  );


  const listaArtigos = useMemo(() => {
    let arr = apenasArtigos;
    if (filtroChip === "favoritos") arr = arr.filter((a) => favoritos?.has(a.id));
    if (filtroChip === "anotacoes") arr = arr.filter((a) => idsAnotados?.has(a.id));
    if (filtroChip === "radar") {
      const ordem: Record<string, number> = { muito_alta: 0, alta: 1, media: 2 };
      arr = arr.filter((a) => !!a.relevancia)
        .sort((a, b) => (ordem[a.relevancia ?? ""] ?? 9) - (ordem[b.relevancia ?? ""] ?? 9));
    }
    return filtrar(arr);
  }, [apenasArtigos, query, filtroChip, favoritos, idsAnotados]);

  const listaRelevantes = useMemo(() => {
    const ordem: Record<string, number> = { muito_alta: 0, alta: 1, media: 2 };
    return apenasArtigos
      .filter((a) => !!a.relevancia)
      .sort((a, b) => (ordem[a.relevancia ?? ""] ?? 9) - (ordem[b.relevancia ?? ""] ?? 9));
  }, [apenasArtigos]);

  const arvore = useMemo(() => montarArvore(artigos), [artigos]);
  const caminhos = useMemo(() => mapearCaminhos(artigos), [artigos]);
  const caminhoAtual = artigoId ? caminhos.get(artigoId) ?? [] : [];

  const indiceAtual = artigoId ? listaArtigos.findIndex((a) => a.id === artigoId) : -1;
  const navegar = (delta: number) => {
    const next = listaArtigos[indiceAtual + delta];
    if (next) setArtigoId(next.id);
  };

  return (
    <div className="pb-24">
      {/* Header dourado com brasão e nome da lei */}
      <header className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.22] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(70% 60% at 50% 0%, color-mix(in oklab, var(--gold) 35%, transparent), transparent 65%), radial-gradient(50% 70% at 0% 100%, color-mix(in oklab, var(--primary) 40%, transparent), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="relative px-4 md:px-8 pt-5 pb-6">
          <div className="flex flex-col items-center text-center">
            <img
              src={brasao}
              alt="Brasão"
              width={80}
              height={80}
              className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-[0_0_22px_color-mix(in_oklab,var(--gold)_30%,transparent)]"
              loading="eager"
            />
            <h1 className="font-display font-semibold text-[15px] sm:text-[18px] md:text-[24px] tracking-[0.04em] mt-2.5 leading-tight uppercase px-2 max-w-full break-words">
              {meta?.nomeCompleto ?? (limparTituloLei(data?.lei.nome ?? "") || "Estatuto")}
            </h1>
            <p className="text-[12.5px] text-muted-foreground mt-1.5">
              {slug === "cf"
                ? "1988"
                : meta?.decreto ?? `${data?.lei.total_artigos.toLocaleString("pt-BR") ?? "—"} artigos`}
            </p>
            {meta?.planaltoUrl && (
              <a
                href={meta.planaltoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-2.5 text-[12px] text-gold hover:text-gold/80 transition-colors font-medium"
              >
                <ExternalLink className="h-3 w-3" />
                Ver no Planalto
              </a>
            )}
            <div className="mt-4 w-24 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          </div>
        </div>
      </header>

      {/* Busca */}
      <section className="px-4 md:px-8 mt-4">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/70" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artigo…"
              className="w-full h-12 pl-10 pr-3 rounded-2xl bg-card/80 backdrop-blur border border-border/70 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm placeholder:text-muted-foreground/70"
            />
          </div>
          <button type="button" className="h-12 px-5 rounded-2xl border border-gold/40 bg-gold/10 text-gold font-semibold text-sm">
            Buscar
          </button>
        </div>
      </section>

      {/* Chips de funções */}
      <section className="px-4 md:px-8 mt-5">
        <div className="grid grid-cols-5 gap-2">
          <ChipFuncao
            ativo={filtroChip === "favoritos"}
            onClick={() => setFiltroChip(filtroChip === "favoritos" ? null : "favoritos")}
            cor="from-yellow-500/30 to-yellow-600/20 border-yellow-400/40 text-yellow-300"
            icone={<Star className="h-5 w-5" />}
            label="Favoritos"
          />
          <ChipFuncao
            ativo={playlistOpen}
            onClick={() => setPlaylistOpen(true)}
            cor="from-sky-500/30 to-blue-600/20 border-sky-400/40 text-sky-300"
            icone={<ListMusic className="h-5 w-5" />}
            label="Playlist"
          />
          <ChipFuncao
            ativo={filtroChip === "anotacoes"}
            onClick={() => setFiltroChip(filtroChip === "anotacoes" ? null : "anotacoes")}
            cor="from-emerald-500/30 to-teal-600/20 border-emerald-400/40 text-emerald-300"
            icone={<StickyNote className="h-5 w-5" />}
            label="Anotações"
          />
          <ChipFuncao
            ativo={false}
            onClick={() => toast.info("Novidades — em breve.")}
            cor="from-violet-500/30 to-purple-600/20 border-violet-400/40 text-violet-300"
            icone={<Sparkles className="h-5 w-5" />}
            label="Novidades"
          />
          <ChipFuncao
            ativo={filtroChip === "radar"}
            onClick={() => setFiltroChip(filtroChip === "radar" ? null : "radar")}
            cor="from-teal-500/30 to-cyan-600/20 border-teal-400/40 text-teal-300"
            icone={<Radar className="h-5 w-5" />}
            label="Radar"
          />
        </div>
      </section>

      {/* Toggle Artigos / Capítulos / Relevantes */}
      <section className="px-4 md:px-8 mt-5">
        <div className="grid grid-cols-3 gap-1.5 rounded-full bg-card/60 border border-border/60 p-1">
          <button
            type="button"
            onClick={() => setAba("artigos")}
            className={`h-10 rounded-full text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
              aba === "artigos"
                ? "bg-gradient-to-br from-gold to-amber-500 text-black shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Scale className="h-4 w-4" />
            Artigos
          </button>
          <button
            type="button"
            onClick={() => setAba("capitulos")}
            className={`h-10 rounded-full text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
              aba === "capitulos"
                ? "bg-gradient-to-br from-gold to-amber-500 text-black shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ChevronRight className="h-4 w-4 rotate-90" />
            Capítulos
          </button>
          <button
            type="button"
            onClick={() => setAba("relevantes")}
            className={`h-10 rounded-full text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
              aba === "relevantes"
                ? "bg-gradient-to-br from-gold to-amber-500 text-black shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="h-4 w-4" />
            Relevantes
          </button>
        </div>
      </section>

      <section className="px-4 md:px-8 mt-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[76px] rounded-2xl border border-border/60 bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div key={aba} className="animate-fade-in">
            {aba === "artigos" ? (
              <ListaArtigos lista={listaArtigos} onOpen={setArtigoId} query={query} />
            ) : aba === "capitulos" ? (
              <ArvoreCapitulos nos={arvore} onOpen={setArtigoId} />
            ) : (
              <ListaArtigos lista={listaRelevantes} onOpen={setArtigoId} query={query} />
            )}
          </div>
        )}
      </section>

      <ArtigoSheet
        artigoId={artigoId}
        leiId={data?.lei.id ?? null}
        leiRotulo={meta?.nomeCompleto?.toUpperCase() ?? data?.lei.nome.toUpperCase() ?? "ESTATUTO"}
        planaltoUrl={meta?.planaltoUrl}
        userId={userId}
        favorito={!!artigoId && !!favoritos?.has(artigoId)}
        caminho={caminhoAtual}
        onClose={() => setArtigoId(null)}
        onPrev={() => navegar(-1)}
        onNext={() => navegar(1)}
        temAnterior={indiceAtual > 0}
        temProximo={indiceAtual >= 0 && indiceAtual < listaArtigos.length - 1}
      />

      <PlaylistSheet
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        leiId={data?.lei.id ?? null}
        leiNome={meta?.nomeCompleto ?? data?.lei.nome ?? "Estatuto"}
      />
    </div>
  );
}

// ----------- Subcomponentes -----------

function ChipFuncao({
  ativo,
  onClick,
  cor,
  icone,
  label,
}: {
  ativo: boolean;
  onClick: () => void;
  cor: string;
  icone: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 group"
    >
      <span
        className={`h-12 w-12 grid place-items-center rounded-full border bg-gradient-to-br transition-all ${cor} ${
          ativo ? "ring-2 ring-gold/60 scale-105" : "group-hover:scale-105"
        }`}
      >
        {icone}
      </span>
      <span className="text-[10.5px] text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </button>
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
}: {
  lista: ArtigoLista[];
  onOpen: (id: string) => void;
  query: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: lista.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 98, // 88px min-height + 10px gap (space-y-2.5)
    overscan: 6,
    measureElement:
      typeof ResizeObserver !== "undefined"
        ? (el) => el.getBoundingClientRect().height
        : undefined,
  });

  if (lista.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        Nenhum artigo encontrado{query ? ` para "${query}".` : "."}
      </div>
    );
  }

  // Virtualiza só listas grandes — listas curtas mantêm o layout simples
  if (lista.length < 40) {
    return (
      <ul className="space-y-2.5">
        {lista.map((a) => (
          <ArtigoItem key={a.id} a={a} onOpen={onOpen} />
        ))}
      </ul>
    );
  }

  const items = virtualizer.getVirtualItems();
  return (
    <div
      ref={parentRef}
      className="overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ height: "calc(100svh - 220px)", contain: "strict" }}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {items.map((vi) => {
          const a = lista[vi.index];
          return (
            <div
              key={a.id}
              data-index={vi.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
                paddingBottom: 10,
              }}
            >
              <ArtigoItem a={a} onOpen={onOpen} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArtigoItem({ a, onOpen }: { a: ArtigoLista; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(a.id)}
      className="relative w-full min-h-[88px] flex items-start gap-3 pl-4 pr-3 py-3.5 rounded-2xl bg-card/70 border border-border/60 hover:border-gold/40 hover:bg-card transition-all cursor-pointer group overflow-hidden text-left active:scale-[0.99]"
    >
      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gold/70" />
      <span className="shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-gold/25 to-amber-600/15 border border-gold/30 grid place-items-center">
        <Scale className="h-5 w-5 text-gold" />
      </span>
      <span className="min-w-0 flex-1 flex flex-col">
        <span className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-[14px] font-bold text-foreground">
            {a.numero ? `Art. ${a.numero}` : `#${a.ordem}`}
          </span>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          {a.relevancia && <BadgeRelevancia peso={a.relevancia} />}
        </span>
        <span
          className="block text-[12.5px] text-muted-foreground leading-snug overflow-hidden"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
        >
          {a.texto}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
    </button>
  );
}

function ArvoreCapitulos({ nos, onOpen }: { nos: Nó[]; onOpen: (id: string) => void }) {
  if (nos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        Esta lei não possui divisão em capítulos.
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {nos.map((n) => <NoArvore key={n.id} no={n} nivel={0} onOpen={onOpen} />)}
    </ul>
  );
}

function totalArtigos(no: Nó): number {
  return no.artigos.length + no.filhos.reduce((acc, f) => acc + totalArtigos(f), 0);
}

function NoArvore({ no, nivel, onOpen }: { no: Nó; nivel: number; onOpen: (id: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const total = totalArtigos(no);
  const temFilhos = no.filhos.length > 0 || no.artigos.length > 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="relative w-full min-h-[88px] flex items-start gap-3 pl-4 pr-3 py-3.5 rounded-2xl bg-card/70 border border-border/60 hover:border-gold/40 hover:bg-card transition-all cursor-pointer group overflow-hidden text-left active:scale-[0.99]"
      >
        <span className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${aberto ? "bg-gold" : "bg-gold/50"}`} />
        <span className="min-w-0 flex-1 flex flex-col gap-1">
          <span className="inline-flex self-start h-6 px-2.5 rounded-md bg-gradient-to-br from-gold/25 to-amber-700/15 border border-gold/30 items-center text-[10px] font-semibold uppercase tracking-wider text-gold whitespace-nowrap">
            {no.rotulo}
          </span>
          <span className="text-[14px] font-semibold text-foreground leading-snug line-clamp-2">
            {no.texto || no.rotulo}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {total} {total === 1 ? "artigo" : "artigos"}
          </span>
        </span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 mt-2 transition-transform ${aberto ? "rotate-90 text-gold" : ""}`} />
      </button>

      {aberto && temFilhos && (
        <div className="mt-2 ml-3 pl-3 border-l border-gold/30 space-y-2.5">
          {no.filhos.length > 0 && (
            <ul className="space-y-2.5">
              {no.filhos.map((f) => <NoArvore key={f.id} no={f} nivel={nivel + 1} onOpen={onOpen} />)}
            </ul>
          )}
          {no.artigos.length > 0 && (
            <ul className="space-y-2">
              {no.artigos.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(a.id)}
                    className="relative w-full min-h-[72px] flex items-start gap-3 pl-4 pr-3 py-3 rounded-xl bg-card/60 border border-border/50 hover:border-gold/40 hover:bg-card transition-all text-left group active:scale-[0.99]"
                  >
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-gold/60" />
                    <span className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-gold/25 to-amber-600/15 border border-gold/30 grid place-items-center">
                      <Scale className="h-4 w-4 text-gold" />
                    </span>
                    <span className="min-w-0 flex-1 flex flex-col">
                      <span className="text-[13px] font-bold text-foreground">
                        Art. {a.numero ?? a.ordem}
                      </span>
                      <span
                        className="block text-[12px] text-muted-foreground leading-snug overflow-hidden"
                        style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
                      >
                        {a.texto}
                      </span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
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

// ============== ARTIGO SHEET (3 telas em uma) ==============

type FuncTab = "estudar" | "praticar" | "narracao" | "anotacoes" | "perguntar";
type ContentTab = "artigo" | "explicacao" | "exemplo" | "termos";

/** Insere quebras de linha antes de incisos (I, II...), parágrafos (§) e "Parágrafo único". */
function formatarQuebrasArtigo(texto: string): string {
  if (!texto) return texto;
  let t = texto.replace(/\s+/g, " ").trim();
  // Remove links em colchetes ex: [https://www.planalto.gov.br/...]
  t = t.replace(/\s*\[\s*https?:\/\/[^\]]+\]\s*/gi, " ");
  // Parágrafos: § 1º, § 2º...
  t = t.replace(/\s*(§\s*\d+[ºo]?)/g, "\n$1");
  // Parágrafo único
  t = t.replace(/\s*(Parágrafo único)/gi, "\n$1");
  // Incisos romanos: " I - ", " II – ", " III — "
  t = t.replace(/\s+([IVXLCDM]+)\s*[-–—]\s+/g, "\n$1 – ");
  // Alíneas: " a) ", " b) "
  t = t.replace(/\s+([a-z])\)\s+/g, "\n$1) ");
  // Normaliza quebras em excesso
  t = t.replace(/\n{2,}/g, "\n");
  return t;
}

const PREFIXO_LEGAL_RE = /^(§\s*\d+[ºo]?|Parágrafo único|[IVXLCDM]+\s*[–-]|[a-z]\))(\s*)/;

/** Renderiza parênteses (com cor) — usado dentro de cada linha. */
function renderParenteses(texto: string, mostrarParenteses: boolean, baseKey: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let depth = 0, start = 0, key = 0;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (ch === "(") {
      if (depth === 0) {
        if (i > start) out.push(<span key={`${baseKey}-${key++}`}>{texto.slice(start, i)}</span>);
        start = i;
      }
      depth++;
    } else if (ch === ")") {
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        const trecho = texto.slice(start, i + 1);
        if (mostrarParenteses) {
          out.push(<span key={`${baseKey}-${key++}`} className="text-amber-400/70 italic">{trecho}</span>);
        }
        start = i + 1;
      }
    }
  }
  if (start < texto.length) out.push(<span key={`${baseKey}-${key++}`}>{texto.slice(start)}</span>);
  return out;
}

/** Quebra em blocos e destaca prefixos legais (§, incisos, alíneas) em dourado. Espaçamento padronizado. */
function renderTextoArtigo(texto: string, mostrarParenteses: boolean): React.ReactNode[] {
  const linhas = texto.split("\n").filter((l) => l.trim().length > 0);
  return linhas.map((linha, idx) => {
    const m = linha.match(PREFIXO_LEGAL_RE);
    const isFirst = idx === 0;
    const content: React.ReactNode[] = [];
    if (m) {
      const prefix = m[1];
      const sep = m[2] ?? "";
      const resto = linha.slice(prefix.length + sep.length);
      content.push(
        <span key={`p-${idx}`} className="font-bold text-gold">{prefix}</span>,
        <span key={`s-${idx}`}>{sep || " "}</span>,
        ...renderParenteses(resto, mostrarParenteses, `r-${idx}`),
      );
    } else {
      content.push(...renderParenteses(linha, mostrarParenteses, `l-${idx}`));
    }
    return (
      <div key={`bloco-${idx}`} className={isFirst ? undefined : "mt-3"}>
        {content}
      </div>
    );
  });
}


function ArtigoSheet({
  artigoId,
  leiId,
  leiRotulo,
  planaltoUrl,
  userId,
  favorito,
  caminho,
  onClose,
  onPrev,
  onNext,
  temAnterior,
  temProximo,
}: {
  artigoId: string | null;
  leiId: string | null;
  leiRotulo: string;
  planaltoUrl?: string;
  userId: string | null;
  favorito: boolean;
  caminho: CaminhoItem[];
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  temAnterior: boolean;
  temProximo: boolean;
}) {
  const queryClient = useQueryClient();
  const [contentTab, setContentTab] = useState<ContentTab>("artigo");
  const [mostrarParenteses, setMostrarParenteses] = useState(false);
  const [chatAberto, setChatAberto] = useState(false);
  // Overlay foco: praticar / anotacoes (estudar é a base do Sheet)
  const [focusMode, setFocusMode] = useState<null | "praticar" | "anotacoes">(null);
  const { scale, increase, decrease, canIncrease, canDecrease } = useFontScale();
  const fontPx = Math.round(16 * scale);

  // Reset quando muda artigo
  useEffect(() => {
    setContentTab("artigo");
    setChatAberto(false);
    setFocusMode(null);
  }, [artigoId]);

  const { data: artigo, isLoading } = useQuery({
    enabled: !!artigoId,
    queryKey: ["vade-mecum", "artigo", artigoId],
    // Artigo individual também é praticamente imutável.
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    refetchOnMount: "always",

    queryFn: async (): Promise<ArtigoCompleto> => {
      const { data, error } = await supabase
        .from("vade_mecum_artigos")
        .select("id, numero, texto, ordem, comentario, explicacao_tecnico, explicacao_resumido, explicacao_simples_maior16, explicacao_simples_menor16, exemplo, termos, narracao_url, relevancia, relevancia_nota")
        .eq("id", artigoId!)
        .single();
      if (error) throw error;
      return data as ArtigoCompleto;
    },
  });

  const termos = Array.isArray(artigo?.termos) ? (artigo!.termos as unknown[]) : [];

  const toggleFavorito = async () => {
    if (!userId) return toast.error("Entre na sua conta para favoritar.");
    if (!artigoId || !leiId) return;
    try {
      if (favorito) {
        const { error } = await (supabase as any).from("vade_mecum_favoritos").delete()
          .eq("user_id", userId).eq("artigo_id", artigoId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("vade_mecum_favoritos")
          .insert({ user_id: userId, artigo_id: artigoId, lei_id: leiId });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["vade-mecum", "estatuto"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao favoritar");
    }
  };

  const copiar = () => {
    if (!artigo?.texto) return;
    navigator.clipboard.writeText(artigo.texto);
    toast.success("Texto copiado");
  };

  return (
    <Sheet open={!!artigoId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[95vh] sm:h-[92vh] w-full sm:max-w-[640px] sm:mx-auto p-0 flex flex-col gap-0 rounded-t-3xl border border-border/60 [&>button]:hidden bg-background"
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-3 border-b border-border/60 bg-gradient-to-b from-card/80 to-card/40">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold/90 font-semibold truncate">
                {leiRotulo}
              </p>
              {caminho.length > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {caminho.map((c, i) => (
                    <p
                      key={i}
                      className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/85 leading-tight truncate"
                      style={{ paddingLeft: `${i * 8}px` }}
                    >
                      {c.rotulo}
                    </p>
                  ))}
                </div>
              )}
              <h2 className="font-display font-bold text-[26px] tracking-tight mt-2 leading-none">
                {artigo?.numero ? `Art. ${artigo.numero}` : "Artigo"}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleFavorito}
                className={`h-9 w-9 grid place-items-center rounded-full transition-colors ${
                  favorito
                    ? "text-red-400 bg-red-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
                aria-label="Favoritar"
              >
                <Heart className={`h-4 w-4 ${favorito ? "fill-current" : ""}`} />
              </button>
              <button
                type="button"
                onClick={copiar}
                className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                aria-label="Copiar"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMostrarParenteses((v) => !v)}
                className={`h-9 w-9 grid place-items-center rounded-full transition-colors ${
                  mostrarParenteses
                    ? "text-amber-400 bg-amber-500/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-card"
                }`}
                aria-label={mostrarParenteses ? "Ocultar alterações" : "Mostrar alterações"}
                title={mostrarParenteses ? "Ocultar texto entre parênteses" : "Mostrar texto entre parênteses"}
              >
                {mostrarParenteses ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-gold to-amber-600 text-black shadow-md active:scale-95 transition"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Toggle 4 abas: Artigo / Explicação / Exemplo / Termos */}
          <div className="mt-4 grid grid-cols-4 w-full">
            {(["artigo", "explicacao", "exemplo", "termos"] as ContentTab[]).map((t) => {
              const labels: Record<ContentTab, string> = {
                artigo: "Artigo", explicacao: "Explicação", exemplo: "Exemplo", termos: "Termos",
              };
              const ativo = contentTab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setContentTab(t)}
                  className={`relative pb-2 text-[12px] sm:text-[13px] font-semibold whitespace-nowrap text-center transition-colors ${
                    ativo ? "text-gold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {labels[t]}
                  {ativo && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-gold rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="relative flex-1 overflow-hidden">
          {/* Watermark brasão — fixo, não rola */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
          >
            <img
              src={brasao}
              alt=""
              width={280}
              height={280}
              loading="lazy"
              decoding="async"
              className="w-[55%] max-w-[280px] opacity-[0.06] select-none"
              draggable={false}
            />
          </div>

          <div className="relative z-10 h-full overflow-y-auto px-5 py-6 pb-56 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {isLoading || !artigo ? (
              <div className="space-y-3">
                <div className="h-4 bg-card/60 rounded animate-pulse" />
                <div className="h-4 bg-card/60 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-card/60 rounded animate-pulse w-4/6" />
              </div>
            ) : (
              // Conteúdo padrão = Estudar. Praticar/Anotações/Perguntar abrem em overlay.
              <div style={{ fontSize: fontPx }}>
                {contentTab === "artigo" && (
                  <div className="space-y-6">
                    <article className="font-serif leading-[1.75] text-foreground/95 whitespace-pre-wrap tracking-[0.005em]">
                      <span className="font-bold text-gold">Art. {artigo.numero ?? "—"} – </span>
                      {renderTextoArtigo(formatarQuebrasArtigo(limparPrefixoArtigo(artigo.texto)), mostrarParenteses)}
                    </article>
                    {planaltoUrl && (
                      <div className="flex justify-center pt-2 pb-4">
                        <a
                          href={planaltoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/40 bg-gold/10 text-gold text-[12.5px] font-semibold hover:bg-gold/15 transition-colors"
                        >
                          <Scale className="h-3.5 w-3.5" />
                          Ver no Planalto
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {contentTab === "explicacao" && (
                  <ExplicacaoView artigo={artigo} />
                )}
                {contentTab === "exemplo" && (
                  <Bloco vazio={!artigo.exemplo}>{artigo.exemplo}</Bloco>
                )}
                {contentTab === "termos" && (
                  <TermosView termos={termos} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Controles flutuantes laterais */}
        <div className="absolute right-3 bottom-48 flex flex-col items-center gap-2 z-10">
          <button
            type="button"
            onClick={() => setChatAberto(true)}
            className="h-11 w-11 rounded-full grid place-items-center bg-gradient-to-br from-gold to-amber-600 text-black shadow-lg active:scale-95"
            aria-label="Perguntar à IA"
          >
            <Sparkles className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center bg-card/90 backdrop-blur border border-border/70 rounded-full overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={increase}
              disabled={!canIncrease}
              className="h-9 w-9 grid place-items-center text-foreground hover:bg-card disabled:opacity-30"
              aria-label="Aumentar fonte"
            >
              <Plus className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-bold text-foreground border-y border-border/60 w-full text-center py-0.5">
              {fontPx}
            </span>
            <button
              type="button"
              onClick={decrease}
              disabled={!canDecrease}
              className="h-9 w-9 grid place-items-center text-foreground hover:bg-card disabled:opacity-30"
              aria-label="Diminuir fonte"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Rodapé: navegação + menu de funções */}
        <div className="border-t border-border/60 bg-[#0e0407] backdrop-blur">
          {/* Anterior / Próximo */}
          <div className="px-3 pt-2.5 pb-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={!temAnterior}
              className="flex-1 h-9 rounded-lg text-[12.5px] font-medium bg-[#2a0d12] border border-[#4a1820] text-rose-100/85 hover:bg-[#371117] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ‹ Anterior
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!temProximo}
              className="flex-1 h-9 rounded-lg text-[12.5px] font-medium bg-[#2a0d12] border border-[#4a1820] text-rose-100/85 hover:bg-[#371117] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Próximo ›
            </button>
          </div>
          {/* Menu de funções (rodapé) */}
          <div className="px-2 pt-1 pb-3 grid grid-cols-5 gap-1 items-end border-t border-border/40">
            <FuncTabBtn ativo={false} onClick={() => setContentTab("artigo")} icone={<GraduationCap className="h-5 w-5" />} label="Estudar" />
            <FuncTabBtn ativo={focusMode === "praticar"} onClick={() => setFocusMode("praticar")} icone={<Target className="h-5 w-5" />} label="Praticar" />
            <NarracaoTabBtn url={artigo?.narracao_url ?? null} />
            <FuncTabBtn ativo={focusMode === "anotacoes"} onClick={() => setFocusMode("anotacoes")} icone={<StickyNote className="h-5 w-5" />} label="Anotações" />
            <FuncTabBtn ativo={chatAberto} onClick={() => setChatAberto(true)} icone={<MessageCircle className="h-5 w-5" />} label="Perguntar" />
          </div>
        </div>

        {/* Overlay foco: Praticar */}
        <AnimatePresence>
          {focusMode === "praticar" && artigo && (
            <ArtigoFocusOverlay
              key="focus-praticar"
              variant="half"
              eyebrow={leiRotulo}
              title={`Praticar · Art. ${artigo.numero ?? "—"}`}
              subtitle="Profa. Ana gera tudo pra você"
              onClose={() => setFocusMode(null)}
            >
                <PraticarPanel artigo={{ id: artigo.id, numero: artigo.numero, texto: artigo.texto, lei_id: leiId ?? undefined }} leiId={leiId} userId={userId} />
            </ArtigoFocusOverlay>
          )}
        </AnimatePresence>

        {/* Overlay foco: Anotações */}
        <AnimatePresence>
          {focusMode === "anotacoes" && artigo && (
            <ArtigoFocusOverlay
              key="focus-anotacoes"
              eyebrow={leiRotulo}
              title={`Anotações · Art. ${artigo.numero ?? "—"}`}
              onClose={() => setFocusMode(null)}
            >
                <AnotacoesPanel
                  userId={userId}
                  leiId={leiId}
                  artigoId={artigo.id}
                  artigoNumero={artigo.numero}
                />
            </ArtigoFocusOverlay>
          )}
        </AnimatePresence>

        {/* Overlay chat IA dedicado ao artigo */}
        <AnimatePresence>
          {chatAberto && artigo && (
            <ChatIAOverlay
              key="chat-ia"
              artigo={artigo}
              leiRotulo={leiRotulo}
              onClose={() => setChatAberto(false)}
            />
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function FuncTabBtn({
  ativo, onClick, icone, label, destaque,
}: {
  ativo: boolean; onClick: () => void; icone: React.ReactNode; label: string; destaque?: boolean;
}) {
  const tamanho = destaque ? "h-14 w-14" : "h-11 w-11";
  const baseElegant = destaque ? "btn-narracao-elegant text-black" : "";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
    >
      <span
        className={`${tamanho} grid place-items-center rounded-full transition-all ${
          destaque
            ? `${baseElegant} ${ativo ? "scale-110 ring-2 ring-gold/60" : ""}`
            : `bg-card/60 border border-border/60 text-white group-hover:bg-card`
        }`}
      >
        {icone}
      </span>
      <span className={`text-[10px] font-medium ${destaque ? "text-gold" : "text-white"}`}>
        {label}
      </span>
    </button>
  );
}

function NarracaoTabBtn({ url }: { url: string | null }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const disabled = !url;

  // Reseta ao trocar de artigo
  useEffect(() => {
    setPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [url]);

  // Pausa ao desmontar
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = () => {
    if (!url) return;
    let a = audioRef.current;
    if (!a) {
      a = new Audio(url);
      a.preload = "auto";
      a.addEventListener("timeupdate", () => {
        if (!a) return;
        const d = a.duration || 0;
        setProgress(d > 0 ? Math.min(1, a.currentTime / d) : 0);
      });
      a.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(1);
      });
      a.addEventListener("pause", () => setPlaying(false));
      a.addEventListener("play", () => setPlaying(true));
      audioRef.current = a;
    }
    if (a.paused) {
      void a.play();
    } else {
      a.pause();
    }
  };

  const pct = Math.round(progress * 100);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-label={disabled ? "Narração indisponível" : playing ? "Pausar narração" : "Reproduzir narração"}
      className="flex flex-col items-center gap-1 group disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span
        className={`relative h-14 w-14 grid place-items-center rounded-full transition-all btn-narracao-elegant text-black ${
          playing ? "scale-110 ring-2 ring-gold/70 shadow-[0_0_24px_rgba(212,175,55,0.55)] animate-[narracao-pulse_1.6s_ease-in-out_infinite]" : ""
        }`}
      >
        {/* Anéis pulsando enquanto narra */}
        {playing && (
          <>
            <span
              aria-hidden
              className="absolute inset-0 rounded-full ring-2 ring-gold/60 animate-ping"
              style={{ animationDuration: "1.8s" }}
            />
            <span
              aria-hidden
              className="absolute -inset-1 rounded-full ring-2 ring-gold/30 animate-ping"
              style={{ animationDuration: "2.4s", animationDelay: "0.4s" }}
            />
          </>
        )}
        {/* Anel de progresso */}
        <svg
          className="absolute inset-0 -rotate-90 pointer-events-none"
          viewBox="0 0 36 36"
          aria-hidden
        >
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth="2.5"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 100.53} 100.53`}
            style={{ transition: "stroke-dasharray 120ms linear" }}
          />
        </svg>
        <span className="relative z-10">
          {playing ? <Pause className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
        </span>
      </span>
      <span className="text-[10px] font-medium text-gold">Narração</span>
    </button>
  );
}

function ExplicacaoView({ artigo }: { artigo: ArtigoCompleto }) {
  const [nivel, setNivel] = useState<"tecnico" | "resumido" | "simples">("resumido");
  const txt =
    nivel === "tecnico" ? artigo.explicacao_tecnico
    : nivel === "resumido" ? artigo.explicacao_resumido
    : artigo.explicacao_simples_maior16 || artigo.explicacao_simples_menor16;
  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-full bg-card/60 border border-border/60 p-1 gap-1">
        {(["tecnico", "resumido", "simples"] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNivel(n)}
            className={`px-3 h-7 rounded-full text-[11.5px] font-semibold transition ${
              nivel === n ? "bg-gold text-black" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {n === "tecnico" ? "Técnica" : n === "resumido" ? "Resumida" : "Simples"}
          </button>
        ))}
      </div>
      <Bloco vazio={!txt}>{txt}</Bloco>
    </div>
  );
}

function Bloco({ children, vazio }: { children?: React.ReactNode; vazio?: boolean }) {
  if (vazio) return <p className="text-muted-foreground italic">Em breve — conteúdo será gerado.</p>;
  return <div className="leading-[1.7] text-foreground/90 whitespace-pre-wrap">{children}</div>;
}

function TermosView({ termos }: { termos: unknown[] }) {
  if (termos.length === 0) return <Bloco vazio />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {termos.slice(0, 60).map((t, i) => (
        <span key={i} className="text-[12px] px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
          {typeof t === "string" ? t : (t as { termo?: string })?.termo ?? ""}
        </span>
      ))}
    </div>
  );
}

function NarracaoView({ url }: { url: string | null }) {
  if (!url) {
    return (
      <div className="text-center py-12">
        <Volume2 className="h-10 w-10 text-gold/60 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Narração ainda não disponível para este artigo.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold">Narração</p>
      <audio src={url} controls className="w-full" />
    </div>
  );
}

function PerguntarPlaceholder({ artigo }: { artigo: ArtigoCompleto }) {
  return (
    <div className="text-center py-10">
      <Sparkles className="h-10 w-10 text-gold/60 mx-auto mb-3" />
      <p className="text-sm font-medium">Pergunte à IA</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        Em breve — você poderá fazer perguntas sobre o Art. {artigo.numero} aqui.
      </p>
    </div>
  );
}


function AnotacoesEditor({
  userId, leiId, artigoId,
}: {
  userId: string | null; leiId: string | null; artigoId: string;
}) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data, isLoading } = useQuery({
    enabled: !!userId,
    queryKey: ["vade-mecum", "anotacao", artigoId, userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vade_mecum_anotacoes")
        .select("conteudo")
        .eq("user_id", userId!)
        .eq("artigo_id", artigoId)
        .maybeSingle();
      if (error) throw error;
      return data?.conteudo ?? "";
    },
  });

  useEffect(() => { if (typeof data === "string") setTexto(data); }, [data]);

  if (!userId) {
    return (
      <div className="text-center py-10">
        <StickyNote className="h-10 w-10 text-gold/60 mx-auto mb-3" />
        <p className="text-sm">Entre na sua conta para criar anotações.</p>
      </div>
    );
  }

  const salvar = async () => {
    if (!leiId) return;
    setSalvando(true);
    try {
      const t = texto.trim();
      if (!t) {
        await (supabase as any).from("vade_mecum_anotacoes").delete()
          .eq("user_id", userId).eq("artigo_id", artigoId);
        toast.success("Anotação removida");
      } else {
        await (supabase as any).from("vade_mecum_anotacoes").upsert({
          user_id: userId, lei_id: leiId, artigo_id: artigoId, conteudo: t,
        }, { onConflict: "user_id,artigo_id" });
        toast.success("Anotação salva");
      }
      queryClient.invalidateQueries({ queryKey: ["vade-mecum", "anotacao", artigoId, userId] });
      queryClient.invalidateQueries({ queryKey: ["vade-mecum", "estatuto"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold">Sua anotação</p>
      {isLoading ? (
        <div className="h-32 bg-card/60 rounded-lg animate-pulse" />
      ) : (
        <>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva sua anotação sobre este artigo…"
            className="w-full min-h-[200px] p-3 rounded-xl bg-card/60 border border-border/60 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm leading-relaxed resize-y"
          />
          <button
            type="button"
            onClick={salvar}
            disabled={salvando}
            className="px-4 h-9 rounded-full bg-gradient-to-br from-gold to-amber-600 text-black font-semibold text-sm shadow-md disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar anotação"}
          </button>
        </>
      )}
    </div>
  );
}

// ============ Chat IA dedicado ao artigo ============
type ChatMsg = { role: "user" | "assistant"; content: string };

function ChatIAOverlay({
  artigo,
  leiRotulo,
  onClose,
}: {
  artigo: ArtigoCompleto;
  leiRotulo: string;
  onClose: () => void;
}) {
  const [mensagens, setMensagens] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [carregando, setCarregando] = useState(false);
  // Índice da mensagem do assistente que está sendo streamada agora (null = nenhuma)
  const [streamingIdx, setStreamingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const sugestoes = useMemo(() => [
    `O que significa o Art. ${artigo.numero} na prática?`,
    `Quais são os pontos mais cobrados em prova sobre este artigo?`,
    `Existe alguma exceção ou polêmica relacionada a este artigo?`,
    `Como esse artigo se aplica em um caso real do dia a dia?`,
  ], [artigo.numero]);

  const enviar = async (texto: string) => {
    const t = texto.trim();
    if (!t || carregando || streamingIdx !== null) return;

    const explicacao =
      artigo.explicacao_resumido ||
      artigo.explicacao_tecnico ||
      artigo.explicacao_simples_maior16 ||
      artigo.explicacao_simples_menor16 ||
      null;

    const novas: ChatMsg[] = [...mensagens, { role: "user", content: t }];
    const idxAssistente = novas.length;
    // já adiciona a bolha vazia do assistente (vai sendo preenchida via stream)
    setMensagens([...novas, { role: "assistant", content: "" }]);
    setInput("");
    setCarregando(true);
    setStreamingIdx(idxAssistente);

    // scroll só uma vez, pra mostrar a pergunta da pessoa
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });

    try {
      const resp = await fetch("/api/artigo-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artigo: {
            leiNome: leiRotulo,
            numero: String(artigo.numero ?? ""),
            texto: artigo.texto,
            explicacao,
          },
          mensagens: novas,
        }),
      });

      if (!resp.ok || !resp.body) {
        const txt = await resp.text().catch(() => "");
        throw new Error(txt || `Erro ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        acumulado += chunk;
        setMensagens((prev) => {
          const copy = prev.slice();
          if (copy[idxAssistente]?.role === "assistant") {
            copy[idxAssistente] = { role: "assistant", content: acumulado };
          }
          return copy;
        });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao consultar IA");
      // remove bolha vazia
      setMensagens((prev) => {
        const copy = prev.slice();
        if (copy[idxAssistente]?.role === "assistant" && !copy[idxAssistente].content) {
          copy.splice(idxAssistente, 1);
        }
        return copy;
      });
    } finally {
      setCarregando(false);
      setStreamingIdx(null);
    }
  };

  const compartilharWhatsApp = (pergunta: string, resposta: string) => {
    const corpo = markdownToWhatsapp(resposta);
    const texto =
      `*Profa. Ana — Art. ${artigo.numero}*\n` +
      `_${leiRotulo}_\n\n` +
      `*Pergunta:* ${pergunta}\n\n` +
      `${corpo}\n\n` +
      `— via OAB On Point`;
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const exportarPDF = async (pergunta: string, resposta: string) => {
    try {
      const { exportarConversaPDF } = await import("@/lib/chat-pdf");
      exportarConversaPDF({
        leiNome: leiRotulo,
        artigoNumero: String(artigo.numero ?? ""),
        pergunta,
        resposta,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar PDF");
    }
  };

  // Encontra a pergunta do usuário imediatamente anterior a uma resposta
  const perguntaAnteriorTo = (idx: number): string => {
    for (let i = idx - 1; i >= 0; i--) {
      if (mensagens[i].role === "user") return mensagens[i].content;
    }
    return "";
  };

  return (
    <>
      <motion.div
        className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={onClose}
      />
      <motion.div
        className="absolute inset-0 z-30 flex flex-col bg-background shadow-2xl"
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.4 }}
        transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }}
      >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border/60 bg-gradient-to-b from-card/80 to-card/40 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/90 font-semibold truncate">
            IA · Art. {artigo.numero}
          </p>
          <h3 className="font-display font-bold text-lg leading-tight truncate">Tire suas dúvidas</h3>
          <p className="text-[11px] text-muted-foreground truncate">{leiRotulo}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-gold to-amber-600 text-black shadow-md active:scale-95 transition shrink-0"
          aria-label="Fechar chat"
        >
          <X className="h-4 w-4" strokeWidth={3} />
        </button>
      </div>

      {/* Conversa */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {mensagens.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center pt-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-gold/30 to-amber-600/20 border border-gold/40 mb-3">
                <Sparkles className="h-6 w-6 text-gold" />
              </div>
              <p className="text-sm font-semibold">Profa. Ana — sua dúvida aqui</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Pergunte qualquer coisa sobre o Art. {artigo.numero}. Escolha uma sugestão ou digite a sua.
              </p>
            </div>
            <div className="space-y-2">
              {sugestoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => enviar(s)}
                  className="w-full text-left px-3.5 py-3 rounded-2xl bg-card/70 border border-border/60 hover:border-gold/50 hover:bg-card transition-colors text-[13px] leading-snug"
                >
                  <Sparkles className="h-3.5 w-3.5 text-gold/70 inline mr-2 -mt-0.5" />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {mensagens.map((m, i) => {
              const ehStreaming = streamingIdx === i && m.role === "assistant";
              const respostaFinalizada =
                m.role === "assistant" && !ehStreaming && m.content.trim().length > 0;
              return (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}>
                  <div
                    className={
                      m.role === "user"
                        ? "max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-[#2a0d12] border border-[#4a1820] text-rose-100/90 text-[13.5px] leading-relaxed whitespace-pre-wrap"
                        : "max-w-[90%] px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-card/70 border border-border/60 text-foreground/95 text-[13.5px] leading-relaxed"
                    }
                  >
                    {m.role === "assistant" ? (
                      <div className="chat-md">
                        {m.content ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              strong: ({ children }) => (
                                <strong className="text-gold font-semibold">{children}</strong>
                              ),
                              em: ({ children }) => <em className="text-amber-200/90">{children}</em>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="leading-snug">{children}</li>,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-gold/60 pl-3 italic text-foreground/80 my-2">
                                  {children}
                                </blockquote>
                              ),
                              code: ({ children }) => (
                                <code className="px-1 py-0.5 rounded bg-background/60 text-amber-200 text-[12.5px]">
                                  {children}
                                </code>
                              ),
                              a: ({ children, href }) => (
                                <a href={href} target="_blank" rel="noreferrer" className="text-gold underline underline-offset-2">
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {m.content}
                          </ReactMarkdown>
                        ) : (
                          <span className="inline-flex gap-1 py-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-gold/70 animate-pulse" />
                            <span className="h-1.5 w-1.5 rounded-full bg-gold/70 animate-pulse [animation-delay:150ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-gold/70 animate-pulse [animation-delay:300ms]" />
                          </span>
                        )}
                        {ehStreaming && m.content && (
                          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-gold/80 align-middle animate-pulse" />
                        )}
                      </div>
                    ) : (
                      m.content
                    )}
                  </div>

                  {respostaFinalizada && (
                    <div className="mt-1.5 ml-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => exportarPDF(perguntaAnteriorTo(i), m.content)}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium text-gold/90 hover:text-gold bg-gold/5 hover:bg-gold/10 border border-gold/20 hover:border-gold/40 transition"
                        aria-label="Exportar resposta em PDF"
                      >
                        <FileDown className="h-3 w-3" />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => compartilharWhatsApp(perguntaAnteriorTo(i), m.content)}
                        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium text-emerald-300/90 hover:text-emerald-200 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-400/40 transition"
                        aria-label="Compartilhar no WhatsApp"
                      >
                        <Share2 className="h-3 w-3" />
                        WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border/60 bg-card/60 backdrop-blur px-3 py-3">
        <form
          onSubmit={(e) => { e.preventDefault(); enviar(input); }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(input); }
            }}
            placeholder={`Pergunte sobre o Art. ${artigo.numero}…`}
            rows={1}
            className="flex-1 max-h-32 resize-none px-3.5 py-2.5 rounded-2xl bg-background border border-border/60 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-[13.5px] leading-relaxed"
          />
          <button
            type="submit"
            disabled={carregando || !input.trim()}
            className="h-10 w-10 shrink-0 grid place-items-center rounded-full bg-gradient-to-br from-gold to-amber-600 text-black shadow-md active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
      </motion.div>
    </>
  );
}

// ============================================================
// PLAYLIST — lista de artigos narrados + player elaborado
// ============================================================

type PlaylistItem = {
  id: string;
  numero: string | null;
  texto: string;
  narracao_url: string;
  ordem: number;
};

function PlaylistSheet({
  open,
  onClose,
  leiId,
  leiNome,
}: {
  open: boolean;
  onClose: () => void;
  leiId: string | null;
  leiNome: string;
}) {
  const [atualId, setAtualId] = useState<string | null>(null);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["playlist-narracoes", leiId],
    enabled: open && !!leiId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vade_mecum_artigos")
        .select("id, numero, texto, ordem, narracao_url")
        .eq("lei_id", leiId!)
        .not("narracao_url", "is", null)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []).filter(
        (a: any) => !!a.numero && !!a.narracao_url,
      ) as PlaylistItem[];
    },
  });

  const idx = atualId ? itens.findIndex((i) => i.id === atualId) : -1;
  const atual = idx >= 0 ? itens[idx] : null;

  const goPrev = () => {
    if (idx > 0) setAtualId(itens[idx - 1].id);
  };
  const goNext = () => {
    if (idx >= 0 && idx < itens.length - 1) setAtualId(itens[idx + 1].id);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && (onClose(), setAtualId(null))}>
      <SheetContent
        side="bottom"
        className="h-[92vh] p-0 overflow-hidden flex flex-col bg-background"
      >
        {atual ? (
          <PlaylistPlayer
            item={atual}
            leiNome={leiNome}
            posicao={idx + 1}
            total={itens.length}
            temAnterior={idx > 0}
            temProximo={idx < itens.length - 1}
            onPrev={goPrev}
            onNext={goNext}
            onVoltar={() => setAtualId(null)}
            onAutoNext={goNext}
          />
        ) : (
          <PlaylistLista
            itens={itens}
            isLoading={isLoading}
            leiNome={leiNome}
            onClose={onClose}
            onSelect={(id) => setAtualId(id)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function PlaylistLista({
  itens,
  isLoading,
  leiNome,
  onClose,
  onSelect,
}: {
  itens: PlaylistItem[];
  isLoading: boolean;
  leiNome: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <header className="px-5 pt-5 pb-4 border-b border-border/60 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 h-8 w-8 grid place-items-center rounded-full bg-card/70 border border-border/60 text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 grid place-items-center rounded-2xl btn-narracao-elegant text-black shadow-lg">
            <ListMusic className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold">
              Playlist de narrações
            </p>
            <h2 className="text-base font-semibold leading-tight truncate">
              {leiNome}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {itens.length} {itens.length === 1 ? "artigo narrado" : "artigos narrados"}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Carregando…
          </div>
        ) : itens.length === 0 ? (
          <div className="text-center py-16 px-6">
            <Volume2 className="h-10 w-10 text-gold/60 mx-auto mb-3" />
            <p className="text-sm font-medium">Nenhuma narração ainda</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              Os artigos narrados deste estatuto aparecerão aqui.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {itens.map((it, i) => (
              <li key={it.id}>
                <button
                  type="button"
                  onClick={() => onSelect(it.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-card/60 border border-border/50 hover:bg-card hover:border-gold/40 transition text-left group"
                >
                  <span className="h-9 w-9 shrink-0 grid place-items-center rounded-lg bg-gold/10 border border-gold/30 text-gold text-[11px] font-semibold tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-semibold text-gold">
                      Art. {it.numero}
                    </span>
                    <span className="block text-[12px] text-muted-foreground line-clamp-1 mt-0.5">
                      {limparPrefixoArtigo(it.texto)}
                    </span>
                  </span>
                  <span className="h-9 w-9 shrink-0 grid place-items-center rounded-full btn-narracao-elegant text-black opacity-90 group-hover:opacity-100 transition">
                    <Play className="h-4 w-4 ml-0.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function PlaylistPlayer({
  item,
  leiNome,
  posicao,
  total,
  temAnterior,
  temProximo,
  onPrev,
  onNext,
  onVoltar,
  onAutoNext,
}: {
  item: PlaylistItem;
  leiNome: string;
  posicao: number;
  total: number;
  temAnterior: boolean;
  temProximo: boolean;
  onPrev: () => void;
  onNext: () => void;
  onVoltar: () => void;
  onAutoNext: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = new Audio(item.narracao_url);
    a.preload = "auto";
    audioRef.current = a;
    const onTime = () => {
      setCur(a.currentTime);
      setDur(a.duration || 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      if (temProximo) onAutoNext();
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onTime);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    void a.play().catch(() => {});
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onTime);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [item.id, item.narracao_url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };

  const seek = (pct: number) => {
    const a = audioRef.current;
    if (!a || !dur) return;
    a.currentTime = Math.max(0, Math.min(dur, dur * pct));
  };

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const pct = dur > 0 ? cur / dur : 0;

  return (
    <>
      <header className="px-5 pt-5 pb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="h-9 w-9 grid place-items-center rounded-full bg-card/70 border border-border/60 text-muted-foreground hover:text-foreground"
          aria-label="Voltar à playlist"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold">
            {posicao} de {total}
          </p>
          <p className="text-[12px] text-muted-foreground truncate">{leiNome}</p>
        </div>
        <span className="h-9 w-9" />
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Arte do player */}
        <div className="px-6 pt-2 pb-6 flex flex-col items-center">
          <div
            className={`relative h-44 w-44 sm:h-52 sm:w-52 rounded-3xl btn-narracao-elegant grid place-items-center shadow-[0_20px_60px_-15px_rgba(212,175,55,0.45)] ${
              playing ? "animate-[narracao-pulse_1.8s_ease-in-out_infinite]" : ""
            }`}
          >
            {playing && (
              <>
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-3xl ring-2 ring-gold/50 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
                <span
                  aria-hidden
                  className="absolute -inset-2 rounded-[28px] ring-2 ring-gold/25 animate-ping"
                  style={{ animationDuration: "2.6s", animationDelay: "0.3s" }}
                />
              </>
            )}
            <Volume2 className="relative h-16 w-16 text-black/80" />
          </div>
          <h3 className="mt-5 text-2xl font-display font-semibold text-gold">
            Art. {item.numero}
          </h3>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground mt-1">
            Narração
          </p>
        </div>

        {/* Texto pra acompanhar */}
        <div className="px-5 pb-6">
          <div className="rounded-2xl bg-card/60 border border-border/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-2">
              Acompanhe a leitura
            </p>
            <p className="text-[14.5px] leading-relaxed whitespace-pre-line">
              {limparPrefixoArtigo(item.texto)}
            </p>
          </div>
        </div>
      </div>

      {/* Controles fixos */}
      <div className="border-t border-border/60 bg-background/95 backdrop-blur px-5 pt-3 pb-5">
        {/* Progresso */}
        <div className="space-y-1.5">
          <div
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct * 100)}
            className="relative h-1.5 rounded-full bg-border/70 cursor-pointer"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              seek((e.clientX - r.left) / r.width);
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold to-amber-500"
              style={{ width: `${pct * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-gold shadow ring-2 ring-background"
              style={{ left: `calc(${pct * 100}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{fmt(cur)}</span>
            <span>{fmt(dur)}</span>
          </div>
        </div>

        {/* Botões */}
        <div className="mt-3 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={onPrev}
            disabled={!temAnterior}
            className="h-11 w-11 grid place-items-center rounded-full bg-card/70 border border-border/60 text-foreground disabled:opacity-40"
            aria-label="Anterior"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggle}
            className="h-16 w-16 grid place-items-center rounded-full btn-narracao-elegant text-black shadow-lg active:scale-95 transition"
            aria-label={playing ? "Pausar" : "Reproduzir"}
          >
            {playing ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!temProximo}
            className="h-11 w-11 grid place-items-center rounded-full bg-card/70 border border-border/60 text-foreground disabled:opacity-40"
            aria-label="Próximo"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
export { SCALES };
