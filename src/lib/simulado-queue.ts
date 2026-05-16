// Persistent queue store for background simulado generation.
// Vanilla pub/sub store + useSyncExternalStore (no zustand dep).

import { useSyncExternalStore } from "react";

export type QueueAtual = { provaNumero: number; jobId: string } | null;
export type QueueHist = {
  provaNumero: number;
  status: "pronto" | "erro" | "cancelado";
  erro?: string;
  finishedAt: number;
};

export type QueueState = {
  fila: number[];
  atual: QueueAtual;
  historico: QueueHist[];
};

const STORAGE_KEY = "oab:sim-queue:v1";

function load(): QueueState {
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

let state: QueueState = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function set(next: Partial<QueueState>) {
  state = { ...state, ...next };
  persist();
  listeners.forEach((l) => l());
}

// Cross-tab sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = load();
    listeners.forEach((l) => l());
  });
}

export const simuladoQueue = {
  getSnapshot: () => state,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  enqueue(numeros: number[]) {
    const dedup = numeros.filter(
      (n) => !state.fila.includes(n) && state.atual?.provaNumero !== n,
    );
    if (!dedup.length) return;
    set({ fila: [...state.fila, ...dedup] });
  },
  removeFromQueue(numero: number) {
    set({ fila: state.fila.filter((n) => n !== numero) });
  },
  setAtual(atual: QueueAtual) {
    set({ atual });
  },
  finishAtual(status: QueueHist["status"], erro?: string) {
    if (!state.atual) return;
    const h: QueueHist = {
      provaNumero: state.atual.provaNumero,
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

const emptyState: QueueState = { fila: [], atual: null, historico: [] };
export function useSimuladoQueue(): QueueState {
  return useSyncExternalStore(
    simuladoQueue.subscribe,
    simuladoQueue.getSnapshot,
    () => emptyState,
  );
}
