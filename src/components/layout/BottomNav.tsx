import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, ScrollText, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuDrawer, MenuTriggerButton } from "@/components/layout/MenuDrawer";

const left = [
  { to: "/app", label: "Início", icon: Home, exact: true },
  { to: "/materias", label: "Matérias", icon: BookOpen },
] as const;

const right = [
  { to: "/vade-mecum", label: "Vade Mecum", icon: ScrollText },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string, exact?: boolean) => exact ? pathname === to : pathname.startsWith(to);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="relative grid grid-cols-5 max-w-2xl mx-auto h-[72px] items-center">
        {left.map((item) => {
          const { to, label, icon: Icon } = item;
          const exact = "exact" in item ? item.exact : false;
          const active = isActive(to, exact);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] transition-colors",
                  active ? "text-primary" : "text-foreground hover:text-primary",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          );
        })}

        {/* Center floating Questões button */}
        <li className="flex justify-center">
          <Link
            to="/questoes"
            aria-label="Praticar questões"
            className="absolute left-1/2 -translate-x-1/2 -top-7 h-16 w-16 rounded-full bg-gradient-gold text-gold-foreground grid place-items-center shadow-[0_8px_20px_-6px_color-mix(in_oklab,var(--primary)_60%,transparent)] ring-4 ring-background hover:scale-105 transition-transform animate-questoes-shine"
          >
            <Target className="h-6 w-6" strokeWidth={2.4} />
          </Link>
          <span className={cn(
            "absolute left-1/2 -translate-x-1/2 bottom-1.5 text-[11px] font-medium",
            isActive("/questoes") ? "text-primary" : "text-foreground",
          )}>
            Questões
          </span>
        </li>

        {right.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-[11px] transition-colors",
                  active ? "text-primary" : "text-foreground hover:text-primary",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          );
        })}

        <li>
          <MenuDrawer trigger={<MenuTriggerButton />} />
        </li>
      </ul>
    </nav>
  );
}
