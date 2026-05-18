import { createFileRoute, Link } from "@tanstack/react-router";
import { CountdownExame } from "@/components/shared/CountdownExame";
import { ArrowRight, Award, Calendar, Target, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_app/reta-final")({
  head: () => ({
    meta: [
      { title: "Reta Final OAB — Plano de Estudos | OAB na Risca" },
      { name: "description", content: "Plano de estudos para a reta final do Exame de Ordem com countdown, metas semanais e simulados." },
    ],
  }),
  component: RetaFinalPage,
});

const semanas = [
  { titulo: "Semana 1 — Diagnóstico", desc: "Faça um simulado completo para identificar pontos fracos. Foco em Ética, Constitucional e Civil." },
  { titulo: "Semana 2-3 — Matérias de peso", desc: "Processo Civil, Civil, Penal e Trabalho. 2h de aulas + 30 questões por dia." },
  { titulo: "Semana 4 — Matérias menores", desc: "Tributário, Administrativo, Empresarial, Consumidor, Ambiental, ECA, DH." },
  { titulo: "Semana 5 — Revisão com flashcards", desc: "Revisão diária dos decks marcados. Lei seca e súmulas." },
  { titulo: "Semana 6 — Simulados", desc: "1 simulado completo por dia + análise das questões erradas." },
];

function RetaFinalPage() {
  return (
    <div className="pb-16">
      <section className="bg-gradient-toga text-primary-foreground px-4 md:px-10 py-10 md:py-14">
        <div className="max-w-6xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[11px] uppercase tracking-[0.18em] font-semibold mb-4">
            <Award className="h-3 w-3" /> 42º Exame · 1ª fase
          </div>
          <h1 className="font-display text-4xl md:text-6xl leading-[0.95] text-balance max-w-3xl">A reta final começa <span className="text-gold">agora.</span></h1>
          <p className="mt-4 text-primary-foreground/85 max-w-xl">Plano de 6 semanas testado com aprovados. Aulas, flashcards e simulados, na sequência certa.</p>
          <div className="mt-8 flex flex-wrap items-end gap-8 pt-6 border-t border-primary-foreground/15">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/60 font-semibold mb-2">Faltam</p>
              <CountdownExame light />
            </div>
            <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <Calendar className="h-4 w-4 text-gold" /> Data prevista: 23 de setembro de 2026
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl px-4 md:px-10 py-10">
        <h2 className="font-display text-3xl mb-6">Plano de 6 semanas</h2>
        <div className="space-y-3">
          {semanas.map((s, i) => (
            <div key={s.titulo} className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-gradient-gold grid place-items-center text-gold-foreground font-display text-lg shrink-0">{i + 1}</div>
              <div className="flex-1">
                <p className="font-display text-lg leading-tight">{s.titulo}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 grid md:grid-cols-2 gap-3">
          <Link to="/simulados" className="group p-5 rounded-xl border border-border bg-card flex items-center gap-4 hover:shadow-md transition-all">
            <Target className="h-7 w-7 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-display text-lg">Começar pelo simulado diagnóstico</p>
              <p className="text-xs text-muted-foreground">80 questões, 5h — descubra seus pontos fracos.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link to="/materias" className="group p-5 rounded-xl border border-border bg-card flex items-center gap-4 hover:shadow-md transition-all">
            <BookOpen className="h-7 w-7 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-display text-lg">Ir direto para as matérias</p>
              <p className="text-xs text-muted-foreground">Estude pela ordem do plano ou pela sua preferência.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>
    </div>
  );
}
