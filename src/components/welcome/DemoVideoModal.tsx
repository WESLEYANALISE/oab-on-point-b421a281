import { X } from "lucide-react";

interface Props { isOpen: boolean; onClose: () => void }

export function DemoVideoModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden bg-black border border-gold/30" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white hover:bg-black/80">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center h-full">
          <p className="text-white/60 text-sm">Em breve — vídeo de apresentação</p>
        </div>
      </div>
    </div>
  );
}
