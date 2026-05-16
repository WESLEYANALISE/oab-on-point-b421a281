import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-admin";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({ meta: [{ title: "Admin — OAB na Risca" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useAuth();
  const { data: isAdmin, isLoading } = useIsAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || isLoading) return;
    if (!user || !isAdmin) navigate({ to: "/" });
  }, [loading, isLoading, user, isAdmin, navigate]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Verificando acesso…
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="font-display text-xl">Acesso restrito</p>
      </div>
    );
  }
  return <Outlet />;
}
