import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const CACHE_PREFIX = "oab:is-admin:";

function readCache(userId: string | undefined): boolean | undefined {
  if (!userId || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + userId);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch { /* ignore */ }
  return undefined;
}

function writeCache(userId: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + userId, String(value));
  } catch { /* ignore */ }
}

export function useIsAdmin() {
  const { user } = useAuth();
  const cached = readCache(user?.id);
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    initialData: cached,
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      const result = !error && !!data;
      writeCache(user.id, result);
      return result;
    },
  });
}
