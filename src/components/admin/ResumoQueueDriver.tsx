import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { gerarProximoCapitulo, gerarPreviaResumo } from "@/lib/resumos-admin.functions";
import {
  resumoQueue,
  useResumoQueue,
  capitulosKey,
  type ResumoQueueItem,
} from "@/lib/resumo-queue";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Mounted once in the app layout. Drives the resumo queue.
 * - Kind "previa": runs Mistral OCR + Gemini sumário; on success auto-enqueues capitulos.
 * - Kind "capitulos": loops gerarProximoCapitulo until done.
 * Survives navigation; resumes after reload via localStorage.
 */
export function ResumoQueueDriver() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const state = useResumoQueue();
  const proxCapFn = useServerFn(gerarProximoCapitulo);
  const previaFn = useServerFn(gerarPreviaResumo);

  const runningRef = useRef<string | null>(null);

  // Start next from queue when idle.
  useEffect(() => {
    if (!user || !isAdmin) return;
    if (state.atual) return;
    if (state.fila.length === 0) return;

    const next = state.fila[0];
    resumoQueue.removeByKey(next.key);
    resumoQueue.setAtual({ ...next, startedAt: Date.now() });
  }, [state.atual, state.fila, user, isAdmin]);

  // Drive active item.
  useEffect(() => {
    const atual = state.atual;
    if (!atual) return;
    if (runningRef.current === atual.key) return;

    runningRef.current = atual.key;
    let cancelled = false;

    (async () => {
      try {
        if (atual.kind === "previa") {
          const r: any = await previaFn({
            data: { slug: atual.slug, livro_id: atual.livro_id },
          });
          qc.invalidateQueries({ queryKey: ["admin-resumos"] });
          if (cancelled) {
            resumoQueue.finishAtual("cancelado");
            return;
          }
          if (r?.resumo_livro_id && r?.total > 0) {
            // Auto-enqueue capítulos para este livro.
            const cap: ResumoQueueItem = {
              kind: "capitulos",
              key: capitulosKey(r.resumo_livro_id),
              id: r.resumo_livro_id,
              titulo: atual.titulo,
            };
            resumoQueue.enqueue([cap]);
            toast.success(`Prévia pronta: ${atual.titulo} (${r.total} cap.)`);
            resumoQueue.finishAtual("pronto");
          } else {
            toast.error(`Sem capítulos detectados: ${atual.titulo}`);
            resumoQueue.finishAtual("erro", "sem capítulos");
          }
          return;
        }

        // kind === "capitulos"
        let safety = 1000;
        while (!cancelled && safety-- > 0) {
          const r: any = await proxCapFn({ data: { resumo_livro_id: atual.id } });
          qc.invalidateQueries({ queryKey: ["admin-resumos"] });
          if (r?.done) {
            toast.success(`Resumo concluído: ${atual.titulo}`);
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
        if (runningRef.current === atual.key) runningRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.atual, previaFn, proxCapFn, qc]);

  return null;
}
