import { BookOpen, Flame, CheckCircle2, FileText, ScrollText, Trophy } from "lucide-react";

/** Telas conceituais (puro CSS) — sem screenshots reais. */
export function MockSimulado() {
  return (
    <div className="h-full flex flex-col p-4 bg-gradient-to-b from-[#1a0a0a] to-[#0a0a0a]">
      <div className="flex items-center justify-between mb-3 mt-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: "#d4a84b" }} />
          <span className="text-white text-xs font-bold">Simulado 42º</span>
        </div>
        <span className="text-[10px] font-mono text-white/60">02:14:33</span>
      </div>
      <div className="h-1 rounded-full bg-white/10 mb-4">
        <div className="h-full rounded-full" style={{ width: "62%", background: "linear-gradient(to right,#d4a84b,#fbbf24)" }} />
      </div>
      <p className="text-[11px] text-white/55 mb-2">Questão 49 de 80 • Civil</p>
      <p className="text-white text-[13px] leading-snug mb-4 font-medium">
        Sobre a responsabilidade civil objetiva, assinale a alternativa correta nos termos do CC/2002:
      </p>
      <div className="space-y-2">
        {["A) Depende sempre de culpa", "B) Independe de culpa nos casos previstos em lei", "C) Aplica-se apenas ao Estado", "D) Exige dolo específico"].map((a, i) => (
          <div
            key={a}
            className="px-3 py-2 rounded-lg text-[11px]"
            style={{
              background: i === 1 ? "rgba(212,168,75,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i === 1 ? "rgba(212,168,75,0.5)" : "rgba(255,255,255,0.07)"}`,
              color: i === 1 ? "#fff" : "rgba(255,255,255,0.75)",
            }}
          >
            {a}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockFlashcard() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#0a0a1a] to-[#0a0a0a]">
      <div className="flex items-center gap-2 mb-4 mt-2">
        <Flame className="w-4 h-4" style={{ color: "#ef4444" }} />
        <span className="text-white/80 text-xs font-bold">Sequência: 18 dias</span>
      </div>
      <div
        className="w-full rounded-2xl p-5 mb-4"
        style={{
          background: "linear-gradient(135deg, rgba(212,168,75,0.18), rgba(0,0,0,0.4))",
          border: "1px solid rgba(212,168,75,0.4)",
          boxShadow: "0 0 30px rgba(212,168,75,0.15) inset",
        }}
      >
        <p className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-2">Direito Penal</p>
        <p className="text-white text-base font-semibold leading-tight mb-3">
          O que caracteriza o crime de peculato?
        </p>
        <p className="text-white/70 text-xs leading-relaxed">
          Apropriação, desvio ou subtração de bem público ou particular sob a guarda do funcionário público, em razão do cargo.
        </p>
      </div>
      <div className="flex gap-2 w-full">
        <button className="flex-1 py-2 rounded-lg text-xs font-bold text-white" style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.5)" }}>Errei</button>
        <button className="flex-1 py-2 rounded-lg text-xs font-bold" style={{ background: "rgba(212,168,75,0.85)", color: "#000" }}>Acertei</button>
      </div>
      <div className="flex items-center gap-1 mt-4 text-[10px] text-white/40">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        24 de 30 cards hoje
      </div>
    </div>
  );
}

export function MockVadeMecum() {
  return (
    <div className="h-full flex flex-col p-4 bg-gradient-to-b from-[#0a0f0a] to-[#0a0a0a]">
      <div className="flex items-center gap-2 mb-3 mt-2">
        <ScrollText className="w-4 h-4" style={{ color: "#d4a84b" }} />
        <span className="text-white text-xs font-bold">Vade Mecum</span>
      </div>
      <p className="text-[11px] text-white/50 mb-1">Constituição Federal</p>
      <h3 className="text-white font-bold text-sm mb-3">Art. 5º</h3>
      <div className="space-y-2 text-[11px] leading-relaxed text-white/85">
        <p>
          Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade…
        </p>
        <p
          className="px-2 py-1.5 rounded"
          style={{ background: "rgba(212,168,75,0.12)", borderLeft: "2px solid #d4a84b" }}
        >
          <span className="text-amber-300/90 font-semibold">Súmula 736 STF:</span> Compete à Justiça do Trabalho julgar…
        </p>
      </div>
      <div className="mt-auto pt-3 flex gap-2">
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/60 border border-white/10">Anotar</span>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/60 border border-white/10">Marcar</span>
        <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-white/60 border border-white/10">Buscar</span>
      </div>
    </div>
  );
}

export function MockAula() {
  return (
    <div className="h-full flex flex-col p-4 bg-gradient-to-b from-[#0a0a14] to-[#0a0a0a]">
      <div className="flex items-center gap-2 mb-3 mt-2">
        <BookOpen className="w-4 h-4" style={{ color: "#d4a84b" }} />
        <span className="text-white text-xs font-bold">Aula Interativa</span>
      </div>
      <div
        className="rounded-xl aspect-video mb-3 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #1f1410, #0a0a0a)",
          border: "1px solid rgba(212,168,75,0.3)",
        }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(212,168,75,0.85)" }}
        >
          <div className="w-0 h-0 ml-1" style={{ borderLeft: "12px solid #000", borderTop: "8px solid transparent", borderBottom: "8px solid transparent" }} />
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold mb-1">Constitucional • Aula 12</p>
      <p className="text-white text-sm font-semibold leading-tight mb-3">
        Controle de constitucionalidade: ADI, ADC e ADPF
      </p>
      <div className="space-y-1.5">
        {[
          { c: true, t: "Conceitos fundamentais" },
          { c: true, t: "Legitimados ativos" },
          { c: false, t: "Quiz de revisão" },
          { c: false, t: "Resumo final" },
        ].map((s) => (
          <div key={s.t} className="flex items-center gap-2 text-[11px]">
            <CheckCircle2 className={`w-3.5 h-3.5 ${s.c ? "text-emerald-400" : "text-white/20"}`} />
            <span className={s.c ? "text-white/80 line-through" : "text-white/55"}>{s.t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockResumo() {
  return (
    <div className="h-full flex flex-col p-4 bg-gradient-to-b from-[#14100a] to-[#0a0a0a]">
      <div className="flex items-center gap-2 mb-3 mt-2">
        <FileText className="w-4 h-4" style={{ color: "#d4a84b" }} />
        <span className="text-white text-xs font-bold">Resumo • Tributário</span>
      </div>
      <h3 className="text-white font-bold text-base mb-2">Princípios constitucionais tributários</h3>
      <div className="space-y-2 text-[11px] leading-relaxed">
        {[
          { k: "Legalidade", v: "Tributo só pode ser criado ou majorado por lei (art. 150, I, CF)" },
          { k: "Anterioridade", v: "Veda cobrança no mesmo exercício da publicação da lei" },
          { k: "Irretroatividade", v: "Lei tributária não retroage para alcançar fatos anteriores" },
          { k: "Isonomia", v: "Trata igualmente contribuintes em situação equivalente" },
        ].map((p) => (
          <div key={p.k} className="px-2.5 py-2 rounded-lg" style={{ background: "rgba(212,168,75,0.08)", border: "1px solid rgba(212,168,75,0.18)" }}>
            <p className="text-amber-300 font-bold text-[11px] mb-0.5">{p.k}</p>
            <p className="text-white/75">{p.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export const MOCK_SCREENS = [
  { id: "simulado", node: <MockSimulado />, title: "Simulados cronometrados", desc: "Treino real, com 80 questões e tempo de prova." },
  { id: "flash", node: <MockFlashcard />, title: "Flashcards inteligentes", desc: "Revisão espaçada para fixar o que importa." },
  { id: "vade", node: <MockVadeMecum />, title: "Vade Mecum sempre à mão", desc: "Lei seca, súmulas e jurisprudência atualizadas." },
  { id: "aula", node: <MockAula />, title: "Aulas interativas guiadas", desc: "Conceito, exemplo, quiz de revisão e resumo." },
  { id: "resumo", node: <MockResumo />, title: "Resumos densos e diretos", desc: "Só o que cai na OAB, sem encheção." },
];
