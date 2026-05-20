/**
 * Registro do service worker com guards de segurança para o preview do Lovable.
 *
 * Regras:
 *   1. Nunca registrar em iframe (preview do editor roda em iframe).
 *   2. Nunca registrar em hosts de preview (lovableproject.com, id-preview--).
 *   3. Sempre desregistrar SWs antigos nos hosts acima — protege devs que
 *      visitaram a versão publicada e ficaram com cache do SW preso.
 *
 * Chamado uma única vez no client a partir do __root.
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
    // Limpa qualquer SW remanescente para não interferir no preview.
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
    return;
  }

  // Carregamento dinâmico para não puxar workbox-window no bundle inicial.
  import("workbox-window")
    .then(({ Workbox }) => {
      const wb = new Workbox("/sw.js", { scope: "/" });
      // Auto-update: quando uma nova versão estiver pronta, ativa em silêncio.
      wb.addEventListener("waiting", () => {
        wb.messageSkipWaiting();
      });
      wb.addEventListener("controlling", () => {
        // Recarrega para pegar os novos assets ativos.
        window.location.reload();
      });
      wb.register().catch((err) => {
        console.warn("[sw] registration failed", err);
      });
    })
    .catch(() => {
      // workbox-window não carregou — sem PWA, sem erro fatal.
    });
}
