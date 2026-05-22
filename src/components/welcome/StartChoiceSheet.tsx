import { X, UserPlus, LogIn, UserRound } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onChoose: (mode: "login" | "signup") => void;
}

export function StartChoiceSheet({ open, onClose, onChoose }: Props) {
  const navigate = useNavigate();
  const [guestLoading, setGuestLoading] = useState(false);
  if (!open) return null;

  async function handleGuest() {
    setGuestLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    setGuestLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bem-vindo, convidado! 👋");
    onClose();
    navigate({ to: "/onboarding" });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 relative"
        style={{
          background: "linear-gradient(180deg, #15100a, #000)",
          border: "1px solid rgba(212,168,75,0.35)",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-white font-black text-xl mb-1" style={{ fontFamily: "'Georgia', serif" }}>Bora começar?</h2>
        <p className="text-white/55 text-sm mb-5">Escolha como quer entrar.</p>
        <div className="space-y-2.5">
          <button
            onClick={() => onChoose("signup")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-white font-semibold transition active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #d4a84b, #b8893a)",
              color: "#000",
              boxShadow: "0 0 24px rgba(212,168,75,0.3)",
            }}
          >
            <UserPlus className="w-5 h-5" />
            <div className="flex-1 text-left">
              <p className="font-bold text-sm">Criar minha conta</p>
              <p className="text-black/60 text-xs">Comece grátis em segundos</p>
            </div>
          </button>
          <button
            onClick={() => onChoose("login")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/15 text-white hover:bg-white/10 transition active:scale-[0.98]"
          >
            <LogIn className="w-5 h-5" style={{ color: "#d4a84b" }} />
            <div className="flex-1 text-left">
              <p className="font-bold text-sm">Já tenho conta</p>
              <p className="text-white/55 text-xs">Entrar com e-mail e senha</p>
            </div>
          </button>
          <button
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full flex items-center gap-3 p-4 rounded-2xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition disabled:opacity-60"
          >
            <UserRound className="w-5 h-5" />
            <div className="flex-1 text-left">
              <p className="font-semibold text-sm">Entrar como visitante</p>
              <p className="text-white/45 text-xs">Explorar sem cadastro</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
