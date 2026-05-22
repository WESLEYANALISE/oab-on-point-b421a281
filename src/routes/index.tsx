import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Headphones, Smartphone, Sparkles, GraduationCap, Scale, FileText, BookOpen, Trophy, ScrollText, CalendarDays } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useDeviceType } from "@/hooks/use-device-type";

import logoNaRisca from "@/assets/logo-oab-na-risca.webp";
import lourosDourados from "@/assets/louros-dourados.webp";
import oabEmblem from "@/assets/oab-emblem.png";
const welcomeHero = "/welcome-hero.webp";

import { CSSInfiniteSlider } from "@/components/ui/css-infinite-slider";
import { BadgeCarousel } from "@/components/welcome/BadgeCarousel";
import { DesktopMockupRotator } from "@/components/welcome/DesktopMockupRotator";
import { MockupSlideshow } from "@/components/welcome/MockupSlideshow";
import { WelcomeAuthModal } from "@/components/welcome/WelcomeAuthModal";
import { StartChoiceSheet } from "@/components/welcome/StartChoiceSheet";
import { SupportSheet } from "@/components/welcome/SupportSheet";

const AppShowcaseSection = lazy(() => import("@/components/welcome/AppShowcaseSection").then((m) => ({ default: m.AppShowcaseSection })));
const TestimonialsSection = lazy(() => import("@/components/ui/testimonials-columns").then((m) => ({ default: m.TestimonialsSection })));
const DemoVideoModal = lazy(() => import("@/components/welcome/DemoVideoModal").then((m) => ({ default: m.DemoVideoModal })));

const FACULDADES = ["USP", "UFMG", "UFRJ", "UnB", "PUC-SP", "FGV Direito", "Mackenzie", "UFPE", "UFC", "UFRGS", "UFSC", "UFPR", "UERJ", "PUC-Rio", "Unicamp"];

