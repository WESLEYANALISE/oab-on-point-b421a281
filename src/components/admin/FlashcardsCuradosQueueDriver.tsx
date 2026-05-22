import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  iniciarJobFlashcardsLivro,
  gerarProximoCapituloFlashcards,
} from "@/lib/flashcards-curados.functions";
import { fcQueue, useFCQueue } from "@/lib/flashcards-curados-queue";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Driver da fila de flashcards curados.
 * Para cada livro: iniciar job → loop gerarProximoCapitulo até done.
 */
export function FlashcardsCuradosQueueDriver() {
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const state = useFCQueue();
  const iniciarFn = useServerFn(iniciarJobFlashcardsLivro);
  const proxFn = useServerFn(gerarProximoCapituloFlashcards);
  const runningRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) return;
    if (state.atual) return;
    if (state.fila.length === 0) return;
    const next = state.fila[0];
    fcQueue.removeByKey(next.key);
    fcQueue.setAtual({ ...next, startedAt: Date.now() });
  }, [state.atual, state.fila, user, isAdmin]);

  useEffect(() => {
    const atual = state.atual;
    if (!atual) return;
    if (runningRef.current === atual.key) return;
    runningRef.current = atual.key;
    let cancelled = false;

    (async () => {
      try {
        fcQueue.setProgress({ feitos: 0 });
        const init = await iniciarFn({ data: { resumo_livro_id: atual.resumo_livro_id } });
        if (cancelled) {
          fcQueue.finishAtual("cancelado");
          return;
        }
        fcQueue.setProgress({ feitos: 0, total: init.total });

        let feitos = 0;
        let safety = 500;
        while (!cancelled && safety-- > 0) {
          const r: any = await proxFn({ data: { resumo_livro_id: atual.resumo_livro_id } });
          qc.invalidateQueries({ queryKey: ["admin-fc-curados"] });
          if (r?.done) {
            fcQueue.finishAtual("pronto");
            toast.success(`✓ Flashcards: ${atual.titulo}`);
            return;
          }
          feitos += 1;
          fcQueue.setProgress({
            feitos,
            total: init.total,
            capitulo: r?.titulo,
            ordem: r?.ordem,
          });
        }
        if (cancelled) fcQueue.finishAtual("cancelado");
        else fcQueue.finishAtual("erro", "limite de iterações");
      } catch (e: any) {
        const msg = e?.message ?? "erro";
        fcQueue.finishAtual("erro", msg);
        toast.error(`${atual.titulo}: ${msg}`);
        qc.invalidateQueries({ queryKey: ["admin-fc-curados"] });
      } finally {
        if (runningRef.current === atual.key) runningRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.atual?.key, iniciarFn, proxFn, qc]);

  return null;
}
