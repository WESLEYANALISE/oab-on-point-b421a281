import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "resumo-font-scale";
const EVENT = "resumo-font-scale-change";
export const SCALES = [0.9, 1, 1.15, 1.3, 1.5] as const;
const DEFAULT = 1;

function read(): number {
  if (typeof window === "undefined") return DEFAULT;
  const raw = Number(window.localStorage.getItem(STORAGE_KEY));
  return SCALES.includes(raw as (typeof SCALES)[number]) ? raw : DEFAULT;
}

export function useFontScale() {
  const [scale, setScale] = useState<number>(DEFAULT);

  useEffect(() => {
    setScale(read());
    const onChange = () => setScale(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const set = useCallback((v: number) => {
    window.localStorage.setItem(STORAGE_KEY, String(v));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const idx = SCALES.indexOf(scale as (typeof SCALES)[number]);
  const increase = useCallback(() => {
    const next = SCALES[Math.min(SCALES.length - 1, idx + 1)] ?? DEFAULT;
    set(next);
  }, [idx, set]);
  const decrease = useCallback(() => {
    const next = SCALES[Math.max(0, idx - 1)] ?? DEFAULT;
    set(next);
  }, [idx, set]);

  return { scale, increase, decrease, canIncrease: idx < SCALES.length - 1, canDecrease: idx > 0 };
}