const features = [
  { icon: Scale, label: "1ª Fase completa", desc: "17 matérias do edital, aulas curtas e diretas para você dominar a teoria sem cansar." },
  { icon: FileText, label: "2ª Fase prática", desc: "Peças, recursos e treinos comentados nas 5 áreas — Civil, Penal, Trabalho, Tributário e Empresarial." },
  { icon: Trophy, label: "Simulados como na prova", desc: "80 questões, tempo real e gabarito comentado para você chegar acostumado ao exame." },
  { icon: Sparkles, label: "Flashcards e mapas mentais", desc: "Repetição espaçada para fixar o que importa — sem decoreba, com fixação real." },
  { icon: ScrollText, label: "Vade Mecum sempre à mão", desc: "Lei seca, súmulas e jurisprudência atualizadas em um só lugar." },
  { icon: CalendarDays, label: "Cronograma personalizado", desc: "Plano semanal sob medida para sua rotina e o calendário do próximo exame." },
];

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) throw redirect({ to: "/inicio" });
  },
  head: () => ({
    meta: [
      { title: "OAB na Risca — Tudo para você passar na OAB em um só lugar" },
      { name: "description", content: "Plataforma completa de preparação para o Exame de Ordem: aulas, resumos, flashcards, simulados, vade mecum e cronograma. Estude com método e seja aprovado." },
      { property: "og:title", content: "OAB na Risca — Sua aprovação na OAB começa aqui" },
      { property: "og:description", content: "Aulas, resumos, flashcards, simulados e muito mais para dominar o Exame da Ordem." },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { isDesktop } = useDeviceType();
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const [transitioning, setTransitioning] = useState(false);

  const handleStart = useCallback(() => {
    setTransitioning(true);
    window.setTimeout(() => {
      setChoiceOpen(true);
      window.setTimeout(() => setTransitioning(false), 250);
    }, 650);
  }, []);
  const handleChoice = useCallback((mode: "login" | "signup") => {
    setChoiceOpen(false);
    setAuthTab(mode);
    setAuthOpen(true);
  }, []);


  return (
    <div className="min-h-[100dvh] w-full bg-black overflow-x-hidden relative">

      {/* ───── HERO SECTION ───── */}
      <motion.div className="relative min-h-[100dvh] flex flex-col">
        {/* Background image */}
        <div className="absolute inset-0 overflow-hidden bg-black">
          <div className="relative w-full pt-[280px] sm:pt-[320px] lg:pt-[240px] scale-110 origin-top">
            <img
              src={welcomeHero}
              alt=""
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-auto max-w-none object-cover object-top"
              style={{
                WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 15%, black 35%, black 80%, transparent 100%)",
                maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 15%, black 35%, black 80%, transparent 100%)",
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-black via-black/85 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
        </div>


        {/* Navbar */}
        <nav className="relative z-20 px-4 lg:px-8 pt-6 pb-2">
          <div className="flex flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="relative shine-effect rounded-2xl overflow-hidden">
                <img src={logoNaRisca} alt="OAB na Risca" loading="eager" decoding="sync" fetchPriority="high" className="h-14 w-14 lg:h-16 lg:w-16 object-cover drop-shadow-2xl" />
                <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "0 0 30px rgba(212,168,75,0.25)" }} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-white font-black text-base lg:text-lg" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.02em" }}>OAB na Risca</span>
                <span className="text-white/50 text-[10px] lg:text-xs font-medium" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "0.04em" }}>Exame da Ordem</span>
              </div>
            </div>

            <button
              onClick={() => setSupportOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold text-black hover:bg-white transition-all active:scale-[0.96]"
              style={{
                background: "#ffffff",
                border: "1px solid rgba(212,168,75,0.5)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.25), 0 0 16px rgba(212,168,75,0.18)",
              }}
            >
              <Headphones className="w-4 h-4" style={{ color: "#8B0000" }} />
              <span>Suporte</span>
            </button>
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row lg:items-center lg:justify-between px-6 lg:px-12 xl:px-20 pb-6 pt-16 sm:pt-20 max-w-[1400px] mx-auto w-full lg:py-16">

          <motion.div className="lg:flex-1 lg:max-w-2xl" initial={false}>
            <div className="mb-6 text-center lg:text-left" style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "-0.02em" }}>
              <div className="headline-shine">
                <motion.h1
                  initial={false}
                  className="text-[clamp(1.8rem,5.5vw,3rem)] font-black text-white leading-[1.1] mb-4"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
                >
                  Tudo para você{" "}
                  <span className="inline" style={{ color: "#ef4444", textShadow: "0 0 20px rgba(239,68,68,0.4)" }}>passar na OAB</span>{" "}
                  em um{" "}
                  <span className="inline" style={{ color: "#ef4444", textShadow: "0 0 20px rgba(239,68,68,0.4)" }}>só lugar</span>.
                </motion.h1>
              </div>
              <motion.p
                initial={false}
                className="text-white/85 text-center lg:text-left text-[clamp(0.95rem,3vw,1.15rem)] leading-relaxed mb-2"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif", letterSpacing: "0.01em", textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}
              >
                Aulas, resumos, flashcards, simulados, vade mecum, peças da 2ª fase e muito mais — tudo para você{" "}
                <span className="font-bold" style={{ color: "#ef4444" }}>dominar o Exame da Ordem</span>.
              </motion.p>

              {/* CTA Iniciar jornada */}
              <motion.div initial={false} className="flex flex-col items-center lg:items-start mt-5 mb-6">
                <button
                  onClick={handleStart}
                  className="group relative flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-white transition-all active:scale-[0.97] overflow-hidden"
                  style={{
                    background: "linear-gradient(135deg, #b91c1c, #991b1b)",
                    boxShadow: "0 0 20px rgba(185,28,28,0.4), 0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.2) 55%, transparent 70%)",
                      animation: "shimmerSlide 3s ease-in-out infinite",
                    }}
                  />
                  <span className="relative z-10 flex items-center gap-2">
                    Iniciar jornada
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
                <p className="text-white text-xs mt-2.5 tracking-wide font-medium">
                  ⭐ +10.000 estudantes já estudam com a gente
                </p>
              </motion.div>

              {/* Louros + V-shape overlay */}
              <motion.div
                initial={false}
                className="relative w-full max-w-[280px] md:max-w-[400px] lg:max-w-[320px] mx-auto my-2"
              >
                <img
                  src={lourosDourados}
                  alt=""
                  className="w-full h-auto object-contain pointer-events-none select-none"
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                  style={{ filter: "drop-shadow(0 0 12px rgba(212,168,75,0.3))" }}
                />

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="flex justify-between w-full -mt-2 px-1">
                  {["1ª Fase", "2ª Fase"].map((word, i) => (
                    <span
                      key={word}
                      className="text-[clamp(1.4rem,4.5vw,2.2rem)] font-black text-white uppercase whitespace-nowrap"
                      style={{
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                        animation: `neonPulseText 3s ease-in-out ${i * 1}s infinite`,
                        textShadow: "0 0 20px rgba(212,168,75,0.5), 0 2px 8px rgba(0,0,0,0.6)",
                      }}
                    >
                      {word}
                    </span>
                  ))}
                  </div>

                  <svg viewBox="0 0 400 36" className="w-[80%] h-8" preserveAspectRatio="none">
                    <line x1="50" y1="0" x2="200" y2="32" stroke="url(#goldLine)" strokeWidth="3.5" style={{ animation: "lineGlow 3s ease-in-out 0.5s infinite" }} />
                    <line x1="350" y1="0" x2="200" y2="32" stroke="url(#goldLine)" strokeWidth="3.5" style={{ animation: "lineGlow 3s ease-in-out 1.5s infinite" }} />
                    <defs>
                      <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="transparent" />
                        <stop offset="50%" stopColor="#d4a84b" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <img
                    src={oabEmblem}
                    alt="OAB"
                    className="h-[clamp(3.6rem,14vw,6rem)] w-auto object-contain"
                    style={{
                      animation: "neonPulseText 3s ease-in-out 2s infinite",
                      filter: "drop-shadow(0 0 28px rgba(212,168,75,0.8)) drop-shadow(0 0 60px rgba(212,168,75,0.5)) drop-shadow(0 2px 8px rgba(0,0,0,0.6))",
                    }}
                  />
                </div>
              </motion.div>
            </div>

            <BadgeCarousel />

            <motion.p
              initial={false}
              className="relative text-center text-[clamp(1.1rem,3.5vw,1.4rem)] font-semibold tracking-wide mb-4 overflow-hidden"
              style={{
                fontFamily: "'Georgia', 'Times New Roman', serif",
                color: "rgba(255,255,255,0.9)",
                textShadow: "0 0 12px rgba(255,255,255,0.3), 0 0 30px rgba(255,255,255,0.1)",
              }}
            >
              <span className="relative z-10">Alcance a aprovação no Exame da Ordem.</span>
              <span
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 70%)",
                  animation: "shimmerSlide 3s ease-in-out infinite",
                }}
              />
            </motion.p>
          </motion.div>

          <DesktopMockupRotator />
        </div>

        {/* Marquee universidades */}
        <div className="relative z-10 bg-black/60 py-3">
          <p className="text-center text-[9px] uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 0 12px rgba(255,255,255,0.5)" }}>
            Aprovado por estudantes de todo o Brasil
          </p>
          <div
            style={{
              WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
              maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
            }}
          >
            <CSSInfiniteSlider gap={32} duration={28}>
              {FACULDADES.map((uni) => (
                <span key={uni} className="flex items-center gap-2 text-white/60 text-sm font-semibold shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/80 inline-block" />
                  {uni}
                </span>
              ))}
            </CSSInfiniteSlider>
          </div>
        </div>
      </motion.div>

      {/* ── CARD PERSUASIVO ── */}
      <div className="bg-black px-6 lg:px-12 pt-10 pb-2">
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-2xl px-6 py-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(212,168,75,0.12) 0%, rgba(0,0,0,0.85) 100%)",
              border: "1px solid rgba(212,168,75,0.22)",
            }}
          >
            <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ background: "linear-gradient(to bottom, transparent, #d4a84b, #fbbf24, #d4a84b, transparent)", boxShadow: "0 0 10px 4px rgba(212,168,75,0.8), 0 0 22px 8px rgba(212,168,75,0.35)" }} />
            <p className="text-white font-black text-[17px] leading-snug mb-2" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              O que é o OAB na Risca?
            </p>
            <p className="text-white/60 text-[13px] leading-relaxed">
              O OAB na Risca nasce para guiar você da inscrição até a carteirinha. Quando há método, há aprovação. Aqui o{" "}
              <span className="font-bold" style={{ color: "#d4a84b" }}>conteúdo certo encontra sua dedicação</span>{" "}
              e transforma estudo em conquista.
            </p>
          </div>
        </div>
      </div>

      {/* ───── APP SHOWCASE ───── */}
      <Suspense fallback={<div className="h-[600px]" aria-hidden />}>
        <AppShowcaseSection />
      </Suspense>

      {/* ───── TESTIMONIALS ───── */}
      <Suspense fallback={<div className="h-[500px]" aria-hidden />}>
        <TestimonialsSection />
      </Suspense>

      {/* ───── MOCKUP SLIDESHOW (mobile) ───── */}
      <MockupSlideshow />

      {/* ───── FEATURES SECTION ───── */}
      <div className="bg-black px-6 lg:px-12 pt-10 pb-14">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="h-px mb-10 mx-auto max-w-[200px]" style={{ background: "linear-gradient(to right, transparent, rgba(251,191,36,0.6), transparent)" }} />
            <h2 className="text-2xl font-black text-white text-center mb-2" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
              O que você vai ter:
            </h2>
            <p className="text-center text-white/45 text-sm mb-10">para passar na OAB com método, não com sorte</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 mb-12">
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="flex items-start gap-4 text-left"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.25)" }}>
                    <f.icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">{f.label}</h3>
                    <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleStart}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-full text-base font-extrabold text-black transition-all active:scale-[0.97]"
                style={{ background: "#fff", boxShadow: "0 0 30px rgba(255,255,255,0.2)" }}
              >
                <Smartphone className="w-5 h-5 text-amber-500" />
                Acessar App
              </button>
              <button
                onClick={() => handleChoice("login")}
                className="w-full py-4 rounded-2xl text-sm font-semibold text-white/50 hover:text-white transition-colors border border-white/10"
              >
                Já sou aluno →
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {showDemoVideo && (
        <Suspense fallback={null}>
          <DemoVideoModal isOpen={showDemoVideo} onClose={() => setShowDemoVideo(false)} />
        </Suspense>
      )}

      <WelcomeAuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialTab={authTab} sidePanel={isDesktop} />
      <StartChoiceSheet open={choiceOpen} onClose={() => setChoiceOpen(false)} onChoose={handleChoice} />
      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />

      {/* Page-open curtain (left → right) */}
      {transitioning && (
        <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 w-full"
            style={{
              background: "linear-gradient(110deg, #7f1d1d 0%, #b91c1c 45%, #dc2626 70%, #000 100%)",
              boxShadow: "0 0 80px rgba(220,38,38,0.6)",
              animation: "curtainSweep 900ms cubic-bezier(0.77, 0, 0.175, 1) forwards",
            }}
          />
        </div>
      )}

    </div>
  );
}
