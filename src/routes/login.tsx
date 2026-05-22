import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, Loader2, UserRound, User, type LucideIcon } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — OAB na Risca" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/inicio" });
  }, [authLoading, user, navigate]);

  const signupSchema = z.object({
    display_name: z.string().trim().min(2, "Informe seu nome").max(80),
    email: z.string().trim().email("E-mail inválido").max(255),
    password: z.string().min(6, "Mínimo de 6 caracteres").max(72),
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completo")
      .eq("id", data.user.id)
      .maybeSingle();
    navigate({ to: profile?.onboarding_completo ? "/" : "/onboarding" });
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ display_name: displayName, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: parsed.data.display_name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada. Vamos montar seu plano de aprovação.");
    navigate({ to: "/onboarding" });
  }

  async function handleGuest() {
    setGuestLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    setGuestLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Bem-vindo, convidado! 👋");
    navigate({ to: "/onboarding" });
  }

  return (
    <AuthShell
      title="Sua aprovação precisa de método, não de sorte."
      subtitle="Entre e continue um plano de estudos enxuto, organizado e feito para transformar revisão em desempenho."
    >
      <div className="mb-5 grid grid-cols-2 rounded-2xl border border-gold/20 bg-secondary/70 p-1">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${mode === "login" ? "bg-gold text-gold-foreground shadow-lg shadow-black/20" : "text-primary-foreground/70 hover:text-primary-foreground"}`}
        >
          Entrar
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-xl py-2.5 text-sm font-semibold transition ${mode === "signup" ? "bg-gold text-gold-foreground shadow-lg shadow-black/20" : "text-primary-foreground/70 hover:text-primary-foreground"}`}
        >
          Criar conta
        </button>
      </div>

      <form onSubmit={mode === "login" ? handleSubmit : handleCreate} className="space-y-4">
        {mode === "signup" && (
          <Field icon={User} type="text" placeholder="Seu nome" value={displayName} onChange={setDisplayName} required autoComplete="name" />
        )}
        <Field icon={Mail} type="email" placeholder="seu@email.com" value={email} onChange={setEmail} required autoComplete="email" />
        <Field icon={Lock} type="password" placeholder={mode === "login" ? "Sua senha" : "Crie uma senha"} value={password} onChange={setPassword} required autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} />

        {mode === "login" && (
          <div className="text-right">
            <Link to="/reset-password" className="text-xs text-primary-foreground/70 hover:text-gold transition-colors">
              Esqueci a senha
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gold text-gold-foreground font-semibold py-3 shadow-[0_10px_30px_-10px_oklch(0.78_0.13_80/0.7)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {mode === "login" ? "Entrar" : "Criar minha conta"}
        </button>

        {mode === "login" && <div className="relative py-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gold/15" /></div>
          <div className="relative flex justify-center"><span className="px-3 text-[10px] uppercase tracking-[0.22em] text-primary-foreground/50 bg-[oklch(0.13_0.04_18)]">ou</span></div>
        </div>}

        {mode === "login" && <button
          type="button"
          onClick={handleGuest}
          disabled={guestLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/30 text-primary-foreground font-semibold py-3 hover:bg-gold/10 active:scale-[0.98] transition disabled:opacity-60"
        >
          {guestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
          Continuar como visitante
        </button>}
      </form>
    </AuthShell>
  );
}

function Field({
  icon: Icon, type, placeholder, value, onChange, required, autoComplete, minLength,
}: {
  icon: LucideIcon; type: string; placeholder: string;
  value: string; onChange: (v: string) => void;
  required?: boolean; autoComplete?: string; minLength?: number;
}) {
  return (
    <label className="relative block">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/70 pointer-events-none" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[oklch(0.18_0.05_18)/0.6] border border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30 transition"
      />
    </label>
  );
}
