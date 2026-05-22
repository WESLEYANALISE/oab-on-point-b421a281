import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Search, Star, Clock, List, BookMarked } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRecentes } from "@/lib/vade-mecum-recentes";

export const Route = createFileRoute("/_app/vade-mecum/codigos/")({
  head: () => ({
    meta: [
      { title: "Códigos — Vade Mecum" },
      { name: "description", content: "Todos os códigos brasileiros: Civil, Penal, Processuais, CTN, CLT, CDC e mais." },
    ],
  }),
  component: CodigosListPage,
});

type LeiRow = { slug: string; nome: string; nome_curto: string | null; total_artigos: number };
type Aba = "todos" | "favoritos" | "recentes";

function CodigosListPage() {
  const [query, setQuery] = useState("");
  const [aba, setAba] = useState<Aba>("todos");
  const [userId, setUserId] = useState<string | null>(null);
  const [recentes, setRecentes] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    setRecentes(getRecentes().map((r) => r.slug));
  }, []);

  const { data: leis } = useQuery({
    queryKey: ["vade-mecum", "codigos", "lista"],
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    queryFn: async (): Promise<LeiRow[]> => {
      const { data, error } = await supabase
        .from("vade_mecum_leis")
        .select("slug, nome, nome_curto, total_artigos, ordem, categoria")
        .eq("categoria", "codigo")
        .neq("slug", "cf")
        .order("ordem", { ascending: true, nullsFirst: false })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LeiRow[];
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
      arr = arr.filter(
        (l) =>
          l.nome.toLowerCase().includes(q) ||
          (l.nome_curto ?? "").toLowerCase().includes(q),
      );
    }
    return arr;
  }, [leis, aba, favoritosSlugs, recentes, query]);

  const countTodos = leis?.length ?? 0;
  const countFav = favoritosSlugs?.size ?? 0;
  const countRec = recentes.length;

  return (
    <div className="pb-24">
      <header className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.2] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(60% 80% at 20% 0%, color-mix(in oklab, var(--gold) 40%, transparent), transparent 60%), radial-gradient(50% 70% at 100% 100%, color-mix(in oklab, var(--primary) 50%, transparent), transparent 60%)",
          }}
        />
        <div className="relative px-4 md:px-8 pt-5 pb-7">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gold/30 to-primary/30 border border-gold/30 grid place-items-center shrink-0">
              <BookMarked className="h-6 w-6 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold/90 font-semibold">
                Compilações
              </p>
              <h1 className="font-display font-semibold text-[28px] md:text-[36px] leading-[1.05] tracking-tight mt-1">
                Códigos
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
                Civil, Penal, Processuais, CTN, CLT, CDC, ECA e mais.
              </p>
            </div>
          </div>

          <div className="mt-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/70" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar código…"
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-card/80 backdrop-blur border border-border/70 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm placeholder:text-muted-foreground/70 transition-colors"
            />
          </div>
        </div>
      </header>

      <section className="px-4 md:px-8 mt-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <TabPill ativo={aba === "todos"} onClick={() => setAba("todos")} icone={<List className="h-3.5 w-3.5" />} label="Todos" count={countTodos} />
          <TabPill ativo={aba === "favoritos"} onClick={() => setAba("favoritos")} icone={<Star className="h-3.5 w-3.5" />} label="Favoritos" count={countFav} />
          <TabPill ativo={aba === "recentes"} onClick={() => setAba("recentes")} icone={<Clock className="h-3.5 w-3.5" />} label="Recentes" count={countRec} />
        </div>
      </section>

      <section className="px-4 md:px-8 mt-4 space-y-2.5">
        {lista.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            {aba === "favoritos"
              ? "Nenhum favorito ainda. Abra um código e toque no coração."
              : aba === "recentes"
              ? "Sem códigos recentes — abra um para começar."
              : "Nenhum resultado."}
          </div>
        ) : (
          lista.map((lei) => <CodigoCard key={lei.slug} lei={lei} />)
        )}
      </section>
    </div>
  );
}

function TabPill({ ativo, onClick, icone, label, count }: { ativo: boolean; onClick: () => void; icone: React.ReactNode; label: string; count: number }) {
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
      <span className={`ml-0.5 text-[11px] ${ativo ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}>{count}</span>
    </button>
  );
}

function CodigoCard({ lei }: { lei: LeiRow }) {
  const sigla = (lei.nome_curto ?? lei.nome.split(" ")[0]).toUpperCase();
  return (
    <Link
      to="/vade-mecum/$slug"
      params={{ slug: lei.slug }}
      className="relative flex items-center gap-3.5 pl-4 pr-3 py-3.5 rounded-2xl bg-card/70 border border-border/60 hover:border-gold/40 hover:bg-card transition-all active:scale-[0.99] overflow-hidden cursor-pointer"
    >
      <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-primary" />
      <span className="h-12 w-12 shrink-0 grid place-items-center rounded-2xl text-primary-foreground shadow-md bg-gradient-to-br from-primary to-primary/70">
        <span className="font-bold text-[12px]">{sigla.slice(0, 4)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-foreground text-[15px] leading-tight truncate">{sigla}</span>
        <span className="block text-[12px] text-muted-foreground truncate">{lei.nome}</span>
      </span>
      <span className="text-[10px] text-muted-foreground/70 shrink-0">
        {lei.total_artigos.toLocaleString("pt-BR")} arts.
      </span>
    </Link>
  );
}
