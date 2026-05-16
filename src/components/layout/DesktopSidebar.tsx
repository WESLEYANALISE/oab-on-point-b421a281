import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, FileText, Layers, ClipboardList, Target, Sparkles, Newspaper, Award, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
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
      { to: "/questoes", label: "Questões", icon: ClipboardList },
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

export function DesktopSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
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
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="rounded-lg bg-gradient-toga p-4">
          <p className="font-display text-lg leading-tight text-primary-foreground">Próximo Exame</p>
          <p className="text-xs text-primary-foreground/80 mt-1">42º Exame · 1ª fase</p>
          <p className="font-display text-3xl text-gold mt-2">23 set</p>
        </div>
      </div>
    </aside>
  );
}
