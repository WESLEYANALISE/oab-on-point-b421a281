import type { ReactNode } from "react";
import { X } from "lucide-react";

export type FocusTab = { id: string; label: string };

/**
 * Overlay full-cover montado por cima do Sheet do artigo.
 * Mostra só o conteúdo da função escolhida + X de fechar.
 * Pode opcionalmente exibir um menu de sub-abas no topo.
 */
export function ArtigoFocusOverlay({
  eyebrow,
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  onClose,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tabs?: FocusTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-background animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-border/60 bg-gradient-to-b from-card/80 to-card/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold/90 font-semibold truncate">
                {eyebrow}
              </p>
            )}
            <h2 className="font-display font-bold text-[22px] tracking-tight leading-tight truncate mt-0.5">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-gold to-amber-600 text-black shadow-md active:scale-95 transition shrink-0"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>

        {tabs && tabs.length > 0 && (
          <div
            className="mt-4 grid w-full"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((t) => {
              const ativo = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTabChange?.(t.id)}
                  className={`relative pb-2 text-[12px] sm:text-[13px] font-semibold whitespace-nowrap text-center transition-colors ${
                    ativo ? "text-gold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {ativo && (
                    <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-gold rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Corpo */}
      <div className="flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </div>
  );
}
