import { motion } from "framer-motion";
import { MOCK_SCREENS } from "./mockScreens";
import { MockMobileScreen } from "./MockMobileScreen";

export function AppShowcaseSection() {
  return (
    <section className="hidden lg:block bg-black px-12 py-20">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-14">
          <p className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-2">A plataforma</p>
          <h2 className="text-white font-black text-4xl" style={{ fontFamily: "'Georgia', serif" }}>
            Uma estrutura completa para você passar na OAB.
          </h2>
        </motion.div>
        <div className="grid grid-cols-3 gap-8">
          {MOCK_SCREENS.slice(0, 3).map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              className="text-center"
            >
              <div className="mb-5">
                <MockMobileScreen>{s.node}</MockMobileScreen>
              </div>
              <h3 className="text-white font-bold text-lg mb-1">{s.title}</h3>
              <p className="text-white/55 text-sm max-w-xs mx-auto">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
