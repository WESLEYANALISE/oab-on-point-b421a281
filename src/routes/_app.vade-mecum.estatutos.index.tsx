import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Star, Clock, List, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ESTATUTOS_DESTAQUE, ESTATUTOS_SLUGS, getEstatuto } from "@/lib/vade-mecum-data";
import { getRecentes } from "@/lib/vade-mecum-recentes";
import brasao from "@/assets/brasao-republica.png";

export const Route = createFileRoute("/_app/vade-mecum/estatutos/")({
  head: () => ({
    meta: [
      { title: "Códigos & Leis — Vade Mecum" },
      { name: "description", content: "Legislação brasileira compilada — estatutos, códigos e leis essenciais." },
    ],
  }),
  component: EstatutosListPage,
});

type LeiRow = { slug: string; nome: string; nome_curto: string | null; total_artigos: number };
type Aba = "todos" | "favoritos" | "recentes";

function EstatutosListPage() {
  const [query, setQuery] = useState("");
  const [aba, setAba] = useState<Aba>("todos");
  const [userId, setUserId] = useState<string | null>(null);
  const [recentes, setRecentes] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    setRecentes(getRecentes().map((r) => r.slug));
  }, []);

  const { data: leis } = useQuery({
    queryKey: ["vade-mecum", "estatutos", "lista"],
    // Catálogo de estatutos quase nunca muda — 1h fresco, 24h persistido.
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<LeiRow[]> => {
      const { data, error } = await supabase
        .from("vade_mecum_leis")
        .select("slug, nome, nome_curto, total_artigos")
        .in("slug", ESTATUTOS_SLUGS);
      if (error) throw error;
      const order = new Map(ESTATUTOS_SLUGS.map((s, i) => [s, i]));
      return (data ?? []).slice().sort(
        (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
      );
    },
  });

  const { data: favoritosSlugs } = useQuery({
    enabled: !!userId,
    queryKey: ["vade-mecum", "leis-favoritas", userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vade_mecum_favoritos")
        .select("lei_id, vade_mecum_leis!inner(slug)")
        .eq("user_id", userId!);
      if (error) return new Set<string>();
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.vade_mecum_leis?.slug && set.add(r.vade_mecum_leis.slug));
      return set;
    },
  });

  const lista = useMemo(() => {
    const base = leis ?? [];
    let arr = base;
    if (aba === "favoritos") arr = base.filter((l) => favoritosSlugs?.has(l.slug));
    if (aba === "recentes") {
      const order = new Map(recentes.map((s, i) => [s, i]));
      arr = base
        .filter((l) => order.has(l.slug))
        .sort((a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((l) => {
        const meta = getEstatuto(l.slug);
        return (
          l.nome.toLowerCase().includes(q) ||
          (l.nome_curto ?? "").toLowerCase().includes(q) ||
          meta?.sigla.toLowerCase().includes(q) ||
          meta?.nomeCompleto.toLowerCase().includes(q)
        );
      });
    }
    return arr;
  }, [leis, aba, favoritosSlugs, recentes, query]);

  const countTodos = leis?.length ?? 0;
  const countFav = favoritosSlugs?.size ?? 0;
  const countRec = recentes.length;

  return (
    <div className="pb-24">
      {/* Header dourado com brasão */}
      <header className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.25] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(70% 60% at 50% 0%, color-mix(in oklab, var(--gold) 35%, transparent), transparent 65%), radial-gradient(50% 70% at 100% 100%, color-mix(in oklab, var(--primary) 40%, transparent), transparent 60%)",
          }}
        />
        {/* dots pattern */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative px-4 md:px-8 pt-4 pb-6">
          <div className="flex items-center justify-end">
            <button
              type="button"
              className="h-9 w-9 grid place-items-center rounded-lg bg-card/60 border border-border/60 text-muted-foreground hover:text-gold transition-colors"
              aria-label="Câmera"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>


          <div className="mt-6 flex flex-col items-center text-center">
            <img
              src={brasao}
              alt="Brasão da República Federativa do Brasil"
              width={96}
              height={96}
              className="h-24 w-24 object-contain drop-shadow-[0_0_25px_color-mix(in_oklab,var(--gold)_30%,transparent)]"
              loading="eager"
            />
            <h1 className="font-display font-semibold text-[26px] md:text-[32px] tracking-[0.04em] mt-3 leading-none text-foreground"
                style={{ fontFamily: "var(--font-display)" }}>
              <span className="bg-gradient-to-b from-foreground to-foreground/80 bg-clip-text">ESTATUTOS</span>
            </h1>
            <p className="text-[12.5px] text-gold/90 mt-1.5 font-medium">
              Legislação brasileira compilada
            </p>
          </div>
        </div>
      </header>

      {/* Busca */}
      <section className="px-4 md:px-8 mt-5">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/70" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar código…"
              className="w-full h-12 pl-10 pr-3 rounded-2xl bg-card/80 backdrop-blur border border-border/70 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm placeholder:text-muted-foreground/70"
            />
          </div>
          <button
            type="button"
            className="h-12 px-5 rounded-2xl bg-gradient-to-br from-gold to-amber-500 text-black font-semibold text-sm shadow-[0_8px_22px_-8px_color-mix(in_oklab,var(--gold)_60%,transparent)] active:scale-[0.97] transition"
          >
            Buscar
          </button>
        </div>
      </section>

      {/* Abas: Todos / Favoritos / Recentes */}
      <section className="px-4 md:px-8 mt-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <TabPill
            ativo={aba === "todos"}
            onClick={() => setAba("todos")}
            icone={<List className="h-3.5 w-3.5" />}
            label="Todos"
            count={countTodos}
          />
          <TabPill
            ativo={aba === "favoritos"}
            onClick={() => setAba("favoritos")}
            icone={<Star className="h-3.5 w-3.5" />}
            label="Favoritos"
            count={countFav}
          />
          <TabPill
            ativo={aba === "recentes"}
            onClick={() => setAba("recentes")}
            icone={<Clock className="h-3.5 w-3.5" />}
            label="Recentes"
            count={countRec}
          />
        </div>
      </section>

      {/* Lista de cards */}
      <section className="px-4 md:px-8 mt-4 space-y-2.5">
        {lista.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            {aba === "favoritos"
              ? "Nenhum favorito ainda. Abra um estatuto e toque no coração."
              : aba === "recentes"
              ? "Sem leis recentes — abra uma para começar."
              : "Nenhum resultado."}
          </div>
        ) : (
          lista.map((lei) => <LeiCard key={lei.slug} lei={lei} />)
        )}
      </section>
    </div>
  );
}

