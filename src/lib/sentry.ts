/**
 * Inicialização do Sentry no client.
 *
 * Lê a DSN de `import.meta.env.VITE_SENTRY_DSN` (build secret do workspace).
 * Se a DSN não estiver definida, o Sentry simplesmente não inicializa —
 * o app continua funcionando normalmente, sem reportes.
 *
 * Rodar uma única vez no client a partir do __root.
 */
import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (typeof window === "undefined") return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  // Evita reportar erros dentro do preview do Lovable.
  const host = window.location.hostname;
  const isPreview =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1";
  if (isPreview) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    // Web Vitals + amostra de 10% de transações.
    tracesSampleRate: 0.1,
    // Sem replay no happy path; 100% quando ocorre erro.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Ruído típico de browser que não é bug nosso.
    ignoreErrors: [
      "ResizeObserver loop completed with undelivered notifications",
      "ResizeObserver loop limit exceeded",
      /Non-Error promise rejection captured/,
      // Extensões de browser
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
    ],
    denyUrls: [/chrome-extension:\/\//, /moz-extension:\/\//],
  });

  initialized = true;
}

export { Sentry };
