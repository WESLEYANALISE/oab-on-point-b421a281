import { useState, type FormEvent } from "react";
import { X, Mail, Lock, User, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab: "login" | "signup";
  sidePanel?: boolean;
}

const signupSchema = z.object({
  display_name: z.string().trim().min(2, "Informe seu nome").max(80),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo de 6 caracteres").max(72),
});

export function WelcomeAuthModal({ open, onClose, initialTab, sidePanel }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(initialTab);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message); return; }
    const { data: profile } = await supabase.from("profiles").select("onboarding_completo").eq("id", data.user.id).maybeSingle();
    onClose();
    navigate({ to: profile?.onboarding_completo ? "/inicio" : "/onboarding" });
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ display_name: displayName, email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { display_name: parsed.data.display_name } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta criada. Vamos montar seu plano de aprovação.");
    onClose();
    navigate({ to: "/onboarding" });
  }

  const panelClasses = sidePanel
    ? "fixed inset-y-0 right-0 w-full max-w-md"
    : "fixed inset-0 flex items-center justify-center p-4";

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md" onClick={onClose}>
      <div className={panelClasses} onClick={(e) => e.stopPropagation()}>
        <div
          className={`relative w-full ${sidePanel ? "h-full" : "max-w-md mx-auto rounded-3xl"} p-6 md:p-8`}
          style={{
            background: "linear-gradient(180deg, #14100a, #000)",
            border: "1px solid rgba(212,168,75,0.3)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>

          <div className="mb-1">
            <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: "#d4a84b" }}>OAB na Risca</p>
          </div>
          <h2 className="text-white font-black text-2xl mb-1" style={{ fontFamily: "'Georgia', serif" }}>
            {mode === "login" ? "Bem-vindo de volta" : "Sua jornada começa aqui"}
          </h2>
          <p className="text-white/55 text-sm mb-5">
            {mode === "login" ? "Continue de onde parou." : "Crie sua conta e monte seu plano de aprovação."}
          </p>

          <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-3.5">
            {mode === "signup" && (
              <Field icon={User} type="text" placeholder="Seu nome" value={displayName} onChange={setDisplayName} autoComplete="name" />
            )}
            <Field icon={Mail} type="email" placeholder="seu@email.com" value={email} onChange={setEmail} autoComplete="email" />
            <Field icon={Lock} type="password" placeholder={mode === "login" ? "Sua senha" : "Crie uma senha"} value={password} onChange={setPassword} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} />
            <button
              type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gold text-gold-foreground font-bold py-3.5 shadow-[0_10px_30px_-10px_oklch(0.78_0.13_80/0.7)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Entrar" : "Criar minha conta"}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-white/55">
            {mode === "login" ? (
              <>Ainda não tem conta?{" "}
                <button type="button" onClick={() => setMode("signup")} className="font-semibold text-gold hover:underline">Criar conta</button>
              </>
            ) : (
              <>Já tem uma conta?{" "}
                <button type="button" onClick={() => setMode("login")} className="font-semibold text-gold hover:underline">Entrar</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, type, placeholder, value, onChange, autoComplete, minLength }: any) {
  return (
    <label className="relative block">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold/70 pointer-events-none" />
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete} minLength={minLength} required
        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/[0.04] border border-gold/20 text-white placeholder:text-white/40 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30 transition"
      />
    </label>
  );
}
