import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BookOpen, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { MenuDrawer, MenuTriggerButton } from "@/components/layout/MenuDrawer";

const left = [
  { to: "/inicio", label: "Início", icon: Home, exact: true },
  { to: "/materias", label: "Matérias", icon: BookOpen },
] as const;

const right = [
  { to: "/noticias", label: "Notícias", icon: Newspaper },
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
                  "flex flex-col items-center gap-1 py-2 text-[11px] transition-colors tap-feedback rounded-lg",
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
            className="absolute left-1/2 -translate-x-1/2 -top-7 h-16 w-16 rounded-full bg-gradient-gold text-gold-foreground grid place-items-center shadow-[0_8px_20px_-6px_color-mix(in_oklab,var(--primary)_60%,transparent)] ring-4 ring-background hover:scale-105 active:scale-95 transition-transform animate-questoes-shine"
          >
            <TargetArrowIcon className="h-7 w-7" />
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
                  "flex flex-col items-center gap-1 py-2 text-[11px] transition-colors tap-feedback rounded-lg",
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

function TargetArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* alvo */}
      <circle cx="11" cy="13" r="9" />
      <circle cx="11" cy="13" r="5.5" />
      <circle cx="11" cy="13" r="2" fill="currentColor" stroke="none" />
      {/* flecha cravada (diagonal NE) */}
      <line x1="11" y1="13" x2="20" y2="4" strokeWidth={2.4} />
      {/* penas */}
      <path d="M20 4l1.8 0.6M20 4l-0.6 -1.8M20 4l2.4 -0.6M20 4l-0.6 -2.4" strokeWidth={2} />
      {/* ponta da flecha no centro */}
      <path d="M11 13l2.2 -0.4l-0.4 -2.2" strokeWidth={2.2} fill="none" />
    </svg>
  );
}
