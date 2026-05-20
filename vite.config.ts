// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { imagetools } from "vite-imagetools";
import { VitePWA } from "vite-plugin-pwa";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      imagetools(),
      VitePWA({
        registerType: "autoUpdate",
        // SW só em produção — no preview do Lovable (iframe) ele atrapalha.
        devOptions: { enabled: false },
        // Usamos o manifest estático em public/manifest.webmanifest.
        manifest: false,
        injectRegister: null, // registramos manualmente com guard no client
        workbox: {
          // Não interceptar APIs internas nem callbacks OAuth.
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api/, /^\/~oauth/, /^\/_/],
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webp,woff2}"],
          // Inflar limite para chunks grandes (ex.: vade-mecum).
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          runtimeCaching: [
            // HTML: rede primeiro, cache de fallback (3s timeout).
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: {
                cacheName: "html",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
              },
            },
            // Fontes Google: cache-first 30 dias.
            {
              urlPattern: ({ url }) =>
                url.origin === "https://fonts.googleapis.com" ||
                url.origin === "https://fonts.gstatic.com",
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts",
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            // Imagens do Supabase Storage (capas, narrações etc.): cache-first.
            {
              urlPattern: ({ url }) =>
                url.hostname.endsWith(".supabase.co") &&
                (url.pathname.includes("/storage/v1/") || url.pathname.includes("/render/image/")),
              handler: "CacheFirst",
              options: {
                cacheName: "supabase-assets",
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
  },
});
