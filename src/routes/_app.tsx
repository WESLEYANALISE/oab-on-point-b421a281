import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { SimuladoQueueDriver } from "@/components/admin/SimuladoQueueDriver";
import { SimuladoQueueIndicator } from "@/components/admin/SimuladoQueueIndicator";


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

  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate({ to: "/login" });
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

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {!isBiblioteca && <MobileHeader />}
        <main className={`flex-1 ${showBottomNav ? "pb-20 md:pb-0" : ""} overflow-x-hidden`}>
          <Outlet />
        </main>
        {showBottomNav && <BottomNav />}
      </div>
      <SimuladoQueueDriver />
      <SimuladoQueueIndicator />
    </div>
  );
}

