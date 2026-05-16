import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  iniciarJob,
  executarOcr,
  analisarProva,
  processarBatch,
  validarFinal,
  getJobStatus,
} from "@/lib/simulados-admin.functions";
import { simuladoQueue, useSimuladoQueue } from "@/lib/simulado-queue";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-admin";

/**
 * Mounted once in the app layout. Drives the simulado generation queue:
 *   pop next provaNumero → iniciarJob → ocr → analisar → batches → validar → next.
 * Survives navigation; resumes after reload via localStorage + getJobStatus.
 */
export function SimuladoQueueDriver() {
  const { session, user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();
  const state = useSimuladoQueue();

  const iniciarFn = useServerFn(iniciarJob);
  const ocrFn = useServerFn(executarOcr);
  const analisarFn = useServerFn(analisarProva);
  const batchFn = useServerFn(processarBatch);
  const validarFn = useServerFn(validarFinal);
  const statusFn = useServerFn(getJobStatus);

  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  // Refs guard against double-fire across renders and polling cycles.
  const startingRef = useRef(false);
  const stepRef = useRef<{ jobId?: string; ocr?: boolean; analisar?: boolean; batching?: boolean; validar?: boolean }>({});

  // ---- Start next from queue ----
  useEffect(() => {
    if (!user || !isAdmin || !authHeaders) return;
    if (state.atual) return;
    if (state.fila.length === 0) return;
    if (startingRef.current) return;

    const next = state.fila[0];
    startingRef.current = true;
    simuladoQueue.removeFromQueue(next);

    iniciarFn({ data: { provaNumero: next }, headers: authHeaders })
      .then((r) => {
        simuladoQueue.setAtual({ provaNumero: next, jobId: r.jobId });
        stepRef.current = { jobId: r.jobId };
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "erro";
        toast.error(`Prova ${next}: ${msg}`);
        simuladoQueue.finishAtual("erro", msg);
      })
      .finally(() => {
        startingRef.current = false;
      });
  }, [state.atual, state.fila, user, isAdmin, authHeaders, iniciarFn]);

  // ---- Drive active job (poll + advance steps) ----
  useEffect(() => {
    if (!authHeaders) return;
    const atual = state.atual;
    if (!atual) return;

    // Reset step guards if jobId changed.
    if (stepRef.current.jobId !== atual.jobId) {
      stepRef.current = { jobId: atual.jobId };
    }

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      let job: Awaited<ReturnType<typeof statusFn>>;
      try {
        job = await statusFn({ data: { jobId: atual.jobId }, headers: authHeaders });
      } catch (e) {
        // network blip — try again next tick
        console.warn("queue status poll failed", e);
        return;
      }
      if (cancelled) return;

      const etapa = job.etapa;

      if (etapa === "ocr" && !stepRef.current.ocr) {
        stepRef.current.ocr = true;
        ocrFn({ data: { jobId: atual.jobId }, headers: authHeaders }).catch((e) => {
          toast.error(`OCR (prova ${atual.provaNumero}): ${e instanceof Error ? e.message : "erro"}`);
        });
      } else if (etapa === "analisando" && !stepRef.current.analisar) {
        stepRef.current.analisar = true;
        analisarFn({ data: { jobId: atual.jobId }, headers: authHeaders }).catch((e) => {
          toast.error(`Análise (prova ${atual.provaNumero}): ${e instanceof Error ? e.message : "erro"}`);
        });
      } else if (etapa === "gerando" && !stepRef.current.batching) {
        stepRef.current.batching = true;
        (async () => {
          let idx = job.batch_atual ?? 0;
          try {
            while (!cancelled && idx < (job.batches_total ?? 0)) {
              const r = await batchFn({
                data: { jobId: atual.jobId, batchIndex: idx },
                headers: authHeaders,
              });
              if (r.proximo === null) break;
              idx = r.proximo;
            }
          } catch (e) {
            toast.error(
              `Geração (prova ${atual.provaNumero}): ${e instanceof Error ? e.message : "erro"}`,
            );
          } finally {
            stepRef.current.batching = false;
          }
        })();
      } else if (etapa === "validando" && !stepRef.current.validar) {
        stepRef.current.validar = true;
        validarFn({ data: { jobId: atual.jobId }, headers: authHeaders }).catch((e) => {
          toast.error(`Validação (prova ${atual.provaNumero}): ${e instanceof Error ? e.message : "erro"}`);
        });
      } else if (etapa === "pronto") {
        toast.success(`Prova ${atual.provaNumero} pronta`);
        simuladoQueue.finishAtual("pronto");
        qc.invalidateQueries({ queryKey: ["admin-provas"] });
      } else if (etapa === "erro") {
        const msg = job.erro_msg ?? "Erro desconhecido";
        toast.error(`Prova ${atual.provaNumero}: ${msg}`);
        simuladoQueue.finishAtual("erro", msg);
        qc.invalidateQueries({ queryKey: ["admin-provas"] });
      }
    };

    tick();
    const id = window.setInterval(tick, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [state.atual, authHeaders, statusFn, ocrFn, analisarFn, batchFn, validarFn, qc]);

  return null;
}
