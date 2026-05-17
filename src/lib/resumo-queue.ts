// Persistent queue store for background resumo automation.
// Supports two job kinds:
//   - "previa"    → extract sumário (calls gerarPreviaResumo); on success, auto-enqueue capítulos.
//   - "capitulos" → loop gerarProximoCapitulo until done.

import { useSyncExternalStore } from "react";

export type PreviaJob = {
  kind: "previa";
  key: string;        // dedup key
  slug: string;
  livro_id: number;
  titulo: string;
};
export type CapitulosJob = {
  kind: "capitulos";
  key: string;        // dedup key
  id: string;         // resumo_livro_id
  titulo: string;
};
export type ResumoQueueItem = PreviaJob | CapitulosJob;

export type ResumoProgress = {
  ordem?: number;
  titulo?: string;
  feitos?: number;
  total?: number;
  etapa?: string; // "OCR", "Sumário", "Capítulo X/Y", etc.
};
export type ResumoAtual =
  | (ResumoQueueItem & { startedAt: number; progress?: ResumoProgress })
  | null;
export type ResumoHist = {
  key: string;
  kind: ResumoQueueItem["kind"];
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

const STORAGE_KEY = "oab:resumo-queue:v2";

export function previaKey(slug: string, livro_id: number) {
  return `previa:${slug}:${livro_id}`;
}
export function capitulosKey(id: string) {
  return `capitulos:${id}`;
}

function load(): ResumoQueueState {
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
  setAtual(atual: ResumoAtual) {
    set({ atual });
  },
  finishAtual(status: ResumoHist["status"], erro?: string) {
    if (!state.atual) return;
    const h: ResumoHist = {
      key: state.atual.key,
      kind: state.atual.kind,
      titulo: state.atual.titulo,
      status,
      erro,
      finishedAt: Date.now(),
    };
    set({ atual: null, historico: [...state.historico, h].slice(-50) });
  },
  clearHistorico() {
    set({ historico: [] });
  },
  cancelAll() {
    set({ fila: [], atual: null });
  },
  hasKey(key: string) {
    return state.atual?.key === key || state.fila.some((i) => i.key === key);
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
