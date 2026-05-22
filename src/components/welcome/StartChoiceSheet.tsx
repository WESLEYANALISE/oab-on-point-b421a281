import { X, UserPlus, LogIn } from "lucide-react";
import logoNaRisca from "@/assets/logo-oab-na-risca.webp";

interface Props {
  open: boolean;
  onClose: () => void;
  onChoose: (mode: "login" | "signup") => void;
}

export function StartChoiceSheet({ open, onClose, onChoose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl p-6 relative"
        style={{
          background: "linear-gradient(180deg, #1a0808, #0a0303)",
          border: "1px solid rgba(220,38,38,0.4)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(220,38,38,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-6 pt-2">
          <img
            src={logoNaRisca}
            alt="OAB na Risca"
            className="h-16 w-16 object-cover rounded-full drop-shadow-2xl mb-3"
            style={{ boxShadow: "0 0 30px rgba(220,38,38,0.45)" }}
          />
          <p className="text-[11px] uppercase tracking-[0.25em] text-red-400/90 font-semibold">OAB na Risca</p>
          <h2 className="text-white font-black text-2xl mt-1" style={{ fontFamily: "'Georgia', serif" }}>Bora começar?</h2>
          <p className="text-white/55 text-sm mt-1">Escolha como quer entrar.</p>
        </div>

        <div className="space-y-2.5">
          <button
            onClick={() => onChoose("signup")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl text-white font-semibold transition active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              boxShadow: "0 0 24px rgba(220,38,38,0.4)",
            }}
          >
            <UserPlus className="w-5 h-5" />
            <div className="flex-1 text-left">
              <p className="font-bold text-sm">Criar minha conta</p>
              <p className="text-white/75 text-xs">Comece grátis em segundos</p>
            </div>
          </button>
          <button
            onClick={() => onChoose("login")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/15 text-white hover:bg-white/10 transition active:scale-[0.98]"
          >
            <LogIn className="w-5 h-5 text-red-400" />
            <div className="flex-1 text-left">
              <p className="font-bold text-sm">Já tenho conta</p>
              <p className="text-white/55 text-xs">Entrar com e-mail e senha</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
