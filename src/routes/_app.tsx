import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const isBiblioteca = pathname.startsWith("/biblioteca");

  // Redireciona para login somente após a sessão ser conhecida.
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  // Redireciona pro onboarding quando o perfil chegar — sem bloquear a UI.
  useEffect(() => {
    if (!user || !profile) return;
    if (!profile.onboarding_completo) navigate({ to: "/onboarding" });
  }, [user, profile, navigate]);

  // Só mostra spinner enquanto a sessão ainda é desconhecida.
  // Depois disso, renderiza o shell imediatamente — dados completam em background.
  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 text-gold animate-spin" />
      </div>
    );
  }

  // Sessão resolvida sem usuário: o efeito acima já está redirecionando pro /login.
  // Renderiza nada para evitar flash do shell.
  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {!isBiblioteca && <MobileHeader />}
        <main className={`flex-1 ${isBiblioteca ? "" : "pb-20 md:pb-0"}`}>
          <Outlet />
        </main>
        {!isBiblioteca && <BottomNav />}
      </div>
    </div>
  );
}
