import type { ReactNode } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type FocusTab = { id: string; label: string };

/**
 * Overlay full-cover montado por cima do Sheet do artigo.
 * Mostra só o conteúdo da função escolhida + X de fechar.
 * Pode opcionalmente exibir um menu de sub-abas no topo.
 *
 * Animação: backdrop com fade + painel deslizando de baixo com easing
 * suave (spring), pra dar sensação de fluidez ao abrir/fechar.
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
    <>
      {/* Backdrop sutil que escurece o conteúdo embaixo */}
      <motion.div
        className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        onClick={onClose}
      />

      {/* Painel principal */}
      <motion.div
        className="absolute inset-0 z-30 flex flex-col bg-background shadow-2xl"
        initial={{ y: "100%", opacity: 0.6 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.4 }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 34,
          mass: 0.9,
        }}
      >
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
            <motion.button
              type="button"
              onClick={onClose}
              whileTap={{ scale: 0.9, rotate: 90 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="h-9 w-9 grid place-items-center rounded-full bg-gradient-to-br from-gold to-amber-600 text-black shadow-md shrink-0"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" strokeWidth={3} />
            </motion.button>
          </div>

          {tabs && tabs.length > 0 && (
            <div
              className="mt-4 grid w-full relative"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
              {tabs.map((t) => {
                const ativo = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onTabChange?.(t.id)}
                    className={`relative pb-2 text-[12px] sm:text-[13px] font-semibold whitespace-nowrap text-center transition-colors duration-200 ${
                      ativo ? "text-gold" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                    {ativo && (
                      <motion.span
                        layoutId={`focus-tab-underline-${tabs.map((x) => x.id).join("-")}`}
                        className="absolute left-2 right-2 -bottom-px h-[2px] bg-gold rounded-full"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Corpo — fade entre tabs */}
        <div className="flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab ?? "single"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}
