import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ChevronDown,
} from "lucide-react";
import { listResenhaMes } from "@/lib/resenha-sync.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/atualizacoes-leis/")({
  head: () => ({
    meta: [
      { title: "Atualizações de Leis — OAB na Risca" },
      { name: "description", content: "Acompanhe diariamente as novas leis, emendas, MPs e decretos publicados no D.O.U. pelo Planalto." },
    ],
  }),
  component: AtualizacoesLeisPage,
});

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const TIPO_LABEL: Record<string, { label: string; cor: string; short: string }> = {
  lei: { label: "Lei", short: "LEI", cor: "bg-gold/20 text-gold border-gold/40" },
  lei_complementar: { label: "Lei Complementar", short: "LC", cor: "bg-gold/30 text-gold border-gold/50" },
  emenda_constitucional: { label: "Emenda Constitucional", short: "EC", cor: "bg-primary/30 text-primary-foreground border-primary/50" },
  medida_provisoria: { label: "Medida Provisória", short: "MP", cor: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  decreto: { label: "Decreto", short: "DEC", cor: "bg-secondary text-secondary-foreground border-border" },
  decreto_lei: { label: "Decreto-Lei", short: "DL", cor: "bg-secondary text-secondary-foreground border-border" },
  mensagem_veto: { label: "Mensagem de Veto", short: "VETO", cor: "bg-red-500/20 text-red-300 border-red-500/40" },
  outro: { label: "Outro", short: "ATO", cor: "bg-muted text-muted-foreground border-border" },
};

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "lei", label: "Leis" },
  { key: "emenda_constitucional", label: "EC" },
  { key: "medida_provisoria", label: "MP" },
  { key: "decreto", label: "Decretos" },
  { key: "mensagem_veto", label: "Vetos" },
];

