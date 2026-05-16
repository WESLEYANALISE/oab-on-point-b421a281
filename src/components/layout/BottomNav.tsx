import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, ClipboardList, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/", label: "Início", icon: Home },
  { to: "/materias", label: "Matérias", icon: BookOpen },
  { to: "/questoes", label: "Questões", icon: ClipboardList },
  { to: "/simulados", label: "Simulados", icon: Target },
  { to: "/assistente", label: "IA", icon: Sparkles },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
      <ul className="grid grid-cols-5 max-w-2xl mx-auto">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
