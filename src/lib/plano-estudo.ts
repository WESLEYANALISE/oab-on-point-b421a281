// Gera um plano de estudo determinístico baseado nas matérias do edital,
// duração escolhida e horas/dia disponíveis. Distribui proporcionalmente ao
// peso de cada matéria no exame (campo `questoes.max`).

import { MATERIAS_OAB_46, type Materia } from "@/data/oab-materias-46";

export const DURACOES = [15, 30, 45, 60, 90, 365] as const;
export type Duracao = (typeof DURACOES)[number];

export type SessaoTipo = "aula" | "questoes" | "revisao";

export type SessaoEstudo = {
  data: Date;
  diaIndex: number;
  materia: Materia;
  minutos: number;
  tipo: SessaoTipo;
};

const KEY = "pf_plano_v1";

export type PlanoConfig = {
  dias: Duracao;
  horasPorDia: number;
};

const DEFAULT: PlanoConfig = { dias: 30, horasPorDia: 2 };

export function readPlanoConfig(): PlanoConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw);
    if (!DURACOES.includes(p.dias)) return DEFAULT;
    return { dias: p.dias, horasPorDia: Math.min(12, Math.max(0.5, Number(p.horasPorDia) || 2)) };
  } catch {
    return DEFAULT;
  }
}

export function savePlanoConfig(cfg: PlanoConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

/** Distribuição proporcional ao peso de questões: array de matérias repetidas. */
function montarFila(): Materia[] {
  const fila: Materia[] = [];
  for (const m of MATERIAS_OAB_46) {
    const peso = Math.max(1, Math.round(m.questoes.max / 2));
    for (let i = 0; i < peso; i++) fila.push(m);
  }
  // Embaralha de forma determinística (rotaciona) para distribuir.
  return fila;
}

export function gerarPlano(cfg: PlanoConfig): SessaoEstudo[] {
  const fila = montarFila();
  const sessoesPorDia = cfg.horasPorDia >= 3 ? 3 : cfg.horasPorDia >= 1.5 ? 2 : 1;
  const minutosTotalDia = Math.round(cfg.horasPorDia * 60);
  const minutosPorSessao = Math.round(minutosTotalDia / sessoesPorDia);

  const out: SessaoEstudo[] = [];
  let cursor = 0;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

  for (let d = 0; d < cfg.dias; d++) {
    const data = new Date(hoje); data.setDate(hoje.getDate() + d);
    for (let s = 0; s < sessoesPorDia; s++) {
      const materia = fila[cursor % fila.length];
      cursor++;
      const tipo: SessaoTipo = s === 0 ? "aula" : s === 1 ? "questoes" : "revisao";
      out.push({ data, diaIndex: d, materia, minutos: minutosPorSessao, tipo });
    }
  }
  return out;
}

export function proximaSessao(cfg: PlanoConfig): SessaoEstudo | null {
  const plano = gerarPlano(cfg);
  return plano[0] ?? null;
}
