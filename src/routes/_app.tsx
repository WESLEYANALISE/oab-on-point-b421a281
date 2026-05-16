import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { BottomNav } from "@/components/layout/BottomNav";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { pathname } = useLocation();
  const isBiblioteca = pathname.startsWith("/biblioteca");

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

