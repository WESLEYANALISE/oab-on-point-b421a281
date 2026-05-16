import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, FileText, Layers, Target, Sparkles, Newspaper, Award, Scale, ShieldCheck, Minus, Plus, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-admin";
import { useFontScale } from "@/hooks/use-font-scale";

const baseGroups = [
  {
    label: "Navegar",
    items: [
      { to: "/", label: "Início", icon: Home },
      { to: "/materias", label: "Matérias", icon: BookOpen },
      { to: "/reta-final", label: "Reta Final", icon: Award },
    ],
  },
  {
    label: "Estudar",
    items: [
      { to: "/aulas", label: "Aulas", icon: BookOpen },
      { to: "/resumos", label: "Resumos", icon: FileText },
      { to: "/flashcards", label: "Flashcards", icon: Layers },
    ],
  },
  {
    label: "Praticar",
    items: [
      { to: "/provas", label: "Provas OAB", icon: FileText },
      { to: "/simulados", label: "Simulados", icon: Target },
    ],
  },
  {
    label: "Mais",
    items: [
      { to: "/noticias", label: "Notícias", icon: Newspaper },
      { to: "/assistente", label: "Assistente IA", icon: Sparkles },
    ],
  },
] as const;

const adminGroup = {
  label: "Admin",
  items: [
    { to: "/admin", label: "Painel admin", icon: ShieldCheck },
    { to: "/admin/simulados", label: "Gerar simulados", icon: Target },
  ],
} as const;

export function DesktopSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useIsAdmin();
  const { scale, increase, decrease, canIncrease, canDecrease } = useFontScale();
  const groups = isAdmin ? [...baseGroups, adminGroup] : baseGroups;
  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 sticky top-0 h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-gradient-gold grid place-items-center shadow-sm">
            <Scale className="h-5 w-5 text-gold-foreground" />
          </div>
          <div>
            <p className="font-display text-xl leading-none">OAB na Risca</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 mt-0.5">Estude na precisão</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 py-4 space-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50 font-semibold">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map(({ to, label, icon: Icon }) => {
                const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
                return (
                  <li key={to}>
                    <Link
                      to={to}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
            <Type className="h-3.5 w-3.5" />
            <span>Fonte</span>
            <span className="text-sidebar-foreground/50">{Math.round(scale * 100)}%</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={decrease}
              disabled={!canDecrease}
              aria-label="Diminuir fonte"
              className="h-7 w-7 grid place-items-center rounded-md border border-sidebar-border hover:bg-sidebar-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={increase}
              disabled={!canIncrease}
              aria-label="Aumentar fonte"
              className="h-7 w-7 grid place-items-center rounded-md border border-sidebar-border hover:bg-sidebar-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="rounded-lg bg-gradient-toga p-4">
          <p className="font-display text-lg leading-tight text-primary-foreground">Próximo Exame</p>
          <p className="text-xs text-primary-foreground/80 mt-1">42º Exame · 1ª fase</p>
          <p className="font-display text-3xl text-gold mt-2">23 set</p>
        </div>
      </div>
    </aside>
  );
}
