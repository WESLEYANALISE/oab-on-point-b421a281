import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Search, Scale, BookMarked, Landmark, Gavel, Library,
  FileText, ScrollText, ShieldCheck, Sparkles, ChevronRight, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/vade-mecum")({
  head: () => ({
    meta: [
      { title: "Vade Mecum — OAB na Risca" },
      { name: "description", content: "Constituição, códigos, leis ordinárias, leis complementares e súmulas. Toda a legislação essencial em um só lugar." },
    ],
  }),
  component: VadeMecumPage,
});

type Categoria = {
  id: string;
  titulo: string;
  descricao: string;
  total: number;
  icon: typeof Scale;
  destaque?: boolean;
  tag: string;
};

const CATEGORIAS: Categoria[] = [
  {
    id: "constituicao",
    titulo: "Constituição Federal",
    descricao: "CF/88, ADCT, emendas e jurisprudência consolidada.",
    total: 250,
    icon: Landmark,
    destaque: true,
    tag: "Norma fundamental",
  },
  {
    id: "codigos",
    titulo: "Códigos",
    descricao: "Civil, Penal, Processuais, CTN, CLT, CDC, ECA e mais.",
    total: 14,
    icon: BookMarked,
    tag: "Compilações",
  },
  {
    id: "leis-ordinarias",
    titulo: "Leis Ordinárias",
    descricao: "Legislação esparsa de uso recorrente na prática jurídica.",
    total: 380,
    icon: ScrollText,
    tag: "Legislação esparsa",
  },
  {
    id: "leis-complementares",
    titulo: "Leis Complementares",
    descricao: "Normas que regulamentam diretamente o texto constitucional.",
    total: 192,
    icon: FileText,
    tag: "Complementar",
  },
  {
    id: "sumulas",
    titulo: "Súmulas",
    descricao: "STF, STJ, TST e enunciados vinculantes.",
    total: 1240,
    icon: Gavel,
    tag: "Jurisprudência",
  },
  {
    id: "estatutos",
    titulo: "Estatutos & Tratados",
    descricao: "OAB, Idoso, PCD, Igualdade Racial e tratados internacionais.",
    total: 10,
    icon: ShieldCheck,
    tag: "Especiais",
  },
];

const DESTAQUES = [
  { id: "cf88", titulo: "Constituição Federal", subtitulo: "CF/88 · 250 artigos" },
  { id: "cc", titulo: "Código Civil", subtitulo: "Lei 10.406/02" },
  { id: "cpc", titulo: "Código de Processo Civil", subtitulo: "Lei 13.105/15" },
  { id: "cp", titulo: "Código Penal", subtitulo: "DL 2.848/40" },
  { id: "cpp", titulo: "Código de Processo Penal", subtitulo: "DL 3.689/41" },
  { id: "clt", titulo: "Consolidação das Leis do Trabalho", subtitulo: "DL 5.452/43" },
  { id: "cdc", titulo: "Código de Defesa do Consumidor", subtitulo: "Lei 8.078/90" },
  { id: "ctn", titulo: "Código Tributário Nacional", subtitulo: "Lei 5.172/66" },
];

