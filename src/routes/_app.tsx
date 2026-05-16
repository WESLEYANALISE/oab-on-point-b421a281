import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
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
  const { data: profile, isLoading: profileLoading } = useProfile();
  const isBiblioteca = pathname.startsWith("/biblioteca");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (!profileLoading && profile && !profile.onboarding_completo) {
      navigate({ to: "/onboarding" });
    }
  }, [authLoading, user, profile, profileLoading, navigate]);

  if (authLoading || !user || (profile && !profile.onboarding_completo)) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-foreground">
        <Loader2 className="h-6 w-6 text-gold animate-spin" />
      </div>
    );
  }

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