function AtualizacoesLeisPage() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>("todos");
  const [calendarioAberto, setCalendarioAberto] = useState(false);

  const listMes = useServerFn(listResenhaMes);

  const q = useQuery({
    queryKey: ["resenha-mes", ano, mes],
    queryFn: () => listMes({ data: { ano, mes } }),
    staleTime: 60_000,
  });

  const atos = q.data?.atos ?? [];
  const dias = q.data?.dias ?? [];

  // Mapa de contagens por dia ISO
  const contagemPorDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of atos) m.set(a.data_dou, (m.get(a.data_dou) ?? 0) + 1);
    return m;
  }, [atos]);

  const diasComAtos = useMemo(() => new Set(contagemPorDia.keys()), [contagemPorDia]);

  // Todos os dias do mês, em ordem crescente, com status
  const diasDoMes = useMemo(() => {
    const total = new Date(ano, mes, 0).getDate();
    const hojeStr = new Date().toISOString().slice(0, 10);
    // último dia com atos publicados
    let ultimoComAtos: string | null = null;
    for (const iso of contagemPorDia.keys()) {
      if (!ultimoComAtos || iso > ultimoComAtos) ultimoComAtos = iso;
    }
    return Array.from({ length: total }, (_, i) => {
      const dia = i + 1;
      const iso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const count = contagemPorDia.get(iso) ?? 0;
      const futuro = iso > hojeStr;
      const status: "ultimo" | "com-atos" | "sem-atos" | "futuro" =
        futuro ? "futuro" : iso === ultimoComAtos ? "ultimo" : count > 0 ? "com-atos" : "sem-atos";
      return { iso, dia, count, status };
    });
  }, [ano, mes, contagemPorDia]);

  const atosDoDia = useMemo(() => {
    if (!diaSel) return [];
    return atos.filter((a) => a.data_dou === diaSel && (filtro === "todos" || a.tipo === filtro));
  }, [atos, diaSel, filtro]);

  const diaSelInfo = useMemo(
    () => diasDoMes.find((d) => d.iso === diaSel) ?? null,
    [diasDoMes, diaSel],
  );


  const ultimoSync = dias[0]?.extraido_em ?? null;

  function navMes(delta: number) {
    let novoMes = mes + delta;
    let novoAno = ano;
    if (novoMes > 12) { novoMes = 1; novoAno += 1; }
    if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
    setMes(novoMes); setAno(novoAno); setDiaSel(null);
  }

  return (
    <div className="px-4 md:px-8 py-5 max-w-5xl mx-auto pb-12 space-y-5">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-widest text-gold">Diário Oficial · Planalto</p>
        <h1 className="font-display text-2xl md:text-3xl leading-tight">Atualizações de Leis</h1>
        <p className="text-sm text-muted-foreground">
          Novas leis, EC, MPs, decretos e vetos publicados no D.O.U. — sincronizado 3x ao dia.
        </p>
      </header>

      {/* Navegador de mês */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
        <button onClick={() => navMes(-1)} aria-label="Mês anterior"
          className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-display text-lg leading-none">{MESES_PT[mes - 1]}</p>
          <p className="text-xs text-muted-foreground">{ano}</p>
        </div>
        <button onClick={() => navMes(1)} aria-label="Próximo mês"
          className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {ultimoSync && (
        <p className="text-[11px] text-muted-foreground">
          Última atualização automática: <span className="text-foreground">{new Date(ultimoSync).toLocaleString("pt-BR")}</span>
        </p>
      )}

      {/* Lista de dias numerados + toggle calendário */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Dias com publicações</p>
          <button
            onClick={() => setCalendarioAberto((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-gold font-semibold hover:underline"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {calendarioAberto ? "Recolher calendário" : "Expandir calendário"}
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", calendarioAberto && "rotate-180")} />
          </button>
        </div>

        {calendarioAberto && (
          <Calendario
            ano={ano}
            mes={mes}
            diasComAtos={diasComAtos}
            diaSelecionado={diaSel}
            onSelect={(d) => setDiaSel(d === diaSel ? null : d)}
          />
        )}

        {!calendarioAberto && (
          q.isLoading ? (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 w-14 shrink-0 rounded-xl bg-card border border-border animate-pulse" />
              ))}
            </div>
          ) : (
            <DiasCarrossel
              dias={diasDoMes}
              diaSel={diaSel}
              ano={ano}
              mes={mes}
              onSelect={(iso) => setDiaSel(diaSel === iso ? null : iso)}
            />
          )
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
              filtro === f.key
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-muted-foreground border-border hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : diaSel ? (
        diaSelInfo?.status === "futuro" ? (
          <EmptyState
            text={`Este dia ainda não foi publicado no D.O.U. A sincronização automática roda 3x ao dia (08h, 14h e 20h, horário de Brasília). Volte mais tarde para ver as atualizações de ${formatarDia(diaSel)}.`}
          />
        ) : atosDoDia.length === 0 ? (
          <EmptyState
            text={
              diaSelInfo?.status === "sem-atos"
                ? `Não houve publicação de atos no D.O.U. em ${formatarDia(diaSel)}.`
                : `Nenhum ato ${filtro !== "todos" ? "deste tipo " : ""}em ${formatarDia(diaSel)}.`
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {atosDoDia.map((a) => <AtoItem key={a.id} ato={a} />)}
          </ul>
        )
      ) : (
        <UltimosAtos atos={atos.filter((a) => filtro === "todos" || a.tipo === filtro).slice(0, 20)} />
      )}
    </div>
  );
}

function Calendario({
  ano, mes, diasComAtos, diaSelecionado, onSelect,
}: {
  ano: number; mes: number; diasComAtos: Set<string>;
  diaSelecionado: string | null; onSelect: (d: string) => void;
}) {
  const primeiroDia = new Date(ano, mes - 1, 1);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const offsetInicio = primeiroDia.getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < offsetInicio; i++) cells.push(null);
  for (let d = 1; d <= diasNoMes; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl border border-border bg-card p-3 md:p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["D","S","T","Q","Q","S","S"].map((d, i) => (
          <div key={i} className="text-[10px] uppercase tracking-widest text-muted-foreground text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const iso = `${ano}-${String(mes).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const tem = diasComAtos.has(iso);
          const sel = iso === diaSelecionado;
          const hoje = iso === hojeStr;
          return (
            <button
              key={i}
              onClick={() => tem && onSelect(iso)}
              disabled={!tem}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all relative",
                tem ? "hover:bg-muted cursor-pointer text-foreground" : "text-muted-foreground/40 cursor-default",
                sel && "bg-gold text-gold-foreground font-bold hover:bg-gold",
                hoje && !sel && "ring-1 ring-gold/60",
              )}
            >
              <span>{d}</span>
              {tem && !sel && <span className="h-1 w-1 rounded-full bg-gold absolute bottom-1.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AtoItem({ ato }: { ato: { id: string; tipo: string; numero: string; data_dou: string; data_assinatura: string | null; ementa: string; url: string; created_at: string; edicao_extra: boolean } }) {
  const t = TIPO_LABEL[ato.tipo] ?? TIPO_LABEL.outro;
  const novo = Date.now() - new Date(ato.created_at).getTime() < 24 * 3600 * 1000;
  return (
    <li>
      <Link
        to="/atualizacoes-leis/$atoId"
        params={{ atoId: ato.id }}
        className="flex h-[7.5rem] rounded-xl border border-border bg-card p-3.5 hover:border-gold/40 transition-colors"
      >
        <div className="flex items-start gap-3 w-full">
          <span className={cn("shrink-0 inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold tracking-wider", t.cor)}>
            {t.short}
          </span>
          <div className="flex-1 min-w-0 flex flex-col">
            <p className="font-display text-sm leading-tight">
              {t.label} nº {ato.numero}
              {ato.data_assinatura && <span className="text-muted-foreground font-sans"> · {formatarDia(ato.data_assinatura)}</span>}
              {novo && <span className="ml-2 text-[9px] uppercase tracking-widest text-gold font-bold">novo</span>}
              {ato.edicao_extra && <span className="ml-2 text-[9px] uppercase tracking-widest text-red-300 font-bold">edição extra</span>}
            </p>
            {ato.ementa && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{ato.ementa}</p>}
          </div>
        </div>
      </Link>
    </li>
  );
}

function UltimosAtos({ atos }: { atos: Array<Parameters<typeof AtoItem>[0]["ato"]> }) {
  if (atos.length === 0) {
    return <EmptyState text="Nenhum ato no mês selecionado. Selecione um dia para ver detalhes ou rode uma sincronização." />;
  }
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Últimas publicações do mês</p>
      <ul className="space-y-2.5">
        {atos.map((a) => <AtoItem key={a.id} ato={a} />)}
      </ul>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
      <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function formatarDia(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y}`;
}
