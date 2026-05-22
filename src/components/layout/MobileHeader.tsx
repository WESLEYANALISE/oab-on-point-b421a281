import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home, Search, Bell } from "lucide-react";
import logoNaRisca from "@/assets/logo-oab-na-risca.webp";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { resolverVoltar } from "@/lib/voltar";

export function MobileHeader() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === "/" || pathname === "/inicio";
  const destino = resolverVoltar(pathname, search as Record<string, unknown>);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled}
      className="md:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border header-scroll-shadow"
    >
      <div className="flex items-center justify-between px-4 h-16 gap-2">
        {isHome ? (
          <Link to="/inicio" className="flex items-center gap-2 tap-feedback min-w-0">
            <div className="h-8 w-8 shrink-0 rounded-md bg-gradient-toga grid place-items-center">
              <Scale className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-display text-lg leading-none truncate">OAB na Risca</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-1 truncate">
                Sua aprovação na medida certa
              </p>
            </div>
          </Link>
        ) : (
          <Link
            to={destino.to as string}
            search={destino.search as never}
            preload="intent"
            preloadDelay={0}
            className="inline-flex items-center gap-2 pl-2 pr-3.5 h-10 rounded-full bg-muted/70 border border-border text-sm font-medium text-foreground hover:bg-muted tap-feedback min-w-0 max-w-[60vw]"
            aria-label={`Voltar para ${destino.label}`}
          >
            <span className="h-7 w-7 grid place-items-center rounded-full bg-foreground/10 text-foreground shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </span>
            <span className="truncate">{destino.label}</span>
          </Link>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          {isHome ? (
            <>
              <button
                type="button"
                onClick={() => toast.info("Busca chegando em breve")}
                className="h-10 w-10 grid place-items-center rounded-full bg-muted/70 border border-border text-foreground hover:bg-muted tap-feedback"
                aria-label="Pesquisar"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => toast.info("Sem novas notificações")}
                className="h-10 w-10 grid place-items-center rounded-full bg-muted/70 border border-border text-foreground hover:bg-muted tap-feedback"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate({ to: "/inicio" })}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-white/10 text-white border border-white/20 text-sm font-medium hover:bg-white/15 tap-feedback"
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
