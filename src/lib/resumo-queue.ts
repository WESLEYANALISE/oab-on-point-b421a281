// Persistent queue store for background resumo (chapter) generation.
// Mirrors src/lib/simulado-queue.ts.

import { useSyncExternalStore } from "react";

export type ResumoQueueItem = { id: string; titulo: string };
export type ResumoAtual = (ResumoQueueItem & { startedAt: number }) | null;
export type ResumoHist = {
  id: string;
  titulo: string;
  status: "pronto" | "erro" | "cancelado";
  erro?: string;
  finishedAt: number;
};

export type ResumoQueueState = {
  fila: ResumoQueueItem[];
  atual: ResumoAtual;
  historico: ResumoHist[];
};

const STORAGE_KEY = "oab:resumo-queue:v1";

function load(): ResumoQueueState {
  if (typeof window === "undefined") return { fila: [], atual: null, historico: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { fila: [], atual: null, historico: [] };
    const parsed = JSON.parse(raw);
    return {
      fila: Array.isArray(parsed.fila) ? parsed.fila : [],
      atual: parsed.atual ?? null,
      historico: Array.isArray(parsed.historico) ? parsed.historico.slice(-20) : [],
    };
  } catch {
    return { fila: [], atual: null, historico: [] };
  }
}

let state: ResumoQueueState = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function set(next: Partial<ResumoQueueState>) {
  state = { ...state, ...next };
  persist();
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = load();
    listeners.forEach((l) => l());
  });
}

export const resumoQueue = {
  getSnapshot: () => state,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  enqueue(itens: ResumoQueueItem[]) {
    const existIds = new Set(state.fila.map((i) => i.id));
    const dedup = itens.filter(
      (i) => !existIds.has(i.id) && state.atual?.id !== i.id,
    );
    if (!dedup.length) return;
    set({ fila: [...state.fila, ...dedup] });
  },
  removeFromQueue(id: string) {
    set({ fila: state.fila.filter((i) => i.id !== id) });
  },
  setAtual(atual: ResumoAtual) {
    set({ atual });
  },
  finishAtual(status: ResumoHist["status"], erro?: string) {
    if (!state.atual) return;
    const h: ResumoHist = {
      id: state.atual.id,
      titulo: state.atual.titulo,
      status,
      erro,
      finishedAt: Date.now(),
    };
    set({ atual: null, historico: [...state.historico, h].slice(-20) });
  },
  clearHistorico() {
    set({ historico: [] });
  },
  cancelAll() {
    set({ fila: [], atual: null });
  },
};

const emptyState: ResumoQueueState = { fila: [], atual: null, historico: [] };
export function useResumoQueue(): ResumoQueueState {
  return useSyncExternalStore(
    resumoQueue.subscribe,
    resumoQueue.getSnapshot,
    () => emptyState,
  );
}
