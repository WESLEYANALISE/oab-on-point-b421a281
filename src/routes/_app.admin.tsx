import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) { navigate({ to: "/" }); return; }
    if (isAdmin === false) navigate({ to: "/" });
  }, [mounted, loading, user, isAdmin, navigate]);

  // Evita mismatch de hidratação: até montar no client, sempre renderiza o shell de loading.
  if (!mounted || loading || (isLoading && isAdmin === undefined)) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel</p>
          <h1 className="font-display text-3xl md:text-4xl">Admin</h1>
          <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando acesso…
          </p>
        </header>
      </div>
    );
  }
  if (!user || !isAdmin) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="font-display text-xl">Acesso restrito</p>
      </div>
    );
  }
  return <Outlet />;
}

