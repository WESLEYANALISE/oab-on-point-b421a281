import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";

// Drivers/indicators de fila só interessam para admins. Carregados sob demanda
// para não pesar o bundle de quem só estuda.
const AdminQueueOverlays = lazy(() =>
  import("@/components/admin/AdminQueueOverlays").then((m) => ({ default: m.AdminQueueOverlays })),
);

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const isBiblioteca = pathname.startsWith("/biblioteca");
  const isLeitor = /^\/biblioteca\/[^/]+\/[^/]+\/ler$/.test(pathname);
  const isHome = pathname === "/inicio";
  const showBottomNav = isHome;

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !profile) return;
    if (!profile.onboarding_completo) navigate({ to: "/onboarding" });
  }, [user, profile, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <div className="h-10 w-10 rounded-full border-2 border-gold/20 border-t-gold animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (isLeitor) {
    // Leitor de livros ocupa toda a tela — sem sidebar, header ou wrapper com transform.
    return (
      <>
        <Outlet />
        {isAdmin ? (
          <Suspense fallback={null}>
            <AdminQueueOverlays />
          </Suspense>
        ) : null}
      </>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {!isBiblioteca && <MobileHeader />}
        <main id="conteudo-principal" className={`flex-1 ${showBottomNav ? "pb-20 md:pb-0" : ""} overflow-x-hidden`}>
          <div key={pathname} className="mx-auto w-full max-w-[1120px] animate-route-slide">
            <Outlet />
          </div>
        </main>
        {showBottomNav && <BottomNav />}
      </div>
      {isAdmin ? (
        <Suspense fallback={null}>
          <AdminQueueOverlays />
        </Suspense>
      ) : null}
    </div>
  );
}
