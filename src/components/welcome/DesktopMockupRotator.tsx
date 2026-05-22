import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MockMobileScreen } from "./MockMobileScreen";
import { MOCK_SCREENS } from "./mockScreens";

export function DesktopMockupRotator() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % MOCK_SCREENS.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden lg:flex flex-1 items-center justify-center relative">
      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={MOCK_SCREENS[idx].id}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <MockMobileScreen>{MOCK_SCREENS[idx].node}</MockMobileScreen>
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 -z-10 blur-3xl rounded-full" style={{ background: "radial-gradient(circle, rgba(212,168,75,0.25), transparent 70%)" }} />
      </div>
    </div>
  );
}
