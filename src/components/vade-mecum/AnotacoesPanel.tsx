import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, RotateCw, StickyNote, Plus, FileText } from "lucide-react";
import {
  gerarSugestoesAnotacoesArtigo,
  listarAnotacoesDaLei,
} from "@/lib/artigo-anotacoes.functions";

type SubAba = "minhas" | "sugestoes" | "historico";

export function AnotacoesPanel({
  userId,
  leiId,
  artigoId,
  artigoNumero,
  onAbrirArtigo,
}: {
  userId: string | null;
  leiId: string | null;
  artigoId: string;
  artigoNumero: string | null;
  onAbrirArtigo?: (artigoId: string) => void;
}) {
  const [aba, setAba] = useState<SubAba>("minhas");

  if (!userId) {
    return (
      <div className="text-center py-12">
        <StickyNote className="h-10 w-10 text-gold/60 mx-auto mb-3" />
        <p className="text-sm">Entre na sua conta para criar anotações.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="inline-flex w-full rounded-full bg-card/60 border border-border/60 p-1 gap-1">
        {(
          [
            { id: "minhas", label: "Minhas" },
            { id: "sugestoes", label: "Sugestões IA" },
            { id: "historico", label: "Histórico" },
          ] as { id: SubAba; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setAba(t.id)}
            className={`flex-1 h-8 rounded-full text-[12px] font-semibold transition ${
              aba === t.id
                ? "bg-gold text-black"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aba === "minhas" && (
        <MinhasAnotacoes
          userId={userId}
          leiId={leiId}
          artigoId={artigoId}
          artigoNumero={artigoNumero}
        />
      )}
      {aba === "sugestoes" && (
        <SugestoesIA
          userId={userId}
          leiId={leiId}
          artigoId={artigoId}
          onUsarBullet={() => setAba("minhas")}
        />
      )}
      {aba === "historico" && (
        <HistoricoAnotacoes
          userId={userId}
          leiId={leiId}
          artigoIdAtual={artigoId}
          onAbrirArtigo={onAbrirArtigo}
        />
      )}
    </div>
  );
}

// =================== Minhas anotações ===================

function MinhasAnotacoes({
  userId,
  leiId,
  artigoId,
  artigoNumero,
}: {
  userId: string;
  leiId: string | null;
  artigoId: string;
  artigoNumero: string | null;
}) {
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["vade-mecum", "anotacao", artigoId, userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vade_mecum_anotacoes")
        .select("conteudo")
        .eq("user_id", userId)
        .eq("artigo_id", artigoId)
        .maybeSingle();
      if (error) throw error;
      return data?.conteudo ?? "";
    },
  });

  useEffect(() => {
    if (typeof data === "string") setTexto(data);
  }, [data]);

  // Permite que outras sub-abas mandem bullets pra cá
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ artigoId: string; bullet: string }>).detail;
      if (!detail || detail.artigoId !== artigoId) return;
      setTexto((t) => {
        const sep = t.trim().length > 0 ? "\n" : "";
        return `${t}${sep}• ${detail.bullet}`;
      });
    };
    window.addEventListener("artigo:add-bullet", handler as EventListener);
    return () =>
      window.removeEventListener("artigo:add-bullet", handler as EventListener);
  }, [artigoId]);

  const salvar = async () => {
    if (!leiId) return;
    setSalvando(true);
    try {
      const t = texto.trim();
      if (!t) {
        await (supabase as any)
          .from("vade_mecum_anotacoes")
          .delete()
          .eq("user_id", userId)
          .eq("artigo_id", artigoId);
        toast.success("Anotação removida");
      } else {
        await (supabase as any).from("vade_mecum_anotacoes").upsert(
          {
            user_id: userId,
            lei_id: leiId,
            artigo_id: artigoId,
            conteudo: t,
          },
          { onConflict: "user_id,artigo_id" },
        );
        toast.success("Anotação salva");
      }
      queryClient.invalidateQueries({
        queryKey: ["vade-mecum", "anotacao", artigoId, userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["vade-mecum", "estatuto"],
      });
      queryClient.invalidateQueries({
        queryKey: ["vade-mecum", "anotacoes-historico", leiId, userId],
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold">
        Sua anotação · Art. {artigoNumero ?? "—"}
      </p>
      {isLoading ? (
        <div className="h-40 bg-card/60 rounded-lg animate-pulse" />
      ) : (
        <>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva sua anotação sobre este artigo…"
            className="w-full min-h-[240px] p-3 rounded-xl bg-card/60 border border-border/60 focus:border-gold/60 focus:outline-none focus:ring-2 focus:ring-gold/20 text-sm leading-relaxed resize-y"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando}
              className="px-4 h-9 rounded-full bg-gradient-to-br from-gold to-amber-600 text-black font-semibold text-sm shadow-md disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Salvar anotação"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =================== Sugestões IA ===================

function SugestoesIA({
  userId,
  leiId,
  artigoId,
  onUsarBullet,
}: {
  userId: string;
  leiId: string | null;
  artigoId: string;
  onUsarBullet: () => void;
}) {
  const gerarFn = useServerFn(gerarSugestoesAnotacoesArtigo);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["vade-mecum", "anot-sugestoes", artigoId],
    queryFn: () => gerarFn({ data: { artigoId } }),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 0,
  });

  const usarBullet = (bullet: string) => {
    window.dispatchEvent(
      new CustomEvent("artigo:add-bullet", { detail: { artigoId, bullet } }),
    );
    toast.success("Adicionado à sua anotação");
    onUsarBullet();
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-card/60 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 space-y-3">
        <p className="text-sm text-muted-foreground">
          {(error as any)?.message ?? "Erro ao gerar sugestões"}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 h-9 rounded-full bg-gold/15 border border-gold/40 text-gold text-sm font-semibold"
        >
          <RotateCw className="h-3.5 w-3.5" /> Tentar de novo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold">
          Profa. Ana sugere
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RotateCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>
      <div className="space-y-2">
        {(data?.itens ?? []).map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => usarBullet(b)}
            className="w-full text-left px-3.5 py-3 rounded-2xl bg-card/70 border border-border/60 hover:border-gold/50 hover:bg-card transition-colors text-[13px] leading-snug flex items-start gap-2.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold/70 mt-0.5 shrink-0" />
            <span className="flex-1">{b}</span>
            <Plus className="h-3.5 w-3.5 text-gold shrink-0" />
          </button>
        ))}
      </div>
      <p className="text-[10.5px] text-muted-foreground text-center pt-2">
        Toque em um item pra adicionar à sua anotação.
      </p>
    </div>
  );
}

// =================== Histórico ===================

function HistoricoAnotacoes({
  userId,
  leiId,
  artigoIdAtual,
  onAbrirArtigo,
}: {
  userId: string;
  leiId: string | null;
  artigoIdAtual: string;
  onAbrirArtigo?: (artigoId: string) => void;
}) {
  const listarFn = useServerFn(listarAnotacoesDaLei);
  const { data, isLoading, isError, error } = useQuery({
    enabled: !!leiId,
    queryKey: ["vade-mecum", "anotacoes-historico", leiId, userId],
    queryFn: () => listarFn({ data: { leiId: leiId! } }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 bg-card/60 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          {(error as any)?.message ?? "Erro ao carregar histórico"}
        </p>
      </div>
    );
  }

  const itens = data?.itens ?? [];

  if (itens.length === 0) {
    return (
      <div className="text-center py-10">
        <FileText className="h-10 w-10 text-gold/60 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Você ainda não tem anotações nesta lei.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80 font-semibold mb-1">
        Suas anotações nesta lei
      </p>
      {itens.map((it) => {
        const ehAtual = it.artigo_id === artigoIdAtual;
        const data = new Date(it.updated_at);
        const dataFmt = data.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
        });
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => !ehAtual && onAbrirArtigo?.(it.artigo_id)}
            disabled={ehAtual}
            className={`w-full text-left p-3 rounded-xl border transition-colors ${
              ehAtual
                ? "bg-gold/10 border-gold/40 cursor-default"
                : "bg-card/60 border-border/60 hover:border-gold/40 hover:bg-card"
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-bold text-gold">
                Art. {it.numero ?? "—"}{ehAtual && " · atual"}
              </span>
              <span className="text-[10px] text-muted-foreground">{dataFmt}</span>
            </div>
            <p className="text-[12.5px] text-foreground/85 line-clamp-3 whitespace-pre-wrap leading-snug">
              {it.conteudo}
            </p>
          </button>
        );
      })}
    </div>
  );
}
