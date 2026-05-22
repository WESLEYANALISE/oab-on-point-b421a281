import { Component, type ReactNode } from "react";
import { Sentry } from "@/lib/sentry";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { error: Error | null };

// Boundary reutilizável para seções críticas (chat, leitor, simulado).
// Reporta para Sentry e mostra fallback amigável. Para boundaries de rota,
// continue usando `errorComponent` do TanStack Router.
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    try {
      Sentry.captureException(error);
    } catch {
      /* noop */
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="font-medium text-foreground">Esta seção falhou ao carregar.</p>
        <button
          onClick={this.reset}
          className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Tentar de novo
        </button>
      </div>
    );
  }
}
