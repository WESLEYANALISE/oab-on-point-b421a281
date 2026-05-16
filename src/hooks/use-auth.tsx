import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  status_academico: "cursando" | "formado" | "outro" | null;
  semestre: number | null;
  dores: string[];
  dores_outro: string | null;
  onboarding_completo: boolean;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
});

const PROFILE_CACHE_PREFIX = "oab:profile:";

function readCachedProfile(userId: string | undefined): Profile | undefined {
  if (!userId || typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_PREFIX + userId);
    if (!raw) return undefined;
    return JSON.parse(raw) as Profile;
  } catch {
    return undefined;
  }
}

function writeCachedProfile(userId: string, profile: Profile | null) {
  if (typeof window === "undefined") return;
  try {
    if (profile) {
      window.localStorage.setItem(PROFILE_CACHE_PREFIX + userId, JSON.stringify(profile));
    } else {
      window.localStorage.removeItem(PROFILE_CACHE_PREFIX + userId);
    }
  } catch {
    /* ignore */
  }
}

function clearCachedProfile(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_CACHE_PREFIX + userId);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let lastUserId: string | null | undefined = undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setLoading(false);
      const uid = s?.user?.id ?? null;
      if (lastUserId !== undefined && uid !== lastUserId) {
        // Troca de usuário ou logout: limpa o cache do anterior.
        if (lastUserId) clearCachedProfile(lastUserId);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
      if (event === "SIGNED_OUT" && lastUserId) {
        clearCachedProfile(lastUserId);
      }
      lastUserId = uid;
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useProfile() {
  const { user } = useAuth();
  const cached = readCachedProfile(user?.id);
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    initialData: cached,
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, status_academico, semestre, dores, dores_outro, onboarding_completo")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      const profile = (data as Profile | null) ?? null;
      if (profile) writeCachedProfile(user.id, profile);
      return profile;
    },
  });
}

export function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}
