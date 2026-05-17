import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { gerarProximoCapitulo } from "@/lib/resumos-admin.functions";
import { resumoQueue, useResumoQueue } from "@/lib/resumo-queue";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Mounted once in the app layout. Drives the resumo generation queue:
 * pops next livro from fila and repeatedly calls gerarProximoCapitulo until done,
 * then moves to the next. Survives navigation; resumes after reload via localStorage.
 */
export function ResumoQueueDriver() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const state = useResumoQueue();
  const proxCapFn = useServerFn(gerarProximoCapitulo);

  const runningRef = useRef<string | null>(null);

  // Start next from queue when idle.
  useEffect(() => {
    if (!user || !isAdmin) return;
    if (state.atual) return;
    if (state.fila.length === 0) return;

    const next = state.fila[0];
    resumoQueue.removeFromQueue(next.id);
    resumoQueue.setAtual({ ...next, startedAt: Date.now() });
  }, [state.atual, state.fila, user, isAdmin]);

  // Drive active item: loop gerarProximoCapitulo until done/error.
  useEffect(() => {
    const atual = state.atual;
    if (!atual) return;
    if (runningRef.current === atual.id) return;

    runningRef.current = atual.id;
    let cancelled = false;

    (async () => {
      try {
        let safety = 500;
        while (!cancelled && safety-- > 0) {
          const r: any = await proxCapFn({ data: { resumo_livro_id: atual.id } });
          qc.invalidateQueries({ queryKey: ["admin-resumos"] });
          if (r?.done) {
            toast.success(`Resumo pronto: ${atual.titulo}`);
            resumoQueue.finishAtual("pronto");
            return;
          }
        }
        if (cancelled) {
          resumoQueue.finishAtual("cancelado");
        } else {
          resumoQueue.finishAtual("erro", "limite de iterações");
        }
      } catch (e: any) {
        const msg = e?.message ?? "erro";
        toast.error(`${atual.titulo}: ${msg}`);
        resumoQueue.finishAtual("erro", msg);
        qc.invalidateQueries({ queryKey: ["admin-resumos"] });
      } finally {
        if (runningRef.current === atual.id) runningRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.atual, proxCapFn, qc]);

  return null;
}
