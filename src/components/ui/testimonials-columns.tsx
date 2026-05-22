import { Star } from "lucide-react";

const TESTIMONIALS = [
  { n: "Marina S.", c: "Recife, PE", t: "Estudei 4 meses pelo OAB na Risca e passei na 1ª tentativa. O cronograma diário foi o que faltava." },
  { n: "João R.", c: "Belo Horizonte, MG", t: "Os simulados são idênticos à prova real. Quando cheguei no exame, já estava acostumado com o ritmo." },
  { n: "Carla F.", c: "Salvador, BA", t: "Os flashcards salvaram minha vida em Tributário. Revisava no metrô e fixei tudo." },
  { n: "Pedro L.", c: "São Paulo, SP", t: "Vade mecum atualizado, súmulas marcadas. Não precisei de mais nada além do app." },
  { n: "Ana T.", c: "Curitiba, PR", t: "A 2ª fase de Civil pareceu fácil depois de treinar 30 peças aqui. Aprovada de primeira." },
  { n: "Lucas M.", c: "Fortaleza, CE", t: "Trabalho 8h por dia. Sem o cronograma e os resumos densos, eu não teria conseguido." },
];

function Card({ n, c, t }: { n: string; c: string; t: string }) {
  return (
    <div
      className="rounded-2xl p-5 mb-4"
      style={{
        background: "linear-gradient(180deg, rgba(212,168,75,0.06), rgba(0,0,0,0.4))",
        border: "1px solid rgba(212,168,75,0.18)",
      }}
    >
      <div className="flex gap-0.5 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5" style={{ color: "#d4a84b", fill: "#d4a84b" }} />
        ))}
      </div>
      <p className="text-white/85 text-sm leading-relaxed mb-3">"{t}"</p>
      <div>
        <p className="text-white font-bold text-sm">{n}</p>
        <p className="text-white/45 text-xs">{c}</p>
      </div>
    </div>
  );
}

function Column({ items, duration, reverse = false }: { items: typeof TESTIMONIALS; duration: number; reverse?: boolean }) {
  return (
    <div className="relative overflow-hidden h-[500px]">
      <div
        className="flex flex-col"
        style={{
          animation: `welcomeColumnScroll ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        {[...items, ...items].map((t, i) => (
          <Card key={`${t.n}-${i}`} {...t} />
        ))}
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="bg-black px-6 lg:px-12 py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-2">Quem estuda com a gente</p>
          <h2 className="text-white font-black text-3xl lg:text-4xl" style={{ fontFamily: "'Georgia', serif" }}>
            Histórias de quem passou na risca.
          </h2>
        </div>
        <style>{`@keyframes welcomeColumnScroll {from{transform:translateY(0)}to{transform:translateY(-50%)}}`}</style>
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
            maskImage: "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
          }}
        >
          <Column items={TESTIMONIALS.slice(0, 3)} duration={36} />
          <Column items={TESTIMONIALS.slice(2, 5)} duration={42} reverse />
          <div className="hidden md:block">
            <Column items={TESTIMONIALS.slice(3, 6)} duration={32} />
          </div>
        </div>
      </div>
    </section>
  );
}
