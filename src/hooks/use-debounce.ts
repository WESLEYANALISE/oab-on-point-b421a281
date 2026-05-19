import { useEffect, useState } from "react";

/** Devolve `value` debounced por `delay` ms. */
export function useDebounce<T>(value: T, delay = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