function TabPill({
  ativo,
  onClick,
  icone,
  label,
  count,
}: {
  ativo: boolean;
  onClick: () => void;
  icone: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12.5px] font-semibold border transition-all whitespace-nowrap ${
        ativo
          ? "bg-primary text-primary-foreground border-primary shadow-[0_6px_18px_-8px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
          : "bg-card/60 text-muted-foreground border-border/60 hover:text-foreground"
      }`}
    >
      {icone}
      {label}
      <span className={`ml-0.5 text-[11px] ${ativo ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}>
        {count}
      </span>
    </button>
  );
}

function LeiCard({ lei }: { lei: LeiRow }) {
  const meta = getEstatuto(lei.slug);
  const sigla = meta?.sigla ?? (lei.nome_curto ?? lei.nome.split(" ")[0]);
  const nome = meta?.nomeCompleto ?? lei.nome;
  const barra = meta?.barra ?? "bg-primary";
  const bg = meta?.bg ?? "bg-gradient-to-br from-primary to-primary/70";
  const Icon = meta?.Icon;

  return (
    <Link
      to="/vade-mecum/estatutos/$slug"
      params={{ slug: lei.slug }}
      className="relative flex items-center gap-3.5 pl-4 pr-3 py-3.5 rounded-2xl bg-card/70 border border-border/60 hover:border-gold/40 hover:bg-card transition-all active:scale-[0.99] overflow-hidden cursor-pointer"
    >
      <span className={`absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full ${barra}`} />
      <span className={`h-12 w-12 shrink-0 grid place-items-center rounded-2xl text-white shadow-md ${bg}`}>
        {Icon ? <Icon className="h-6 w-6" strokeWidth={2.2} /> : <span className="font-bold text-[13px]">{sigla.slice(0, 3).toUpperCase()}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-foreground text-[15px] leading-tight truncate">
          {sigla}
        </span>
        <span className="block text-[12px] text-muted-foreground truncate">{nome}</span>
      </span>
      <span className="text-[10px] text-muted-foreground/70 shrink-0">
        {lei.total_artigos.toLocaleString("pt-BR")} arts.
      </span>
    </Link>
  );
}
