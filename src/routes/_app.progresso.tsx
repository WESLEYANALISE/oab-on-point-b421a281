import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect } from "react";
import { TrendingUp, Target, ClipboardList, CheckCircle2, CalendarDays, Flag, Save, ArrowRight } from "lucide-react";
import {
  getProgressoQuizzes,
  getMetas,
  saveMetas,
  type Metas,
} from "@/lib/progresso-quizzes.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/progresso")({
  head: () => ({
    meta: [
      { title: "Meu Progresso · OAB na Risca" },
      { name: "description", content: "Acompanhe seus acertos em quizzes e defina suas metas semanais até o dia da prova da OAB." },
    ],
  }),
  component: ProgressoPage,
});

function ProgressoPage() {
  const fetchProgresso = useServerFn(getProgressoQuizzes);
  const fetchMetas = useServerFn(getMetas);
  const mutMetas = useServerFn(saveMetas);
  const qc = useQueryClient();

  const progresso = useQuery({ queryKey: ["progresso-quizzes"], queryFn: () => fetchProgresso() });
  const metas = useQuery({ queryKey: ["oab-metas"], queryFn: () => fetchMetas() });

  const save = useMutation({
    mutationFn: (data: Metas) => mutMetas({ data }),
    onSuccess: () => {
      toast.success("Metas salvas");
      qc.invalidateQueries({ queryKey: ["oab-metas"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  return (
    <div className="space-y-8 md:space-y-12 pb-10">
      <section className="relative overflow-hidden bg-gradient-toga text-primary-foreground">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }} />
        <div className="relative px-4 md:px-10 py-6 md:py-12 max-w-6xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-[10px] uppercase tracking-[0.16em] font-semibold mb-4">
            <TrendingUp className="h-3 w-3" /> Meu progresso
          </div>
          <h1 className="font-display text-3xl md:text-5xl leading-tight">Você está <span className="text-gold">na risca.</span></h1>
          <p className="mt-2 md:mt-3 text-primary-foreground/80 text-sm md:text-base max-w-xl">
            Veja seus acertos em quizzes e siga firme com suas metas até o exame.
          </p>
        </div>
      </section>

      <QuizMetrics data={progresso.data} loading={progresso.isLoading} />

      <MetasPanel
        metas={metas.data}
        loading={metas.isLoading}
        saving={save.isPending}
        onSave={(d) => save.mutate(d)}
        semanaQuestoes={progresso.data?.semanaQuestoes ?? 0}
      />

      <PorMateria items={progresso.data?.porMateria ?? []} loading={progresso.isLoading} />
    </div>
  );
}

function QuizMetrics({ data, loading }: { data: any; loading: boolean }) {
  const cards = [
    { label: "Questões respondidas", value: loading ? "—" : String(data?.totalQuestoes ?? 0), icon: ClipboardList, color: "text-gold" },
    { label: "Acertos totais", value: loading ? "—" : String(data?.acertos ?? 0), icon: CheckCircle2, color: "text-primary" },
    { label: "Taxa de acerto", value: loading ? "—" : `${data?.taxa ?? 0}%`, icon: Target, color: "text-primary" },
    { label: "Questões nesta semana", value: loading ? "—" : String(data?.semanaQuestoes ?? 0), icon: TrendingUp, color: "text-gold" },
  ];
  return (
    <section className="px-4 md:px-10 max-w-6xl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl border border-border bg-card p-4">
              <Icon className={`h-5 w-5 ${m.color}`} />
              <p className="font-display text-3xl mt-3 leading-none tabular-nums">{m.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5">{m.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetasPanel({
  metas,
  loading,
  saving,
  onSave,
  semanaQuestoes,
}: {
  metas: Metas | undefined;
  loading: boolean;
  saving: boolean;
  onSave: (m: Metas) => void;
  semanaQuestoes: number;
}) {
  const [form, setForm] = useState<Metas>({
    data_prova: null,
    meta_semanal_questoes: 100,
    meta_semanal_minutos: 300,
    meta_semanal_aulas: 5,
  });

  useEffect(() => {
    if (metas) setForm(metas);
  }, [metas]);

  const diasAteProva = useMemo(() => {
    if (!form.data_prova) return null;
    const d = new Date(form.data_prova + "T00:00:00");
    const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [form.data_prova]);

  const semanasRestantes = diasAteProva != null && diasAteProva > 0 ? Math.max(1, Math.ceil(diasAteProva / 7)) : null;
  const questoesSugeridasSemana = semanasRestantes ? Math.max(form.meta_semanal_questoes, Math.ceil(800 / semanasRestantes)) : form.meta_semanal_questoes;

  const pctSemana = Math.min(100, Math.round((semanaQuestoes / Math.max(1, form.meta_semanal_questoes)) * 100));

  return (
    <section className="px-4 md:px-10 max-w-6xl">
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Metas</p>
        <h2 className="font-display text-2xl md:text-3xl mt-1">Plano até a OAB</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Contagem regressiva */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-gold">
            <CalendarDays className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">Prova OAB</span>
          </div>
          {diasAteProva == null ? (
            <p className="mt-3 text-sm text-muted-foreground">Defina a data da sua prova para ativar o plano.</p>
          ) : diasAteProva > 0 ? (
            <>
              <p className="font-display text-5xl mt-3 leading-none tabular-nums">{diasAteProva}</p>
              <p className="text-xs text-muted-foreground mt-1">dias até {new Date(form.data_prova + "T00:00:00").toLocaleDateString("pt-BR")}</p>
              {semanasRestantes && (
                <p className="text-xs text-muted-foreground mt-3">
                  Sugestão: <span className="text-foreground font-medium">{questoesSugeridasSemana} questões/semana</span> para chegar a ~800 até o exame.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm">A prova já passou. Atualize a data para um novo ciclo.</p>
          )}
        </div>

        {/* Progresso da semana */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-primary">
            <Flag className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">Meta da semana</span>
          </div>
          <p className="font-display text-3xl mt-3 leading-none tabular-nums">
            {semanaQuestoes}<span className="text-base text-muted-foreground"> / {form.meta_semanal_questoes}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">questões respondidas</p>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-gradient-gold" style={{ width: `${pctSemana}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">{pctSemana}% concluído</p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-primary">
            <Target className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold">Editar metas</span>
          </div>
          <div className="mt-3 space-y-3">
            <Field label="Data da prova">
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                value={form.data_prova ?? ""}
                onChange={(e) => setForm({ ...form, data_prova: e.target.value || null })}
              />
            </Field>
            <Field label="Questões / semana">
              <input
                type="number" min={0} max={2000}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums"
                value={form.meta_semanal_questoes}
                onChange={(e) => setForm({ ...form, meta_semanal_questoes: Number(e.target.value) || 0 })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Min. / semana">
                <input
                  type="number" min={0} max={10080}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums"
                  value={form.meta_semanal_minutos}
                  onChange={(e) => setForm({ ...form, meta_semanal_minutos: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Aulas / semana">
                <input
                  type="number" min={0} max={200}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm tabular-nums"
                  value={form.meta_semanal_aulas}
                  onChange={(e) => setForm({ ...form, meta_semanal_aulas: Number(e.target.value) || 0 })}
                />
              </Field>
            </div>
            <button
              disabled={loading || saving}
              onClick={() => onSave(form)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-60"
            >
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar metas"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function PorMateria({ items, loading }: { items: { materia: string; acertos: number; total: number }[]; loading: boolean }) {
  return (
    <section className="px-4 md:px-10 max-w-6xl">
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">Acertos por matéria</p>
          <h2 className="font-display text-2xl md:text-3xl mt-1">Desempenho</h2>
        </div>
        <Link to="/questoes" className="text-sm text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
          Treinar questões <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            Você ainda não respondeu quizzes. <Link to="/questoes" className="text-primary underline">Começar agora</Link>.
          </div>
        ) : (
          items.map((m) => {
            const pct = m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0;
            return (
              <div key={m.materia} className="p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="font-medium text-sm truncate">{m.materia}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {m.acertos}/{m.total} · {pct}%
                  </p>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${pct >= 70 ? "bg-gradient-gold" : "bg-gradient-toga"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
