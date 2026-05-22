import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MockMobileScreen } from "./MockMobileScreen";
import { MOCK_SCREENS } from "./mockScreens";

export function MockupSlideshow() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % MOCK_SCREENS.length), 4000);
    return () => clearInterval(t);
  }, []);
  const cur = MOCK_SCREENS[idx];
  return (
    <div className="lg:hidden bg-black px-6 py-12">
      <div className="max-w-md mx-auto">
        <p className="text-center text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-2">
          Tudo o que você precisa
        </p>
        <h2 className="text-white text-center font-black text-2xl mb-8" style={{ fontFamily: "'Georgia', serif" }}>
          Estude com método.
        </h2>
        <AnimatePresence mode="wait">
          <motion.div
            key={cur.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.5 }}
          >
            <MockMobileScreen>{cur.node}</MockMobileScreen>
          </motion.div>
        </AnimatePresence>
        <div className="mt-6 text-center">
          <p className="text-white font-bold text-base mb-1">{cur.title}</p>
          <p className="text-white/55 text-sm">{cur.desc}</p>
        </div>
        <div className="flex justify-center gap-1.5 mt-4">
          {MOCK_SCREENS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 24 : 6,
                background: i === idx ? "#d4a84b" : "rgba(255,255,255,0.2)",
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
