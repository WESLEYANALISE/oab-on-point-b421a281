import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, User, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Criar conta — OAB na Risca" }] }),
  component: SignupPage,
});

const schema = z.object({
  display_name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo de 6 caracteres").max(72),
});

function SignupPage() {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ display_name: displayName, email, password });
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
    toast.success("Conta criada! Vamos personalizar seus estudos.");
    navigate({ to: "/onboarding" });
  }

  return (
    <AuthShell
      title="Crie sua conta"
      subtitle="Em poucos passos você personaliza sua preparação para a OAB."
      footer={
        <>
          Já tem conta?{" "}
          <Link to="/login" className="text-gold font-semibold hover:underline">Entrar</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field icon={User} type="text" placeholder="Seu nome" value={displayName} onChange={setDisplayName} required autoComplete="name" />
        <Field icon={Mail} type="email" placeholder="seu@email.com" value={email} onChange={setEmail} required autoComplete="email" />
        <Field icon={Lock} type="password" placeholder="Crie uma senha (mín. 6)" value={password} onChange={setPassword} required autoComplete="new-password" minLength={6} />

        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gold text-gold-foreground font-semibold py-3 shadow-[0_10px_30px_-10px_oklch(0.78_0.13_80/0.7)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Criar conta
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
