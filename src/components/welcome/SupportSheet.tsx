import { X, MessageCircle, Mail, Instagram } from "lucide-react";

interface Props { open: boolean; onClose: () => void }

export function SupportSheet({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 relative"
        style={{
          background: "linear-gradient(180deg, #1a0a0a, #000)",
          border: "1px solid rgba(212,168,75,0.3)",
          boxShadow: "0 -20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-white font-black text-xl mb-1" style={{ fontFamily: "'Georgia', serif" }}>Fale com a gente</h2>
        <p className="text-white/55 text-sm mb-5">Tira-dúvidas, problemas com a conta ou só pra contar a sua história.</p>
        <div className="space-y-2.5">
          <a
            href="https://wa.me/5500000000000?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20OAB%20na%20Risca."
            target="_blank" rel="noreferrer noopener"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-white hover:bg-emerald-500/20 transition"
          >
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            <div className="flex-1">
              <p className="font-bold text-sm">WhatsApp</p>
              <p className="text-white/55 text-xs">Resposta em até 1h em horário comercial</p>
            </div>
          </a>
          <a
            href="mailto:contato@oabnarisca.com.br"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
          >
            <Mail className="w-5 h-5" style={{ color: "#d4a84b" }} />
            <div className="flex-1">
              <p className="font-bold text-sm">E-mail</p>
              <p className="text-white/55 text-xs">contato@oabnarisca.com.br</p>
            </div>
          </a>
          <a
            href="https://instagram.com/oabnarisca"
            target="_blank" rel="noreferrer noopener"
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition"
          >
            <Instagram className="w-5 h-5" style={{ color: "#d4a84b" }} />
            <div className="flex-1">
              <p className="font-bold text-sm">Instagram</p>
              <p className="text-white/55 text-xs">@oabnarisca</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
