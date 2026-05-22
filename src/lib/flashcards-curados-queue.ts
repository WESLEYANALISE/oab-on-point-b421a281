// Fila persistente para geração de flashcards curados pelo admin.
// Cada item = um livro. Driver gera capítulo a capítulo via server fn.

import { useSyncExternalStore } from "react";

export type FCJob = {
  key: string; // "fc:<livro_id>"
  resumo_livro_id: string;
  titulo: string;
  attempts?: number;
};

export type FCProgress = {
  feitos?: number;
  total?: number;
  capitulo?: string;
  ordem?: number;
};

export type FCAtual = (FCJob & { startedAt: number; progress?: FCProgress }) | null;
export type FCHist = {
  key: string;
  titulo: string;
  status: "pronto" | "erro" | "cancelado";
  erro?: string;
  finishedAt: number;
};

export type FCQueueState = {
  fila: FCJob[];
  atual: FCAtual;
  historico: FCHist[];
};

const STORAGE_KEY = "oab:fc-curados-queue:v1";

export function fcKey(livro_id: string) {
  return `fc:${livro_id}`;
}

function load(): FCQueueState {
  if (typeof window === "undefined") return { fila: [], atual: null, historico: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { fila: [], atual: null, historico: [] };
    const parsed = JSON.parse(raw);
    return {
      fila: Array.isArray(parsed.fila) ? parsed.fila : [],
      atual: parsed.atual ?? null,
      historico: Array.isArray(parsed.historico) ? parsed.historico.slice(-50) : [],
    };
  } catch {
    return { fila: [], atual: null, historico: [] };
  }
}

let state: FCQueueState = load();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function set(next: Partial<FCQueueState>) {
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

export const fcQueue = {
  getSnapshot: () => state,
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  enqueue(itens: FCJob[]) {
    const existing = new Set(state.fila.map((i) => i.key));
    if (state.atual) existing.add(state.atual.key);
    const dedup = itens.filter((i) => !existing.has(i.key));
    if (!dedup.length) return 0;
    set({ fila: [...state.fila, ...dedup] });
    return dedup.length;
  },
  removeByKey(key: string) {
    set({ fila: state.fila.filter((i) => i.key !== key) });
  },
  setAtual(atual: FCAtual) {
    set({ atual });
  },
  setProgress(progress: FCProgress) {
    if (!state.atual) return;
    set({ atual: { ...state.atual, progress: { ...state.atual.progress, ...progress } } });
  },
  finishAtual(status: FCHist["status"], erro?: string) {
    if (!state.atual) return;
    const h: FCHist = {
      key: state.atual.key,
      titulo: state.atual.titulo,
      status,
      erro,
      finishedAt: Date.now(),
    };
    set({ atual: null, historico: [...state.historico, h].slice(-50) });
  },
  cancelAll() {
    set({ fila: [], atual: null });
  },
  hasKey(key: string) {
    return state.atual?.key === key || state.fila.some((i) => i.key === key);
  },
};

const emptyState: FCQueueState = { fila: [], atual: null, historico: [] };
export function useFCQueue(): FCQueueState {
  return useSyncExternalStore(fcQueue.subscribe, fcQueue.getSnapshot, () => emptyState);
}
