import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Scale, ArrowLeft, Home, Search, Bell } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { resolverVoltar } from "@/lib/voltar";

export function MobileHeader() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === "/" || pathname === "/app";
  const destinoVoltar = resolverVoltar(pathname);
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
      <div className="flex items-center justify-between px-4 h-16">
        {isHome ? (
          <Link to="/app" className="flex items-center gap-2 tap-feedback">
            <div className="h-8 w-8 rounded-md bg-gradient-toga grid place-items-center">
              <Scale className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="leading-none">
              <p className="font-display text-lg leading-none">OAB na Risca</p>
            </div>
          </Link>
        ) : (
          <Link
            to={destinoVoltar as "/"}
            preload="intent"
            preloadDelay={0}
            className="inline-flex items-center gap-2 pl-2 pr-3.5 h-10 rounded-full bg-muted/70 border border-border text-sm font-medium text-foreground hover:bg-muted tap-feedback"
            aria-label="Voltar"
          >
            <span className="h-7 w-7 grid place-items-center rounded-full bg-foreground/10 text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Voltar
          </Link>
        )}
        <div className="flex items-center gap-1">
          {!isHome && (
            <button
              type="button"
              onClick={() => navigate({ to: "/app" })}
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
