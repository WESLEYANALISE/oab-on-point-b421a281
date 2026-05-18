import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Search,
  ChevronRight,
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
  MoreHorizontal,
  GraduationCap,
  Target,
  Volume2,
  MessageCircleQuestion,
  Plus,
  Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ESTATUTOS_DESTAQUE, getEstatuto } from "@/lib/vade-mecum-data";
import { pushRecente } from "@/lib/vade-mecum-recentes";
import { useFontScale, SCALES } from "@/hooks/use-font-scale";
import { toast } from "sonner";
import brasao from "@/assets/brasao-republica.png";

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

type Aba = "artigos" | "capitulos";

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

// ----------- Page -----------
function EstatutoArtigosPage() {
  const { slug } = Route.useParams();
  const [query, setQuery] = useState("");
  const [artigoId, setArtigoId] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("artigos");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    pushRecente(slug);
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, [slug]);

  const meta = getEstatuto(slug);

  const { data, isLoading } = useQuery({
    queryKey: ["vade-mecum", "estatuto", slug],
    queryFn: async () => {
      const { data: leiData, error: e1 } = await supabase
        .from("vade_mecum_leis")
        .select("id, slug, nome, nome_curto, total_artigos")
        .eq("slug", slug)
        .maybeSingle();
      if (e1) throw e1;
      if (!leiData) throw new Error("Estatuto não encontrado");
      const { data: artigos, error: e2 } = await supabase
        .from("vade_mecum_artigos")
        .select("id, numero, texto, ordem, relevancia, relevancia_nota")
        .eq("lei_id", leiData.id)
        .order("ordem", { ascending: true })
        .limit(2000);
      if (e2) throw e2;
      return { lei: leiData as Lei, artigos: (artigos ?? []) as ArtigoLista[] };
    },
  });

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
  const apenasArtigos = useMemo(() => artigos.filter((a) => !tipoEstrutura(a.numero)), [artigos]);

  const filtrar = (lista: ArtigoLista[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((a) => (a.numero ?? "").toLowerCase().includes(q) || a.texto.toLowerCase().includes(q));
  };

  // Chip-filtros (independentes da aba principal)
  const [filtroChip, setFiltroChip] = useState<null | "favoritos" | "anotacoes" | "radar">(null);

  const { data: idsAnotados } = useQuery({
    enabled: !!userId && !!data?.lei.id,
    queryKey: ["vade-mecum", "anotacoes-ids", data?.lei.id, userId],
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any)
        .from("vade_mecum_anotacoes")
        .select("artigo_id")
        .eq("user_id", userId!)
        .eq("lei_id", data!.lei.id);
      if (error) throw error;
      return new Set<string>((rows ?? []).map((r: any) => r.artigo_id));
    },
  });

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

  const arvore = useMemo(() => montarArvore(artigos), [artigos]);

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
              {meta?.nomeCompleto ?? data?.lei.nome ?? "Estatuto"}
            </h1>
            <p className="text-[12.5px] text-muted-foreground mt-1.5">
              {meta?.decreto ?? `${data?.lei.total_artigos.toLocaleString("pt-BR") ?? "—"} artigos`}
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
            ativo={false}
            onClick={() => toast.info("Playlist — em breve.")}
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

      {/* Toggle Artigos / Capítulos */}
      <section className="px-4 md:px-8 mt-5">
        <div className="grid grid-cols-2 gap-2 rounded-full bg-card/60 border border-border/60 p-1">
          <button
            type="button"
            onClick={() => setAba("artigos")}
            className={`h-10 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all ${
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
            className={`h-10 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all ${
              aba === "capitulos"
                ? "bg-gradient-to-br from-gold to-amber-500 text-black shadow-md"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ChevronRight className="h-4 w-4 rotate-90" />
            Capítulos
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
        ) : aba === "artigos" ? (
          <ListaArtigos lista={listaArtigos} onOpen={setArtigoId} query={query} />
        ) : (
          <ArvoreCapitulos nos={arvore} onOpen={setArtigoId} />
        )}
      </section>

      <ArtigoSheet
        artigoId={artigoId}
        leiId={data?.lei.id ?? null}
        leiRotulo={meta?.nomeCompleto?.toUpperCase() ?? data?.lei.nome.toUpperCase() ?? "ESTATUTO"}
        planaltoUrl={meta?.planaltoUrl}
        userId={userId}
        favorito={!!artigoId && !!favoritos?.has(artigoId)}
        onClose={() => setArtigoId(null)}
        onPrev={() => navegar(-1)}
        onNext={() => navegar(1)}
        temAnterior={indiceAtual > 0}
        temProximo={indiceAtual >= 0 && indiceAtual < listaArtigos.length - 1}
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
  if (lista.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        Nenhum artigo encontrado{query ? ` para "${query}".` : "."}
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {lista.map((a) => (
        <li key={a.id}>
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
        </li>
      ))}
    </ul>
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

function ArtigoSheet({
  artigoId,
  leiId,
  leiRotulo,
  planaltoUrl,
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
  planaltoUrl?: string;
  userId: string | null;
  favorito: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  temAnterior: boolean;
  temProximo: boolean;
}) {
  const queryClient = useQueryClient();
  const [funcTab, setFuncTab] = useState<FuncTab>("estudar");
  const [contentTab, setContentTab] = useState<ContentTab>("artigo");
  const { scale, increase, decrease, canIncrease, canDecrease } = useFontScale();
  const fontPx = Math.round(16 * scale);

  // Reset quando muda artigo
  useEffect(() => {
    setFuncTab("estudar");
    setContentTab("artigo");
  }, [artigoId]);

  const { data: artigo, isLoading } = useQuery({
    enabled: !!artigoId,
    queryKey: ["vade-mecum", "artigo", artigoId],
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
      queryClient.invalidateQueries({ queryKey: ["vade-mecum", "favoritos", leiId, userId] });
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
              <h2 className="font-display font-bold text-[26px] tracking-tight mt-0.5 leading-none">
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
                className="h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
                aria-label="Mais"
              >
                <MoreHorizontal className="h-4 w-4" />
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

          {/* Função tabs */}
          <div className="mt-4 grid grid-cols-5 gap-1 items-end">
            <FuncTabBtn ativo={funcTab === "estudar"} onClick={() => setFuncTab("estudar")} icone={<GraduationCap className="h-5 w-5" />} label="Estudar" />
            <FuncTabBtn ativo={funcTab === "praticar"} onClick={() => setFuncTab("praticar")} icone={<Target className="h-5 w-5" />} label="Praticar" />
            <FuncTabBtn ativo={funcTab === "narracao"} onClick={() => setFuncTab("narracao")} icone={<Volume2 className="h-6 w-6" />} label="Narração" destaque />
            <FuncTabBtn ativo={funcTab === "anotacoes"} onClick={() => setFuncTab("anotacoes")} icone={<StickyNote className="h-5 w-5" />} label="Anotações" />
            <FuncTabBtn ativo={funcTab === "perguntar"} onClick={() => setFuncTab("perguntar")} icone={<MessageCircleQuestion className="h-5 w-5" />} label="Perguntar" />
          </div>

          {/* Separador dourado */}
          <div className="mt-3 flex items-center justify-center">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-gold/40" />
            <span className="mx-2 h-1.5 w-1.5 rounded-full bg-gold/60 rotate-45" />
            <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/40 to-gold/40" />
          </div>

          {/* Toggle 4 abas: Artigo / Explicação / Exemplo / Termos */}
          <div className="mt-2 grid grid-cols-4 w-full">
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
              className="w-[55%] max-w-[280px] opacity-[0.06] select-none"
              draggable={false}
            />
          </div>

          <div className="relative z-10 h-full overflow-y-auto px-5 py-6 pb-10">
            {isLoading || !artigo ? (
              <div className="space-y-3">
                <div className="h-4 bg-card/60 rounded animate-pulse" />
                <div className="h-4 bg-card/60 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-card/60 rounded animate-pulse w-4/6" />
              </div>
            ) : funcTab === "narracao" ? (
              <NarracaoView url={artigo.narracao_url} />
            ) : funcTab === "anotacoes" ? (
              <AnotacoesEditor userId={userId} leiId={leiId} artigoId={artigo.id} />
            ) : funcTab === "perguntar" ? (
              <PerguntarPlaceholder artigo={artigo} />
            ) : funcTab === "praticar" ? (
              <PraticarPlaceholder />
            ) : (
              // Estudar — usa contentTab
              <div style={{ fontSize: fontPx }}>
                {contentTab === "artigo" && (
                  <div className="space-y-6">
                    <article className="font-serif leading-[1.75] text-foreground/95 whitespace-pre-wrap tracking-[0.005em]">
                      <span className="font-bold text-gold">Art. {artigo.numero ?? "—"} – </span>
                      {artigo.texto}
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
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-2 z-10">
          <button
            type="button"
            onClick={() => setFuncTab("perguntar")}
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

        {/* Nav inferior */}
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
            : ativo
              ? "bg-gradient-to-br from-gold to-amber-600 text-black shadow-md scale-110"
              : "bg-card/60 border border-border/60 text-muted-foreground group-hover:text-foreground"
        }`}
      >
        {icone}
      </span>
      <span className={`text-[10px] font-medium ${ativo || destaque ? "text-gold" : "text-muted-foreground"}`}>
        {label}
      </span>
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

function PraticarPlaceholder() {
  return (
    <div className="text-center py-10">
      <Target className="h-10 w-10 text-gold/60 mx-auto mb-3" />
      <p className="text-sm font-medium">Praticar</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        Em breve — questões relacionadas a este artigo.
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
      queryClient.invalidateQueries({ queryKey: ["vade-mecum", "anotacoes-ids", leiId, userId] });
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

export { SCALES };
