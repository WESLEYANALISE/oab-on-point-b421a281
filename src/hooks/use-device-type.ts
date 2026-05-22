import { useEffect, useState } from "react";

/** isDesktop = viewport >= 1024px (Tailwind lg). SSR-safe default: false. */
export function useDeviceType() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return { isDesktop };
}
