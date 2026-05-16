import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Save, Loader2 } from "lucide-react";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { DORES_OPTIONS } from "@/data/onboarding-options";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/perfil")({
  head: () => ({ meta: [{ title: "Meu perfil — OAB na Risca" }] }),
  component: PerfilPage,
});

function PerfilPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<"cursando" | "formado" | "outro" | "">("");
  const [semestre, setSemestre] = useState<number | null>(null);
  const [dores, setDores] = useState<string[]>([]);
  const [doresOutro, setDoresOutro] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setStatus(profile.status_academico ?? "");
    setSemestre(profile.semestre);
    setDores(profile.dores ?? []);
    setDoresOutro(profile.dores_outro ?? "");
  }, [profile]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim(),
      status_academico: status || null,
      semestre: status === "cursando" ? semestre : null,
      dores,
      dores_outro: doresOutro.trim() || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Perfil atualizado");
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  function toggleDor(id: string) {
    setDores((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  return (
    <div className="px-4 md:px-10 pt-4 pb-10 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <AvatarUploader size={72} />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">Meu perfil</p>
          <h1 className="font-display font-semibold text-2xl md:text-3xl tracking-tight truncate">
            {profile?.display_name || "Carregando..."}
          </h1>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      <Section title="Nome">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border focus:outline-none focus:border-gold/60"
        />
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap gap-2">
          {(["cursando", "formado", "outro"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-2 rounded-full text-sm border transition ${
                status === s ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"
              }`}
            >
              {s === "cursando" ? "Cursando" : s === "formado" ? "Formado" : "Outro"}
            </button>
          ))}
        </div>

        {status === "cursando" && (
          <div className="grid grid-cols-5 gap-2 mt-3">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSemestre(s)}
                className={`h-10 rounded-xl border font-display font-semibold text-sm transition ${
                  semestre === s ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"
                }`}
              >
                {s}º
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Suas necessidades">
        <div className="flex flex-wrap gap-2">
          {DORES_OPTIONS.map((opt) => {
            const active = dores.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleDor(opt.id)}
                className={`px-3 py-2 rounded-full text-sm border transition ${
                  active ? "bg-gold text-gold-foreground border-gold" : "bg-card border-border hover:border-gold/50"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={doresOutro}
          onChange={(e) => setDoresOutro(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Outra coisa? (opcional)"
          className="mt-3 w-full px-3.5 py-2.5 rounded-xl bg-card border border-border focus:outline-none focus:border-gold/60 resize-none"
        />
      </Section>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gold text-gold-foreground font-semibold py-3 shadow-md hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 px-4 rounded-2xl border border-destructive/40 text-destructive hover:bg-destructive/10 transition"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold font-semibold">{title}</p>
      {children}
    </div>
  );
}
