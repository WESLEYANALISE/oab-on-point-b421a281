import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "./integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Security headers — applied to every server response.
// CSP is intentionally permissive ('unsafe-inline'/'unsafe-eval') because the
// app uses Vite SSR + inline hydration scripts. Tighten later via nonces.
const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const response = await next();
  const res = response as unknown as { headers?: Headers };
  if (!res?.headers || typeof res.headers.set !== "function") return response;

  const url = new URL(request.url);
  const isHtml = (res.headers.get("content-type") ?? "").includes("text/html");

  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  if (url.protocol === "https:") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (isHtml) {
    res.headers.set(
      "Content-Security-Policy-Report-Only",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.lovable.app https://*.sentry.io",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob: https:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://*.sentry.io https://*.ingest.sentry.io",
        "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.planalto.gov.br",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; "),
    );
  }
  return response;
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware],
  functionMiddleware: [attachSupabaseAuth],
}));
