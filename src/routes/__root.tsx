import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  type Persister,
} from "@tanstack/react-query-persist-client";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  persister: Persister | null;
  cacheBuster: string;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "OAB na Risca" },
      { name: "description", content: "Plataforma de preparação para o Exame da OAB — aulas interativas, resumos, flashcards, questões e simulados." },
      { name: "author", content: "OAB na Risca" },
      { property: "og:title", content: "OAB na Risca" },
      { property: "og:description", content: "Plataforma de preparação para o Exame da OAB — aulas interativas, resumos, flashcards, questões e simulados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "OAB na Risca" },
      { name: "twitter:description", content: "Plataforma de preparação para o Exame da OAB — aulas interativas, resumos, flashcards, questões e simulados." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/13bad6b0-c106-4357-ad63-a95a956ace86/id-preview-b3f8a8a6--7143ea90-be27-484f-9f3e-f50d2fa31549.lovable.app-1778897437936.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/13bad6b0-c106-4357-ad63-a95a956ace86/id-preview-b3f8a8a6--7143ea90-be27-484f-9f3e-f50d2fa31549.lovable.app-1778897437936.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://ajbzwnzbuukwjaydfqui.supabase.co", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://ajbzwnzbuukwjaydfqui.supabase.co" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
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
        <meta name="theme-color" content="#1a0f0a" />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Chaves de query que NÃO devem ser persistidas em localStorage
// (têm cache próprio ou são polling de jobs em tempo real)
const NON_PERSISTED_PREFIXES = new Set([
  "profile",
  "is-admin",
  "simulado-job",
  "simulado-queue",
]);

function RootComponent() {
  const { queryClient, persister, cacheBuster } = Route.useRouteContext();

  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
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
        maxAge: 24 * 60 * 60 * 1000, // 24h
        buster: cacheBuster,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const root = String(query.queryKey?.[0] ?? "");
            if (NON_PERSISTED_PREFIXES.has(root)) return false;
            return query.state.status === "success";
          },
        },
      }}
    >
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