function VadeMecumPage() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const destaquesFiltrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DESTAQUES;
    return DESTAQUES.filter(
      (d) => d.titulo.toLowerCase().includes(q) || d.subtitulo.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="pb-20">
      {/* Header / hero */}
      <header className="relative overflow-hidden border-b border-border/60">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(60% 80% at 20% 0%, color-mix(in oklab, var(--gold) 40%, transparent), transparent 60%), radial-gradient(50% 70% at 100% 100%, color-mix(in oklab, var(--primary) 50%, transparent), transparent 60%)",
          }}
        />
        <div className="relative px-4 md:px-8 pt-5 pb-7">
          <div className="mt-5 flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gold/30 to-primary/30 border border-gold/30 grid place-items-center shrink-0">
              <Scale className="h-6 w-6 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold/90 font-semibold">
                Biblioteca jurídica
              </p>
              <h1 className="font-display font-semibold text-[28px] md:text-[36px] leading-[1.05] tracking-tight mt-1">
                Vade Mecum
              </h1>
              <p className="text-sm md:text-[15px] text-muted-foreground mt-1.5 max-w-xl">
                Constituição, códigos, leis e súmulas. Toda a legislação essencial, organizada e pronta para consulta.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mt-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar lei, artigo, súmula…"
              className="w-full h-12 pl-10 pr-4 rounded-xl bg-card/80 backdrop-blur border border-border/70 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm placeholder:text-muted-foreground/70 transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Principais */}
      <section className="px-4 md:px-8 mt-8">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-1">
            Navegar por
          </p>
          <h2 className="font-display font-semibold text-[22px] md:text-[26px] tracking-tight">
            Principais
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {CATEGORIAS.filter((c) => c.id === "constituicao" || c.id === "codigos").map((cat) => (
            <CategoriaCardCompact key={cat.id} cat={cat} />
          ))}
        </div>
      </section>

      {/* Demais categorias — timeline */}
      <section className="px-4 md:px-8 mt-8">
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-1">
            Explorar
          </p>
          <h2 className="font-display font-semibold text-[18px] md:text-[20px] tracking-tight">
            Demais categorias
          </h2>
        </div>

        <ol className="relative border-l-2 border-primary/20 ml-3 space-y-3">
          {["estatutos", "leis-ordinarias", "sumulas", "leis-complementares"]
            .map((id) => CATEGORIAS.find((c) => c.id === id)!)
            .map((cat) => {
              const Icon = cat.icon;
              const isEstatutos = cat.id === "estatutos";
              const inner = (
                <>
                  <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-primary/80 font-semibold truncate">
                      {cat.tag}
                    </p>
                    <p className="text-[14px] font-semibold leading-tight truncate text-foreground">
                      {cat.titulo}
                    </p>
                  </div>
                  <span className="text-[11px] text-primary font-semibold shrink-0">
                    {cat.total.toLocaleString("pt-BR")}
                  </span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </>
              );
              const className =
                "w-full text-left rounded-2xl border border-border bg-gradient-to-br from-card to-card/60 hover:from-primary/10 hover:to-card hover:border-primary/40 active:scale-[0.98] transition-all shadow-sm px-3.5 py-3 flex items-center gap-3 cursor-pointer";
              return (
                <li key={cat.id} className="pl-5 relative group">
                  <span className="absolute -left-[7px] top-4 h-3 w-3 rounded-full bg-primary border-2 border-background shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_25%,transparent)]" />
                  {isEstatutos ? (
                    <Link to="/vade-mecum/estatutos" className={className}>
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { /* em breve */ }}
                      className={className + " opacity-80"}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
        </ol>
      </section>

      {/* Mais acessados */}
      <section className="px-4 md:px-8 mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-1 inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Mais acessados
            </p>
            <h2 className="font-display font-semibold text-[22px] md:text-[26px] tracking-tight">
              Destaques da OAB
            </h2>
          </div>
        </div>

        {destaquesFiltrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            Nenhum resultado para "{query}".
          </div>
        ) : (
          <ul className="rounded-2xl border border-border/60 bg-card/40 divide-y divide-border/50 overflow-hidden">
            {destaquesFiltrados.map((d, i) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-card/80 transition-colors cursor-pointer group"
                >
                  <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-gold/10 border border-border/50 grid place-items-center text-[11px] font-semibold text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{d.titulo}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {d.subtitulo}
                    </span>
                  </span>
                  <Star className="h-3.5 w-3.5 text-gold/70 shrink-0" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Rodapé informativo */}
      <section className="px-4 md:px-8 mt-10">
        <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-card/80 to-card/40 p-5 flex items-start gap-3">
          <Library className="h-5 w-5 text-gold mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium">Sempre atualizado</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Toda legislação revisada conforme as últimas alterações publicadas no Diário Oficial.
              Marque seus artigos favoritos e crie anotações para revisar mais rápido.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CategoriaCardCompact({ cat }: { cat: Categoria }) {
  const Icon = cat.icon;
  return (
    <button
      type="button"
      className={cn(
        "group relative overflow-hidden text-left rounded-2xl border bg-card/60 p-4 transition-all cursor-pointer h-full",
        "hover:bg-card hover:border-gold/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--gold)_25%,transparent)]",
        cat.destaque ? "border-gold/30" : "border-border/60",
      )}
    >
      {cat.destaque && (
        <span
          aria-hidden
          className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/10 blur-2xl pointer-events-none"
        />
      )}
      <div className="relative flex flex-col gap-3">
        <div
          className={cn(
            "h-10 w-10 rounded-xl grid place-items-center border",
            cat.destaque
              ? "bg-gradient-to-br from-gold/25 to-primary/20 border-gold/40 text-gold"
              : "bg-secondary/60 border-border/60 text-foreground/80",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground/80 font-semibold truncate">
            {cat.tag}
          </p>
          <h3 className="font-display font-semibold text-[15px] leading-tight mt-1">
            {cat.titulo}
          </h3>
          <p className="text-[11px] text-gold/80 font-medium mt-2">
            {cat.total.toLocaleString("pt-BR")} itens
          </p>
        </div>
      </div>
    </button>
  );
}

function CategoriaCard({ cat }: { cat: Categoria }) {
  const Icon = cat.icon;
  return (
    <button
      type="button"
      className={cn(
        "group relative overflow-hidden text-left rounded-2xl border bg-card/60 p-4 transition-all cursor-pointer",
        "hover:bg-card hover:border-gold/40 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_color-mix(in_oklab,var(--gold)_25%,transparent)]",
        cat.destaque ? "border-gold/30" : "border-border/60",
      )}
    >
      {cat.destaque && (
        <span
          aria-hidden
          className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gold/10 blur-2xl pointer-events-none"
        />
      )}
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "h-11 w-11 rounded-xl grid place-items-center shrink-0 border",
            cat.destaque
              ? "bg-gradient-to-br from-gold/25 to-primary/20 border-gold/40 text-gold"
              : "bg-secondary/60 border-border/60 text-foreground/80",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 font-semibold truncate">
              {cat.tag}
            </p>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-gold group-hover:translate-x-0.5 transition-all shrink-0" />
          </div>
          <h3 className="font-display font-semibold text-[16px] leading-tight mt-1 truncate">
            {cat.titulo}
          </h3>
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {cat.descricao}
          </p>
          <p className="text-[11px] text-gold/80 font-medium mt-2">
            {cat.total.toLocaleString("pt-BR")} itens
          </p>
        </div>
      </div>
    </button>
  );
}
