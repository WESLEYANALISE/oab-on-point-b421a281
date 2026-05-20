/**
 * Registro do service worker com guards para o preview do Lovable.
 *
 * Regras:
 *   1. Nunca registrar em iframe (preview do editor roda em iframe).
 *   2. Nunca registrar em hosts de preview (lovableproject.com, id-preview--, localhost).
 *   3. Sempre desregistrar SWs antigos nos hosts acima — protege contra
 *      cache antigo preso após visitar a versão publicada.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }

  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
    console.warn("[sw] registration failed", err);
  });
}
