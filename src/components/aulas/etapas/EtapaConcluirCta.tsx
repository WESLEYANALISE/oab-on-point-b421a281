import { CheckCircle2 } from "lucide-react";

export function EtapaConcluirCta({
  onConcluir,
  label,
}: {
  onConcluir: () => void;
  label: string;
}) {
  return (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={onConcluir}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-wider px-5 py-2.5 rounded-full border border-gold/40 bg-gradient-toga text-gold"
      >
        <CheckCircle2 className="h-4 w-4" /> {label}
      </button>
    </div>
  );
}
