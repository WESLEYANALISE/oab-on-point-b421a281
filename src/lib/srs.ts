// FSRS-4.5 simplificado (puro TypeScript, sem dep externa).
// Referência: open-spaced-repetition/ts-fsrs. Pesos default oficiais.

export type Rating = 1 | 2 | 3 | 4; // again | hard | good | easy
export type State = "new" | "learning" | "review" | "relearning";

export type CardSrs = {
  stability: number;
  difficulty: number;
  state: State;
  due_at: string; // ISO
  reps: number;
  lapses: number;
  last_review_at: string | null;
};

const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616,
  0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407, 2.9466, 0.5034, 0.6567,
];
const REQUEST_RETENTION = 0.9;
const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;
const HARD_INTERVAL_FACTOR = 1.2;
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 10;
const LEARNING_STEPS_MIN = [1, 10]; // again→1min, hard/good no learning→10min
const RELEARNING_STEP_MIN = 10;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function initialDifficulty(rating: Rating) {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function initialStability(rating: Rating) {
  return Math.max(W[rating - 1], 0.1);
}

function nextDifficulty(d: number, rating: Rating) {
  const next = d - W[6] * (rating - 3);
  const mean = W[4] - Math.exp(W[5] * (4 - 1)) + 1;
  return clamp(W[7] * mean + (1 - W[7]) * next, MIN_DIFFICULTY, MAX_DIFFICULTY);
}

function nextStabilityReview(d: number, s: number, r: number, rating: Rating) {
  if (rating === 1) {
    return (
      W[11] *
      Math.pow(d, -W[12]) *
      (Math.pow(s + 1, W[13]) - 1) *
      Math.exp(W[14] * (1 - r))
    );
  }
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        hardPenalty *
        easyBonus)
  );
}

function retrievability(elapsedDays: number, stability: number) {
  if (stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function intervalDays(stability: number) {
  const i = (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  return Math.max(1, Math.round(i));
}

function addMinutes(date: Date, min: number) {
  return new Date(date.getTime() + min * 60_000).toISOString();
}
function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000).toISOString();
}

export function reviewCard(card: CardSrs, rating: Rating, now: Date = new Date()): CardSrs {
  const last = card.last_review_at ? new Date(card.last_review_at) : null;
  const elapsedDays = last ? Math.max(0, (now.getTime() - last.getTime()) / 86_400_000) : 0;

  let { stability, difficulty, state, reps, lapses } = card;
  let due_at: string;

  if (state === "new") {
    difficulty = initialDifficulty(rating);
    stability = initialStability(rating);
    if (rating === 1) {
      state = "learning";
      due_at = addMinutes(now, LEARNING_STEPS_MIN[0]);
    } else if (rating === 4) {
      state = "review";
      due_at = addDays(now, intervalDays(stability));
    } else {
      state = "learning";
      due_at = addMinutes(now, LEARNING_STEPS_MIN[1]);
    }
  } else if (state === "learning" || state === "relearning") {
    difficulty = nextDifficulty(difficulty, rating);
    if (rating === 1) {
      lapses += state === "relearning" ? 1 : 0;
      due_at = addMinutes(now, LEARNING_STEPS_MIN[0]);
    } else if (rating === 2) {
      due_at = addMinutes(now, RELEARNING_STEP_MIN);
    } else {
      // good / easy → grad to review
      state = "review";
      const r = retrievability(elapsedDays, stability);
      stability = nextStabilityReview(difficulty, stability, r, rating);
      due_at = addDays(now, intervalDays(stability));
    }
  } else {
    // review
    const r = retrievability(elapsedDays, stability);
    difficulty = nextDifficulty(difficulty, rating);
    if (rating === 1) {
      lapses += 1;
      state = "relearning";
      stability = nextStabilityReview(difficulty, stability, r, rating);
      due_at = addMinutes(now, RELEARNING_STEP_MIN);
    } else {
      stability = nextStabilityReview(difficulty, stability, r, rating);
      let days = intervalDays(stability);
      if (rating === 2) days = Math.max(1, Math.round(days * HARD_INTERVAL_FACTOR / 2));
      due_at = addDays(now, days);
    }
  }

  return {
    stability,
    difficulty,
    state,
    due_at,
    reps: reps + 1,
    lapses,
    last_review_at: now.toISOString(),
  };
}

export function emptyCard(now: Date = new Date()): CardSrs {
  return {
    stability: 0,
    difficulty: 5,
    state: "new",
    due_at: now.toISOString(),
    reps: 0,
    lapses: 0,
    last_review_at: null,
  };
}
