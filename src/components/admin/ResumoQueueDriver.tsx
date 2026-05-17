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
      const restantesAposEste = () => resumoQueue.getSnapshot().fila.length;
      try {
        if (atual.kind === "previa") {
          resumoQueue.setProgress({ etapa: "OCR + sumário" });
          const r: any = await previaFn({
            data: { slug: atual.slug, livro_id: atual.livro_id },
          });
          qc.invalidateQueries({ queryKey: ["admin-resumos"] });
          if (cancelled) {
            resumoQueue.finishAtual("cancelado");
            return;
          }
          if (r?.resumo_livro_id && r?.total > 0) {
            const cap: ResumoQueueItem = {
              kind: "capitulos",
              key: capitulosKey(r.resumo_livro_id),
              id: r.resumo_livro_id,
              titulo: atual.titulo,
            };
            resumoQueue.enqueue([cap]);
            resumoQueue.finishAtual("pronto");
            toast.success(`✓ Prévia: ${atual.titulo} · ${r.total} cap. · ${restantesAposEste()} restantes`);
          } else {
            const ret = resumoQueue.retryAtual("sem capítulos detectados", 3);
            if (ret.retried) {
              toast.error(`${atual.titulo}: sem capítulos · tentativa ${ret.attempt}/${ret.maxAttempts} — voltou pra fila (${ret.restantes} restantes)`);
            } else {
              toast.error(`${atual.titulo}: sem capítulos (desistiu após ${ret.maxAttempts} tentativas)`);
            }
          }
          return;
        }

        // kind === "capitulos"
        let safety = 1000;
        let feitos = 0;
        while (!cancelled && safety-- > 0) {
          const r: any = await proxCapFn({ data: { resumo_livro_id: atual.id } });
          qc.invalidateQueries({ queryKey: ["admin-resumos"] });
          if (r?.done) {
            resumoQueue.finishAtual("pronto");
            toast.success(`✓ Resumo: ${atual.titulo} · ${restantesAposEste()} restantes`);
            return;
          }
          feitos += 1;
          const total = typeof r?.restantes === "number" ? feitos + r.restantes : undefined;
          resumoQueue.setProgress({
            ordem: r?.ordem,
            titulo: r?.titulo,
            feitos,
            total,
            etapa: total ? `Capítulo ${feitos}/${total}` : `Capítulo ${feitos}`,
          });
        }
        if (cancelled) {
          resumoQueue.finishAtual("cancelado");
        } else {
          // limite de iterações: re-enfileira pra continuar do ponto onde parou
          const ret = resumoQueue.retryAtual("limite de iterações", 3);
          if (ret.retried) {
            toast.message(`${atual.titulo}: pausado · continua em seguida (${ret.restantes} restantes)`);
          } else {
            toast.error(`${atual.titulo}: limite de iterações (desistiu)`);
          }
        }
      } catch (e: any) {
        const msg = e?.message ?? "erro";
        const ret = resumoQueue.retryAtual(msg, 3);
        if (ret.retried) {
          toast.error(`${atual.titulo}: ${msg} · tentativa ${ret.attempt}/${ret.maxAttempts} — voltou pra fila (${ret.restantes} restantes)`);
        } else {
          toast.error(`${atual.titulo}: ${msg} (desistiu após ${ret.maxAttempts} tentativas)`);
        }
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
