import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, Loader2, UserRound } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — OAB na Risca" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
      return;
    }
    navigate({ to: "/" });
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
      title="Bem-vindo de volta"
      subtitle="Entre para continuar sua jornada rumo à aprovação."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link to="/signup" className="text-gold font-semibold hover:underline">Criar conta</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field icon={Mail} type="email" placeholder="seu@email.com" value={email} onChange={setEmail} required autoComplete="email" />
        <Field icon={Lock} type="password" placeholder="Sua senha" value={password} onChange={setPassword} required autoComplete="current-password" minLength={6} />

        <div className="text-right">
          <Link to="/reset-password" className="text-xs text-primary-foreground/70 hover:text-gold transition-colors">
            Esqueci a senha
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gold text-gold-foreground font-semibold py-3 shadow-[0_10px_30px_-10px_oklch(0.78_0.13_80/0.7)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Entrar
        </button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gold/15" /></div>
          <div className="relative flex justify-center"><span className="px-3 text-[10px] uppercase tracking-[0.22em] text-primary-foreground/50 bg-[oklch(0.13_0.04_18)]">ou</span></div>
        </div>

        <button
          type="button"
          onClick={handleGuest}
          disabled={guestLoading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-gold/30 text-primary-foreground font-semibold py-3 hover:bg-gold/10 active:scale-[0.98] transition disabled:opacity-60"
        >
          {guestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
          Entrar como convidado
        </button>
      </form>
    </AuthShell>
  );
}

function Field({
  icon: Icon, type, placeholder, value, onChange, required, autoComplete, minLength,
}: {
  icon: typeof Mail; type: string; placeholder: string;
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
