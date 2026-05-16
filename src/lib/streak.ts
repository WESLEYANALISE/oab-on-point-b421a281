// Streak local — dias consecutivos de acesso à 1ª Fase.
// Persistência em localStorage. SSR-safe (retorna defaults quando window === undefined).

const KEY = "pf_streak_v1";
const HISTORY_KEY = "pf_streak_history_v1";

export type StreakState = {
  dias: number;
  ultimoAcesso: string; // YYYY-MM-DD
};

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function diffDays(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

export function readStreak(): StreakState {
  if (typeof window === "undefined") return { dias: 0, ultimoAcesso: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { dias: 0, ultimoAcesso: "" };
    return JSON.parse(raw) as StreakState;
  } catch {
    return { dias: 0, ultimoAcesso: "" };
  }
}

/** Marca acesso de hoje e devolve o estado atualizado + histórico dos últimos 14 dias. */
export function touchStreak(): { state: StreakState; historico: boolean[] } {
  if (typeof window === "undefined") {
    return { state: { dias: 0, ultimoAcesso: "" }, historico: Array(14).fill(false) };
  }
  const today = todayISO();
  const cur = readStreak();
  let next: StreakState;
  if (!cur.ultimoAcesso) {
    next = { dias: 1, ultimoAcesso: today };
  } else if (cur.ultimoAcesso === today) {
    next = cur;
  } else {
    const gap = diffDays(cur.ultimoAcesso, today);
    next = gap === 1 ? { dias: cur.dias + 1, ultimoAcesso: today } : { dias: 1, ultimoAcesso: today };
  }
  localStorage.setItem(KEY, JSON.stringify(next));

  // Histórico — set de dias visitados.
  let setVisitados: Set<string>;
  try {
    setVisitados = new Set(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"));
  } catch {
    setVisitados = new Set();
  }
  setVisitados.add(today);
  // Mantém só últimos 60 dias.
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
  const arr = [...setVisitados].filter((d) => new Date(d + "T00:00:00") >= cutoff);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));

  const historico: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    historico.push(arr.includes(iso));
  }
  return { state: next, historico };
}
