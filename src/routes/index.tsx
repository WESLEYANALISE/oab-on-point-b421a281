import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Headphones, Star, BookOpen, Target, FileText, Layers,
  Trophy, Newspaper, ScrollText, CalendarDays, ClipboardList, Library,
  CheckCircle2, ShieldCheck, GraduationCap, Brain, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "@/components/landing/Reveal";
import { CountdownExame } from "@/components/shared/CountdownExame";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import heroImage from "@/assets/oab-landing-hero.jpg";
import heroAvif from "@/assets/oab-landing-hero.jpg?format=avif&w=640;960;1280&as=srcset";
import heroWebp from "@/assets/oab-landing-hero.jpg?format=webp&w=640;960;1280&as=srcset";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      throw redirect({ to: "/inicio" });
    }
  },
  head: () => ({
    meta: [
      { title: "OAB na Risca — Tudo para você passar na OAB em um só lugar" },
      { name: "description", content: "Plataforma completa de preparação para o Exame de Ordem: aulas, resumos, flashcards, simulados, provas comentadas, vade mecum e cronograma. Estude com método e seja aprovado na OAB." },
      { property: "og:title", content: "OAB na Risca — Sua aprovação na OAB começa aqui" },
      { property: "og:description", content: "Aulas, resumos, flashcards, simulados e muito mais para você dominar o Exame da Ordem." },
      { property: "og:image", content: heroImage },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased overflow-x-hidden">
      {/* ============ HERO ============ */}
      <section className="relative min-h-[100svh] flex flex-col">
        {/* background image */}
        <div className="absolute inset-0">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-toga"
          />
          <picture>
            <source type="image/avif" srcSet={heroAvif} sizes="100vw" />
            <source type="image/webp" srcSet={heroWebp} sizes="100vw" />
            <img
              src={heroImage}
              alt="Estátua da deusa Themis com balança e advogado em traje formal contemplando a luz divina"
              width={1280}
              height={1600}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/60 to-black/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-gold/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        </div>

        {/* header */}
        <header className="relative z-10 px-5 md:px-10 pt-5 md:pt-7">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="h-10 w-10 md:h-11 md:w-11 rounded-2xl border border-gold/40 bg-background/60 backdrop-blur-md grid place-items-center shadow-lg shadow-black/40 group-hover:border-gold/70 transition">
                <span className="font-display text-xl md:text-2xl font-extrabold text-gold">O</span>
              </div>
              <div className="leading-tight">
                <p className="font-display text-base md:text-lg font-bold text-primary-foreground tracking-tight">OAB na Risca</p>
                <p className="text-[9px] md:text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold">Exame da Ordem</p>
              </div>
            </Link>
            <a
              href="https://wa.me/5500000000000?text=Olá!%20Tenho%20uma%20dúvida%20sobre%20o%20OAB%20na%20Risca."
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-3.5 md:px-4 h-10 md:h-11 rounded-full bg-background/70 backdrop-blur-md border border-gold/30 text-primary-foreground text-sm font-semibold hover:bg-background/90 hover:border-gold/60 active:scale-95 transition shadow-lg shadow-black/30"
            >
              <Headphones className="h-4 w-4 text-gold" />
              Suporte
            </a>
          </div>
        </header>

        {/* hero content */}
        <div className="relative z-10 flex-1 flex items-center px-5 md:px-10 py-10 md:py-16">
          <div className="max-w-6xl mx-auto w-full">
            <div className="max-w-3xl mx-auto md:mx-0 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-gold text-[10px] uppercase tracking-[0.22em] font-semibold backdrop-blur-md mb-5 md:mb-6">
                <Sparkles className="h-3 w-3" /> 42º Exame de Ordem
              </div>

              <h1 className="font-display font-extrabold text-[34px] leading-[1.05] md:text-6xl lg:text-7xl text-primary-foreground tracking-tight text-balance drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
                Tudo para você <span className="text-gold">passar na OAB</span> em um <span className="text-gold">só lugar</span>.
              </h1>

              <p className="mt-5 md:mt-7 text-[15px] md:text-lg text-primary-foreground/85 leading-relaxed max-w-2xl mx-auto md:mx-0 text-balance">
                Aulas, resumos, flashcards, simulados, vade mecum, peças da 2ª fase e muito mais — tudo para você <span className="text-gold font-semibold">dominar o Exame da Ordem</span> com método.
              </p>

              <div className="mt-7 md:mt-9 flex flex-col items-center md:items-start gap-4">
                <Link
                  to="/login"
                  className="group relative inline-flex items-center justify-center gap-2 px-7 md:px-9 py-4 md:py-[18px] rounded-full bg-gradient-to-r from-gold via-[oklch(0.82_0.14_82)] to-gold text-gold-foreground font-bold text-base md:text-lg shadow-[0_18px_50px_-12px_oklch(0.78_0.13_80/0.7)] hover:scale-[1.03] hover:shadow-[0_22px_60px_-10px_oklch(0.78_0.13_80/0.9)] active:scale-95 transition-all overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative">Iniciar jornada</span>
                  <ArrowRight className="relative h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="inline-flex items-center gap-2 text-sm text-primary-foreground/80">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span><span className="font-bold text-gold">+10.000</span> estudantes já estudam com a gente</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OAB laurel */}
        <div className="relative z-10 pb-10 md:pb-14 px-5">
          <OabLaurel />
        </div>

        {/* scroll indicator */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-primary-foreground/60 text-[10px] uppercase tracking-[0.3em] font-semibold flex flex-col items-center gap-1.5 pointer-events-none">
          <span>Role para descobrir</span>
          <span className="h-6 w-[1px] bg-gradient-to-b from-gold/80 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ============ POR QUE ============ */}
      <section className="relative px-5 md:px-10 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <SectionHeader eyebrow="Por que OAB na Risca" title="Aprovação não é sorte — é método." subtitle="Cada ferramenta foi construída para fazer você render mais em menos tempo." />
          </Reveal>
          <div className="mt-12 md:mt-16 grid md:grid-cols-3 gap-5 md:gap-6">
            {[
              { icon: BookOpen, title: "Conteúdo completo", desc: "Todas as 17 matérias da 1ª fase e as 5 áreas da 2ª fase, atualizadas com edital vigente." },
              { icon: Brain, title: "Método comprovado", desc: "Trilhas guiadas, repetição espaçada com flashcards e simulados que recriam a pressão do exame." },
              { icon: ShieldCheck, title: "Acompanhamento próximo", desc: "Cronograma personalizado, caderno de erros e indicadores de desempenho para você não estudar no escuro." },
            ].map((f, i) => (
              <Reveal key={f.title} delay={i * 0.12}>
                <FeatureCard {...f} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MÉTODO ============ */}
      <section className="relative px-5 md:px-10 py-20 md:py-28 bg-gradient-to-b from-background via-[oklch(0.13_0.04_18)] to-background">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <SectionHeader eyebrow="Nosso método" title="Da inscrição à aprovação em 4 passos." />
          </Reveal>
          <div className="mt-12 md:mt-16 grid md:grid-cols-2 gap-5 md:gap-6">
            {[
              { n: "01", title: "Diagnóstico inicial", desc: "Identificamos seu nível em cada matéria e suas dores reais de estudo." },
              { n: "02", title: "Plano personalizado", desc: "Cronograma semanal pensado para sua rotina, seu tempo e o calendário do próximo exame." },
              { n: "03", title: "Estudo guiado", desc: "Aulas curtas, resumos densos e flashcards diários — sempre na ordem certa." },
              { n: "04", title: "Simulação e correção", desc: "Simulados cronometrados + caderno de erros para virar fraqueza em ponto forte." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <StepCard {...s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FERRAMENTAS ============ */}
      <section className="relative px-5 md:px-10 py-20 md:py-28">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <SectionHeader eyebrow="O que você encontra" title="Toda a estrutura. Uma assinatura." />
          </Reveal>
          <div className="mt-12 md:mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { icon: Target, label: "1ª Fase", sub: "Trilhas objetivas" },
              { icon: FileText, label: "2ª Fase", sub: "Peças e discursivas" },
              { icon: Library, label: "Biblioteca", sub: "Livros e PDFs" },
              { icon: FileText, label: "Resumos", sub: "Por capítulo" },
              { icon: Layers, label: "Flashcards", sub: "Repetição espaçada" },
              { icon: Trophy, label: "Simulados", sub: "Treino cronometrado" },
              { icon: FileText, label: "Provas OAB", sub: "Exames comentados" },
              { icon: ScrollText, label: "Vade Mecum", sub: "Lei seca atualizada" },
              { icon: CalendarDays, label: "Calendário", sub: "Datas oficiais" },
              { icon: ClipboardList, label: "Cronograma", sub: "Plano semanal" },
              { icon: Newspaper, label: "Notícias OAB", sub: "Atualidades do exame" },
              { icon: GraduationCap, label: "Assistente IA", sub: "Tira-dúvidas 24h" },
            ].map((t, i) => (
              <Reveal key={t.label} delay={(i % 4) * 0.08}>
                <ToolCard {...t} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COUNTDOWN ============ */}
      <section className="relative px-5 md:px-10 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-toga border border-gold/25 p-7 md:p-12 shadow-2xl shadow-black/50">
              <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/40 blur-3xl pointer-events-none" />
              <div className="relative text-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold text-[10px] uppercase tracking-[0.22em] font-semibold mb-5">
                  <Clock className="h-3 w-3" /> Sua chance está próxima
                </div>
                <h2 className="font-display font-extrabold text-3xl md:text-5xl text-primary-foreground tracking-tight text-balance">
                  O próximo Exame da Ordem<br className="hidden md:block" /> está chegando.
                </h2>
                <p className="mt-3 text-primary-foreground/75 text-sm md:text-base">Faltam para a 1ª fase do 42º Exame:</p>
                <div className="mt-7">
                  <CountdownExame light hero />
                </div>
                <Link
                  to="/login"
                  className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-gold text-gold-foreground font-bold shadow-[0_14px_40px_-12px_oklch(0.78_0.13_80/0.7)] hover:scale-[1.03] active:scale-95 transition"
                >
                  Começar agora
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ DEPOIMENTOS ============ */}
      <section className="relative px-5 md:px-10 py-20 md:py-28 bg-gradient-to-b from-background via-[oklch(0.13_0.04_18)] to-background">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <SectionHeader eyebrow="Quem estuda com a gente" title="Histórias de quem passou na risca." />
          </Reveal>
          <div className="mt-12 md:mt-16 grid md:grid-cols-3 gap-5 md:gap-6">
            {[
              { name: "Marina S.", city: "Recife, PE", text: "Estudei 4 meses pela plataforma e passei na 1ª tentativa. O cronograma diário foi o que faltava na minha rotina." },
              { name: "João R.", city: "Belo Horizonte, MG", text: "Os simulados são idênticos à prova real. Quando cheguei no exame, já estava acostumado com o ritmo." },
              { name: "Carla F.", city: "Salvador, BA", text: "Os flashcards salvaram minha vida em direito tributário. Revisava no metrô e fixei tudo." },
            ].map((d, i) => (
              <Reveal key={d.name} delay={i * 0.12}>
                <TestimonialCard {...d} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="relative px-5 md:px-10 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <SectionHeader eyebrow="Dúvidas frequentes" title="Tudo que você precisa saber antes de começar." />
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-12 md:mt-14 rounded-3xl border border-gold/15 bg-card/60 backdrop-blur-sm p-2 md:p-3">
              <Accordion type="single" collapsible className="w-full">
                {[
                  { q: "Preciso de algum conhecimento prévio?", a: "Não. A plataforma atende desde quem está começando até quem está na reta final. O diagnóstico inicial monta um plano sob medida para o seu nível." },
                  { q: "O conteúdo cobre a 1ª e a 2ª fase?", a: "Sim. Temos trilhas completas para as 17 matérias da 1ª fase e as 5 áreas da 2ª fase (Civil, Penal, Trabalho, Tributário e Empresarial), com peças comentadas." },
                  { q: "Posso estudar pelo celular?", a: "Sim. A plataforma é totalmente responsiva — aulas, resumos, flashcards e simulados funcionam perfeitamente no celular, tablet ou desktop." },
                  { q: "Com que frequência o conteúdo é atualizado?", a: "Toda mudança no edital, súmulas, jurisprudência e legislação relevante é incorporada antes do próximo exame." },
                  { q: "Como funciona o suporte?", a: "Você tem suporte direto via WhatsApp para dúvidas operacionais e o Assistente IA disponível 24h para dúvidas jurídicas." },
                ].map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="border-gold/10">
                    <AccordionTrigger className="px-4 md:px-5 py-4 text-left font-semibold text-foreground hover:text-gold hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-4 md:px-5 pb-4 text-muted-foreground leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="relative px-5 md:px-10 pb-20 md:pb-28">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-toga border border-gold/30 p-8 md:p-14 text-center shadow-2xl shadow-black/50">
              <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }} />
              <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-gold/25 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-primary/40 blur-3xl pointer-events-none" />
              <div className="relative">
                <h2 className="font-display font-extrabold text-3xl md:text-5xl text-primary-foreground tracking-tight text-balance">
                  Sua aprovação começa <span className="text-gold">hoje</span>.
                </h2>
                <p className="mt-4 text-primary-foreground/80 text-base md:text-lg max-w-xl mx-auto">
                  Crie sua conta gratuita, faça seu diagnóstico e receba seu plano personalizado em menos de 5 minutos.
                </p>
                <Link
                  to="/login"
                  className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gold text-gold-foreground font-bold text-base md:text-lg shadow-[0_18px_50px_-12px_oklch(0.78_0.13_80/0.8)] hover:scale-[1.03] active:scale-95 transition"
                >
                  Iniciar jornada
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <div className="mt-5 flex items-center justify-center gap-2 text-sm text-primary-foreground/70">
                  <CheckCircle2 className="h-4 w-4 text-gold" />
                  Sem cartão de crédito · Comece em 1 minuto
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="px-5 md:px-10 py-10 border-t border-gold/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-gold grid place-items-center">
              <span className="font-display font-extrabold text-gold-foreground">O</span>
            </div>
            <span className="font-display font-semibold text-foreground">OAB na Risca</span>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} OAB na Risca. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <p className="text-[10px] md:text-xs uppercase tracking-[0.28em] text-gold font-bold mb-3">{eyebrow}</p>
      <h2 className="font-display font-extrabold text-3xl md:text-5xl text-foreground tracking-tight text-balance leading-[1.08]">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground text-base md:text-lg leading-relaxed text-balance">{subtitle}</p>}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: typeof BookOpen; title: string; desc: string }) {
  return (
    <div className="group relative h-full rounded-3xl border border-gold/15 bg-card/70 backdrop-blur-sm p-7 md:p-8 hover:border-gold/40 hover:-translate-y-1 transition-all shadow-lg shadow-black/30">
      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/40 grid place-items-center mb-5 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-gold" strokeWidth={2} />
      </div>
      <h3 className="font-display font-bold text-xl text-foreground mb-2.5">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="relative rounded-3xl border border-gold/15 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-7 md:p-8 hover:border-gold/40 transition-all">
      <span className="absolute top-5 right-6 font-display font-extrabold text-5xl md:text-6xl text-gold/15 leading-none select-none">{n}</span>
      <h3 className="relative font-display font-bold text-xl text-foreground mb-2.5">{title}</h3>
      <p className="relative text-muted-foreground text-sm leading-relaxed max-w-md">{desc}</p>
    </div>
  );
}

function ToolCard({ icon: Icon, label, sub }: { icon: typeof BookOpen; label: string; sub: string }) {
  return (
    <div className="group relative h-full rounded-2xl border border-gold/12 bg-gradient-to-br from-[oklch(0.22_0.06_18)] to-[oklch(0.16_0.04_18)] p-4 md:p-5 hover:border-gold/35 hover:-translate-y-1 transition-all shadow-md shadow-black/40">
      <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/25 grid place-items-center mb-3 group-hover:bg-gold/25 transition-colors">
        <Icon className="h-4 w-4 text-gold" strokeWidth={2} />
      </div>
      <p className="font-display font-semibold text-[15px] text-primary-foreground tracking-tight leading-tight">{label}</p>
      <p className="text-[11px] text-primary-foreground/55 mt-1">{sub}</p>
    </div>
  );
}

function TestimonialCard({ name, city, text }: { name: string; city: string; text: string }) {
  return (
    <div className="h-full rounded-3xl border border-gold/15 bg-card/70 backdrop-blur-sm p-7 md:p-8 hover:border-gold/35 transition-all">
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-gold text-gold" />
        ))}
      </div>
      <p className="text-foreground/90 leading-relaxed text-[15px] mb-5">"{text}"</p>
      <div className="pt-4 border-t border-gold/10">
        <p className="font-display font-bold text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{city}</p>
      </div>
    </div>
  );
}

function OabLaurel() {
  return (
    <div className="max-w-md mx-auto flex items-center justify-center gap-3 md:gap-5">
      <svg viewBox="0 0 100 120" className="h-20 md:h-28 text-gold/90 -scale-x-100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M85 110 Q 50 90, 30 50 Q 22 25, 30 10" />
        {Array.from({ length: 7 }).map((_, i) => {
          const t = i / 7;
          const x = 85 - 55 * t * t;
          const y = 110 - 100 * t;
          return <ellipse key={i} cx={x - 8} cy={y - 4} rx="9" ry="4" transform={`rotate(${-40 + t * 30} ${x - 8} ${y - 4})`} fill="currentColor" opacity="0.85" />;
        })}
      </svg>
      <div className="text-center px-2">
        <p className="font-display font-extrabold text-4xl md:text-6xl text-gold tracking-[0.08em] drop-shadow-[0_2px_18px_oklch(0.78_0.13_80/0.55)]">OAB</p>
        <p className="text-[9px] md:text-[10px] uppercase tracking-[0.32em] text-primary-foreground/70 font-semibold mt-1.5">Exame da Ordem</p>
      </div>
      <svg viewBox="0 0 100 120" className="h-20 md:h-28 text-gold/90" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M85 110 Q 50 90, 30 50 Q 22 25, 30 10" />
        {Array.from({ length: 7 }).map((_, i) => {
          const t = i / 7;
          const x = 85 - 55 * t * t;
          const y = 110 - 100 * t;
          return <ellipse key={i} cx={x - 8} cy={y - 4} rx="9" ry="4" transform={`rotate(${-40 + t * 30} ${x - 8} ${y - 4})`} fill="currentColor" opacity="0.85" />;
        })}
      </svg>
    </div>
  );
}
