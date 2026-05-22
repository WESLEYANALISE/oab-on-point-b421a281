/**
 * Service Worker do OAB na Risca — escrito à mão, sem dependência de Workbox.
 *
 * Estratégias:
 *   - HTML / navegação: network-first com fallback p/ cache (3s timeout).
 *   - Assets do app (mesmo origin, /assets/*): cache-first 30d.
 *   - Fontes Google: cache-first 30d.
 *   - Imagens do Supabase Storage: cache-first 30d.
 *
 * Versão no nome do cache → trocar CACHE_VERSION força reset em todos
 * os clients no próximo activate.
 */
const CACHE_VERSION = "v2";
const HTML_CACHE = `oab-html-${CACHE_VERSION}`;
const ASSET_CACHE = `oab-assets-${CACHE_VERSION}`;
const FONTS_CACHE = `oab-fonts-${CACHE_VERSION}`;
const IMG_CACHE = `oab-img-${CACHE_VERSION}`;

const KEEP = new Set([HTML_CACHE, ASSET_CACHE, FONTS_CACHE, IMG_CACHE]);

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !KEEP.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

function isFontReq(url) {
  return url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
}

function isSupabaseImage(url) {
  return (
    url.hostname.endsWith(".supabase.co") &&
    (url.pathname.includes("/storage/v1/") || url.pathname.includes("/render/image/"))
  );
}

function isStaticAsset(url) {
  // Vite produz /assets/* com hash; também cobre PNG/SVG estáticos servidos da raiz.
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/assets/") ||
    /\.(js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|ico)$/i.test(url.pathname)
  );
}

async function networkFirst(request, cacheName, timeoutMs = 3000) {
  const cache = await caches.open(cacheName);
  try {
    const netPromise = fetch(request);
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs));
    const resp = await Promise.race([netPromise, timeout]);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback final: tenta a raiz cacheada para SPA.
    const root = await cache.match("/");
    if (root) return root;
    throw new Error("offline");
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // revalida em background
    fetch(request).then((r) => { if (r && r.ok) cache.put(request, r.clone()); }).catch(() => {});
    return cached;
  }
  const resp = await fetch(request);
  if (resp && (resp.ok || resp.type === "opaque")) cache.put(request, resp.clone());
  return resp;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Não intercepta APIs internas, OAuth, auth do Supabase, eventos do Sentry.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/~oauth") ||
    url.pathname.startsWith("/_") ||
    url.hostname.includes("sentry.io") ||
    (url.hostname.endsWith(".supabase.co") &&
      (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/rest/") || url.pathname.startsWith("/realtime/")))
  ) {
    return;
  }

  // HTML / navegação → network-first.
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }

  if (isFontReq(url)) {
    event.respondWith(cacheFirst(req, FONTS_CACHE));
    return;
  }

  if (isSupabaseImage(url)) {
    event.respondWith(cacheFirst(req, IMG_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }
});
