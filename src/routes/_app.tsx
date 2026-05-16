import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth, useProfile } from "@/hooks/use-auth";


export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const isBiblioteca = pathname.startsWith("/biblioteca");
  const isHome = pathname === "/";
  const showBottomNav = isHome;
  const reduceMotion = useReducedMotion();

  // Redireciona para login somente após a sessão ser conhecida e ausente.
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Redireciona pro onboarding quando o perfil chegar — sem bloquear a UI.
  useEffect(() => {
    if (!user || !profile) return;
    if (!profile.onboarding_completo) navigate({ to: "/onboarding" });
  }, [user, profile, navigate]);

  // Sem spinner de tela cheia: renderiza o shell imediatamente.
  // Páginas internas mostram seus próprios skeletons enquanto dados chegam.

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {!isBiblioteca && <MobileHeader />}
        <main className={`flex-1 ${showBottomNav ? "pb-20 md:pb-0" : ""} ${isBiblioteca ? "" : ""} overflow-x-hidden`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={reduceMotion ? false : { x: -24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { x: 24, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="will-change-transform"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
