import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Mail, Lock, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Recuperar senha — OAB na Risca" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) setMode("update");
  }, []);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Link de recuperação enviado para seu e-mail.");
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada!");
    navigate({ to: "/app" });
  }

  return (
    <AuthShell
      title={mode === "update" ? "Nova senha" : "Recuperar senha"}
      subtitle={mode === "update" ? "Defina uma nova senha para sua conta." : "Enviaremos um link para o seu e-mail."}
      footer={<Link to="/login" className="text-gold font-semibold hover:underline">Voltar ao login</Link>}
    >
      {mode === "request" ? (
        <form onSubmit={handleRequest} className="space-y-4">
          <Field icon={Mail} type="email" placeholder="seu@email.com" value={email} onChange={setEmail} required />
          <SubmitBtn loading={loading}>Enviar link</SubmitBtn>
        </form>
      ) : (
        <form onSubmit={handleUpdate} className="space-y-4">
          <Field icon={Lock} type="password" placeholder="Nova senha (mín. 6)" value={password} onChange={setPassword} required minLength={6} />
          <SubmitBtn loading={loading}>Atualizar senha</SubmitBtn>
        </form>
      )}
    </AuthShell>
  );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gold text-gold-foreground font-semibold py-3 shadow-[0_10px_30px_-10px_oklch(0.78_0.13_80/0.7)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

function Field({
  icon: Icon, type, placeholder, value, onChange, required, minLength,
}: {
  icon: typeof Mail; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; required?: boolean; minLength?: number;
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
        minLength={minLength}
        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-[oklch(0.18_0.05_18)/0.6] border border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30 transition"
      />
    </label>
  );
}
