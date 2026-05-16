import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { Scale, Search, Bell, ArrowLeft, Home } from "lucide-react";

export function MobileHeader() {
  const { pathname } = useLocation();
  const router = useRouter();
  const navigate = useNavigate();
  const isHome = pathname === "/";

  return (
    <header className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 h-16">
        {isHome ? (
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-toga grid place-items-center">
              <Scale className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-none">
              <p className="font-display text-lg leading-none">OAB na Risca</p>
            </div>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) router.history.back();
              else router.navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-2 pl-2 pr-3.5 h-10 rounded-full bg-muted/70 border border-border text-sm font-medium text-foreground hover:bg-muted active:scale-[0.97] transition"
            aria-label="Voltar"
          >
            <span className="h-7 w-7 grid place-items-center rounded-full bg-foreground/10 text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Voltar
          </button>
        )}
        <div className="flex items-center gap-1">
          {isHome ? (
            <>
              <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted" aria-label="Buscar">
                <Search className="h-4.5 w-4.5" />
              </button>
              <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted" aria-label="Notificações">
                <Bell className="h-4.5 w-4.5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-primary/15 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/25 active:scale-[0.97] transition"
              aria-label="Ir para o início"
            >
              <Home className="h-4 w-4" />
              Início
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
