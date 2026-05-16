import { Link, useLocation, useRouter } from "@tanstack/react-router";
import { Scale, Search, Bell, ArrowLeft } from "lucide-react";

export function MobileHeader() {
  const { pathname } = useLocation();
  const router = useRouter();
  const isHome = pathname === "/";

  return (
    <header className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
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
            onClick={() => router.history.back()}
            className="inline-flex items-center gap-1.5 -ml-2 px-2 h-9 rounded-full text-sm font-medium text-foreground hover:bg-muted transition"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
            Voltar
          </button>
        )}
        <div className="flex items-center gap-1">
          <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted" aria-label="Buscar">
            <Search className="h-4.5 w-4.5" />
          </button>
          <button className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted" aria-label="Notificações">
            <Bell className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
