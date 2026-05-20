import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useMemo } from "react";

import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerServiceWorker } from "@/lib/sw-register";
import { initSentry, Sentry } from "@/lib/sentry";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <div className="mt-6">
          <Link
            to="/app"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  // Reporta para o Sentry se estiver habilitado.
  if (typeof window !== "undefined") {
    try {
      Sentry.captureException(error);
    } catch {
      /* noop */
    }
  }
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado do nosso lado. Você pode tentar de novo ou voltar pro início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}

const CACHE_BUSTER = "oab-v4";

// Prefixos de query persistidos no localStorage. Whitelist explícita: só
// listas de conteúdo praticamente estático. Tudo o mais (perfil, jobs,
// tentativas, capítulos pesados) fica em memória.
const PERSISTED_PREFIXES = new Set([
  "blog",
  "blog-categorias",
  "biblioteca",
  "provas",
  "noticias",
  "resumos-list",
  "vade-mecum",
]);

// Limite por query persistida. Estatutos grandes (CF/CC) podem passar de
// 200 KB serializados — subimos pra 400 KB pra caberem sem estourar a cota
// de localStorage (≈5 MB no total).
const MAX_PERSISTED_BYTES = 400_000;

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "OAB na Risca" },
      { name: "description", content: "Plataforma de preparação para o Exame da OAB — aulas interativas, resumos, flashcards, questões e simulados." },
      { name: "author", content: "OAB na Risca" },
      { name: "theme-color", content: "#1a0f0a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { property: "og:title", content: "OAB na Risca" },
      { property: "og:description", content: "Plataforma de preparação para o Exame da OAB — aulas interativas, resumos, flashcards, questões e simulados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "OAB na Risca" },
      { name: "twitter:description", content: "Plataforma de preparação para o Exame da OAB — aulas interativas, resumos, flashcards, questões e simulados." },
      // og:image NÃO é definido aqui: rotas-folha definem a própria imagem.
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Fontes carregadas como link (não @import) para não bloquear o CSS.
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap",
      },
      { rel: "preconnect", href: "https://ajbzwnzbuukwjaydfqui.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://ajbzwnzbuukwjaydfqui.supabase.co" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Skip link de acessibilidade — fica invisível até receber foco. */}
        <a
          href="#conteudo-principal"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-gold focus:text-gold-foreground focus:px-3 focus:py-2 focus:font-semibold focus:shadow-lg"
        >
          Pular para o conteúdo
        </a>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Lista de prefixos de queryKey que dependem do usuário logado e devem
// ser descartados quando a sessão troca. Conteúdo público (blog, biblioteca,
// vade-mecum, etc.) é preservado pra não recarregar à toa.
const USER_SCOPED_PREFIXES = [
  "profile",
  "favoritos",
  "anotacoes",
  "progresso",
  "tentativas",
  "caderno-erros",
  "flashcards",
  "plano-estudo",
  "streak",
];

function AuthCacheBridge() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // TOKEN_REFRESHED roda em background a cada ~1h. Invalidar tudo nele
      // derrubava o cache inteiro e dava a sensação de "app lento de novo".
      // O token novo já é usado nas próximas requisições — nada a fazer.
      if (event === "TOKEN_REFRESHED") return;
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        return;
      }
      if (event === "SIGNED_IN") {
        // Só invalida o que é específico do usuário; conteúdo público fica
        // quente no cache (vade-mecum, biblioteca, blog, etc.).
        queryClient.invalidateQueries({
          predicate: (q) => {
            const root = String(q.queryKey?.[0] ?? "");
            return USER_SCOPED_PREFIXES.includes(root) ||
              // Algumas queries do vade-mecum têm sub-chave de usuário
              // (favoritos/anotações) — captura por nome composto também.
              root.includes("favoritos") || root.includes("anotacoes");
          },
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Registra o service worker (PWA) — guards internos impedem rodar
  // em iframe ou em hosts de preview do Lovable.
  useEffect(() => {
    registerServiceWorker();
  }, []);
  const persister = useMemo(() => {
    if (typeof window === "undefined") return null;
    return createSyncStoragePersister({
      storage: window.localStorage,
      key: "oab-rq-cache",
      throttleTime: 1000,
    });
  }, []);

  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthCacheBridge />
          <Outlet />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: CACHE_BUSTER,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            if (query.state.status !== "success") return false;
            const root = String(query.queryKey?.[0] ?? "");
            if (!PERSISTED_PREFIXES.has(root)) return false;
            try {
              const size = JSON.stringify(query.state.data ?? null).length;
              if (size > MAX_PERSISTED_BYTES) return false;
            } catch {
              return false;
            }
            return true;
          },
        },
      }}
    >
      <AuthProvider>
        <AuthCacheBridge />
        <Outlet />
        <Toaster />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
