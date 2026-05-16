import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Briefcase, Sparkles, Check, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/auth/AuthShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DORES_OPTIONS } from "@/data/onboarding-options";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Personalize seus estudos — OAB na Risca" }] }),
  component: OnboardingPage,
});

type Status = "cursando" | "formado" | "outro";

function OnboardingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState<Status | null>(null);
  const [semestre, setSemestre] = useState<number | null>(null);
  const [dores, setDores] = useState<string[]>([]);
  const [doresOutro, setDoresOutro] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  function toggleDor(id: string) {
    setDores((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  async function finish() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        status_academico: status,
        semestre: status === "cursando" ? semestre : null,
        dores,
        dores_outro: doresOutro.trim() || null,
        onboarding_completo: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tudo pronto! Bom estudo 🎯");
    navigate({ to: "/" });
  }

  return (
    <AuthShell
      title={step === 1 ? "Sobre você" : step === 2 ? "O que você precisa?" : "Tudo certo!"}
      subtitle={
        step === 1 ? "Conta um pouco da sua fase atual." :
        step === 2 ? "Selecione tudo que vai te ajudar." :
        "Vamos ajustar o app pra te apoiar nessa jornada."
      }
    >
      <div className="flex items-center gap-1.5 mb-5">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-gold" : "bg-gold/15"}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <StatusCard active={status === "cursando"} onClick={() => setStatus("cursando")} icon={GraduationCap} label="Estou cursando Direito" />
          <StatusCard active={status === "formado"} onClick={() => setStatus("formado")} icon={Briefcase} label="Já me formei" />
          <StatusCard active={status === "outro"} onClick={() => setStatus("outro")} icon={Sparkles} label="Outro caso" />

          {status === "cursando" && (
            <div className="pt-2">
              <p className="text-xs uppercase tracking-[0.18em] text-gold/80 font-semibold mb-2">Qual semestre?</p>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSemestre(s)}
                    className={`h-10 rounded-xl border font-display font-semibold text-sm transition ${
                      semestre === s
                        ? "bg-gold text-gold-foreground border-gold"
                        : "bg-[oklch(0.18_0.05_18)/0.6] border-gold/20 text-primary-foreground hover:border-gold/50"
                    }`}
                  >
                    {s}º
                  </button>
                ))}
              </div>
            </div>
          )}

          <StepNav
            onNext={() => setStep(2)}
            nextDisabled={!status || (status === "cursando" && !semestre)}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DORES_OPTIONS.map((opt) => {
              const active = dores.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleDor(opt.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm border transition ${
                    active
                      ? "bg-gold text-gold-foreground border-gold"
                      : "bg-[oklch(0.18_0.05_18)/0.6] border-gold/20 text-primary-foreground hover:border-gold/50"
                  }`}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                  {opt.label}
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.18em] text-gold/80 font-semibold">Outra coisa? (opcional)</span>
            <textarea
              value={doresOutro}
              onChange={(e) => setDoresOutro(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Conta com suas palavras..."
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-2xl bg-[oklch(0.18_0.05_18)/0.6] border border-gold/20 text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/30 transition resize-none"
            />
          </label>

          <StepNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={dores.length === 0 && !doresOutro.trim()} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-[oklch(0.18_0.05_18)/0.6] border border-gold/20 p-4 space-y-2 text-sm text-primary-foreground/85">
            <p><span className="text-gold/80">Status:</span> {status === "cursando" ? `Cursando — ${semestre}º semestre` : status === "formado" ? "Formado" : "Outro"}</p>
            <p><span className="text-gold/80">Necessidades:</span> {dores.length} selecionada{dores.length !== 1 ? "s" : ""}{doresOutro.trim() ? " + observação" : ""}</p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-gold/25 text-primary-foreground hover:bg-gold/10 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gold text-gold-foreground font-semibold py-3 shadow-[0_10px_30px_-10px_oklch(0.78_0.13_80/0.7)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Entrar no app
            </button>
          </div>
        </div>
      )}
    </AuthShell>
  );
}

function StatusCard({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: typeof GraduationCap; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border transition text-left ${
        active
          ? "bg-gold/10 border-gold text-primary-foreground"
          : "bg-[oklch(0.18_0.05_18)/0.6] border-gold/20 text-primary-foreground hover:border-gold/50"
      }`}
    >
      <div className={`h-10 w-10 rounded-xl grid place-items-center shrink-0 ${active ? "bg-gold text-gold-foreground" : "bg-gold/15 text-gold border border-gold/25"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-display font-semibold tracking-tight">{label}</span>
      {active && <Check className="ml-auto h-4 w-4 text-gold" />}
    </button>
  );
}

function StepNav({
  onBack, onNext, nextDisabled,
}: { onBack?: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="flex gap-2 pt-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-gold/25 text-primary-foreground hover:bg-gold/10 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gold text-gold-foreground font-semibold py-3 shadow-[0_10px_30px_-10px_oklch(0.78_0.13_80/0.7)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
      >
        Continuar <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
