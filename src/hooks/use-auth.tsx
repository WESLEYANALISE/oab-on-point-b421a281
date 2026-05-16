import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
const LAST_UID_KEY = "oab:last-uid";

function readCachedProfile(userId: string | undefined | null): Profile | undefined {
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

function readLastUid(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_UID_KEY);
  } catch {
    return null;
  }
}

function writeLastUid(uid: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (uid) window.localStorage.setItem(LAST_UID_KEY, uid);
    else window.localStorage.removeItem(LAST_UID_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let authRestored = false;

    // 1) Hidrata a sessão antes de liberar os guards de rota.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      authRestored = true;
      setSession(s);
      setLoading(false);
      const uid = s?.user?.id ?? null;
      writeLastUid(uid);
      lastUserIdRef.current = uid;
    }).catch(() => {
      authRestored = true;
      if (!cancelled) setLoading(false);
    });

    // 2) Reage a mudanças (login/logout/refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (cancelled) return;
      if (!authRestored && event === "INITIAL_SESSION") {
        setSession(s);
        return;
      }
      setSession(s);
      setLoading(false);
      const uid = s?.user?.id ?? null;
      const prev = lastUserIdRef.current;
      if (prev !== undefined && uid !== prev) {
        if (prev) clearCachedProfile(prev);
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
      if (event === "SIGNED_OUT" && prev) {
        clearCachedProfile(prev);
      }
      writeLastUid(uid);
      lastUserIdRef.current = uid;
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
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

/** Lê o perfil em cache para o usuário atual ou último uid conhecido. */
export function readCachedProfileOptimistic(): Profile | undefined {
  const uid = readLastUid();
  return readCachedProfile(uid);
}

export function useProfile() {
  const { user } = useAuth();
  // Fallback otimista: enquanto user não chega, usa último uid conhecido.
  const effectiveUid = user?.id ?? readLastUid() ?? undefined;
  const cached = readCachedProfile(effectiveUid);
  return useQuery({
    queryKey: ["profile", effectiveUid],
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
