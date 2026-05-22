import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Calendar, CheckCircle2, Clock, CircleDashed, FileText } from "lucide-react";
import { EXAMES_OAB, FONTE_OFICIAL, FONTE_EDITAIS, type EventoCalendario } from "@/data/oab-calendario";

export const Route = createFileRoute("/_app/oab/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário OAB — Exames anteriores e próximos" },
      { name: "description", content: "Cronograma completo do Exame de Ordem Unificado: datas oficiais do exame em andamento e histórico dos últimos exames." },
    ],
  }),
  component: CalendarioPage,
});

function StatusIcon({ status }: { status: EventoCalendario["status"] }) {
  if (status === "concluido") return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
  if (status === "atual") return <Clock className="h-4 w-4 text-gold" />;
  return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
}

function StatusBadge({ status }: { status: "em-andamento" | "encerrado" | "previsto" }) {
  const map = {
    "em-andamento": { label: "Em andamento", cls: "bg-gold/15 border-gold/40 text-gold" },
    encerrado: { label: "Encerrado", cls: "bg-muted/40 border-border text-muted-foreground" },
    previsto: { label: "Previsto", cls: "bg-primary/15 border-primary/40 text-primary-foreground" },
  } as const;
  const m = map[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.18em] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function CalendarioPage() {
  return (
    <div className="pb-16">
      {/* Header */}
      <header className="px-4 pt-5 pb-6 bg-gradient-toga text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-20 -right-12 h-56 w-56 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
        <p className="text-[10px] uppercase tracking-[0.24em] text-gold/85 font-semibold mb-2">Calendário OAB</p>
        <h1 className="font-display font-bold text-[26px] md:text-[34px] leading-[1.1] tracking-tight mb-2">
          Cronograma do Exame de Ordem
        </h1>
        <p className="text-[13px] md:text-sm text-primary-foreground/80 leading-snug max-w-prose">
          Datas oficiais coletadas direto do site do Exame de Ordem Unificado (FGV/OAB).
          Acompanhe o exame em andamento e o histórico dos últimos exames aplicados.
        </p>
        <a
          href={FONTE_OFICIAL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/25 text-primary-foreground text-[11px] font-medium hover:bg-primary-foreground/20 transition"
        >
          <ExternalLink className="h-3 w-3" /> Fonte: examedeordem.oab.org.br
        </a>
      </header>

      {/* Lista de exames */}
      <div className="px-4 mt-6 space-y-6">
        {EXAMES_OAB.map((exame) => (
          <article
            key={exame.numero}
            className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm"
          >
            <header className="p-4 md:p-5 border-b border-border bg-muted/30">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/30 grid place-items-center shrink-0">
                    <Calendar className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Exame</p>
                    <h2 className="font-display font-semibold text-[18px] leading-tight tracking-tight">
                      {exame.titulo}
                    </h2>
                  </div>
                </div>
                <StatusBadge status={exame.status} />
              </div>
              <p className="text-[13px] text-muted-foreground leading-snug">{exame.resumo}</p>
              {exame.linkEdital && (
                <a
                  href={exame.linkEdital}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-gold hover:text-gold/80"
                >
                  <FileText className="h-3.5 w-3.5" /> Editais e provas oficiais
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </header>

            <ol className="p-4 md:p-5 space-y-3">
              {exame.eventos.map((ev, i) => (
                <li key={i} className="relative pl-7">
                  <span className="absolute left-0 top-0.5">
                    <StatusIcon status={ev.status} />
                  </span>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[11px] uppercase tracking-[0.18em] font-semibold text-gold/90 tabular-nums">
                      {ev.rotulo}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold leading-snug mt-0.5">{ev.titulo}</p>
                  {ev.detalhe && (
                    <p className="text-[12px] text-muted-foreground leading-snug mt-1">{ev.detalhe}</p>
                  )}
                </li>
              ))}
            </ol>
          </article>
        ))}

        <a
          href={FONTE_EDITAIS}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-center text-[13px] text-muted-foreground hover:text-foreground hover:border-gold/40 transition"
        >
          Ver todos os exames anteriores no site oficial
          <ExternalLink className="inline h-3.5 w-3.5 ml-1.5 -mt-0.5" />
        </a>
      </div>
    </div>
  );
}
