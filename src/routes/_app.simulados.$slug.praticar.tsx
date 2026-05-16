import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, Flag, Check, X, FileText, ListChecks } from "lucide-react";
import { getSimuladoCompleto, salvarResposta, finalizarTentativa } from "@/lib/simulados.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { isUuid } from "@/lib/simulado-slug";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/simulados/$slug/praticar")({
  head: () => ({ meta: [{ title: `Simulado — OAB na Risca` }] }),
  component: PraticaPage,
});

type Alt = "A" | "B" | "C" | "D";
type View = "enunciado" | "alternativas";
type EstadoResposta = { alt: Alt; respondida: boolean };

function loadPersisted<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function PraticaPage() {
  const { slug } = Route.useParams();
  const id = slug;
  const { user } = useAuth();
  const navigate = useNavigate();
  const completoFn = useServerFn(getSimuladoCompleto);
  const salvarFn = useServerFn(salvarResposta);
  const finalFn = useServerFn(finalizarTentativa);

  const sim = useQuery({
    queryKey: ["simulado-completo", id],
    queryFn: () => completoFn({ data: { id } }),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    enabled: !!user,
  });

  useEffect(() => {
    const canonical = sim.data?.simulado.slug;
    if (canonical && isUuid(slug)) {
      navigate({ to: "/simulados/$slug/praticar", params: { slug: canonical }, replace: true });
    }
  }, [navigate, sim.data?.simulado.slug, slug]);

  const idxKey = `sim:${id}:idx`;
  const respKey = `sim:${id}:resp`;
  const [idx, setIdx] = useState<number>(() => loadPersisted(idxKey, 0));
  const [view, setView] = useState<View>("enunciado");
  const [respostas, setRespostas] = useState<Record<number, EstadoResposta>>(
    () => loadPersisted(respKey, {}),
  );

  // Quando os dados chegam, mescla respostas já salvas no servidor (caso o
  // usuário tenha respondido em outro dispositivo) com o estado local.
  const respostasSalvasRaw = sim.data?.respostasSalvas;
  const respostasSalvasKey = useMemo(
    () => (respostasSalvasRaw ? Object.keys(respostasSalvasRaw).sort().join(",") : ""),
    [respostasSalvasRaw],
  );
  useEffect(() => {
    if (!respostasSalvasRaw) return;
    setRespostas((prev) => {
      const next = { ...prev };
      for (const [n, a] of Object.entries(respostasSalvasRaw)) {
        const num = Number(n);
        if (!next[num]) next[num] = { alt: a as Alt, respondida: true };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [respostasSalvasKey]);

  useEffect(() => {
    try { sessionStorage.setItem(idxKey, JSON.stringify(idx)); } catch {}
  }, [idx, idxKey]);
  useEffect(() => {
    try { sessionStorage.setItem(respKey, JSON.stringify(respostas)); } catch {}
  }, [respostas, respKey]);

  const questoes = sim.data?.questoes ?? [];
  const atual = questoes[idx];
  const tentativaId = sim.data?.tentativaId;

  const salvarMut = useMutation({
    mutationFn: ({ numero, alt }: { numero: number; alt: Alt }) =>
      salvarFn({ data: { tentativaId: tentativaId!, numero, alternativa: alt } }),
    retry: 2,
    onError: () => toast.error("Não foi possível salvar sua resposta. Tente de novo."),
  });

  const finalMut = useMutation({
    mutationFn: () => finalFn({ data: { tentativaId: tentativaId! } }),
    onSuccess: () => {
      try { sessionStorage.removeItem(idxKey); sessionStorage.removeItem(respKey); } catch {}
      navigate({ to: "/simulados/$slug/resultado/$tentativaId", params: { slug: sim.data?.simulado.slug ?? slug, tentativaId: tentativaId! } });
    },
  });

  function selecionar(alt: Alt) {
    if (!atual) return;
    const r = respostas[atual.numero];
    if (r?.respondida) return;
    setRespostas((prev) => ({ ...prev, [atual.numero]: { alt, respondida: false } }));
  }

  function responder() {
    if (!atual || !tentativaId) return;
    const r = respostas[atual.numero];
    if (!r || r.respondida) return;
    setRespostas((prev) => ({ ...prev, [atual.numero]: { ...r, respondida: true } }));
    // fire-and-forget — não bloqueia a UI
    salvarMut.mutate({ numero: atual.numero, alt: r.alt });
  }

  function irPara(novoIdx: number) {
    setIdx(novoIdx);
    setView("enunciado");
  }

  // Só mostra "Carregando" no primeiro load quando NÃO há nada em cache.
  if (!sim.data && sim.isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando simulado…
      </div>
    );
  }
  if (!sim.data || !atual) {
    return <div className="p-6 text-center text-muted-foreground">Simulado indisponível.</div>;
  }

  const totalQ = questoes.length;
  const respondidasN = Object.values(respostas).filter((r) => r.respondida).length;
  const estado = respostas[atual.numero];
  const respondida = !!estado?.respondida;
  const correta = atual.resposta_correta as Alt | undefined;
  const qStatus = (atual as { status?: string }).status ?? "ok";
  const ehAnulada = qStatus === "anulada";
  const ehFalhou = qStatus === "falhou_extracao";
  const especial = ehAnulada || ehFalhou;
  const ehUltima = idx === totalQ - 1;
  const numero = sim.data.simulado.prova_numero;
  const ano = sim.data.simulado.ano;

  return (
    <div className="px-4 md:px-8 py-5 pb-28 max-w-3xl mx-auto">
      <header className="mb-4">
        <p className="text-xs text-muted-foreground">
          {numero}º Exame da Ordem · Simulado{ano ? ` · ${ano}` : ""}
        </p>
        <div className="flex items-baseline justify-between mt-1">
          <h1 className="font-display text-2xl">
            Questão {atual.numero} <span className="text-muted-foreground text-base">de {totalQ}</span>
          </h1>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {respondidasN}/{totalQ}
          </span>
        </div>

        {/* Barra de progresso */}
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out"
            style={{ width: `${totalQ ? (respondidasN / totalQ) * 100 : 0}%` }}
          />
        </div>

        {atual.materia && (
          <p className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] bg-primary text-primary-foreground font-semibold shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
            {atual.materia}
          </p>
        )}
      </header>

      {/* Toggle Enunciado / Alternativas */}
      <div className="relative grid grid-cols-2 p-1 bg-muted rounded-full mb-4">
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-card shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: view === "enunciado" ? "translateX(0.25rem)" : "translateX(calc(100% + 0.25rem))" }}
        />
        <button
          onClick={() => setView("enunciado")}
          className={cn(
            "relative z-10 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-medium transition-colors duration-300",
            view === "enunciado" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <FileText className="h-4 w-4" /> Enunciado
        </button>
        <button
          onClick={() => setView("alternativas")}
          className={cn(
            "relative z-10 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-medium transition-colors duration-300",
            view === "alternativas" ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <ListChecks className="h-4 w-4" /> Alternativas
        </button>
      </div>


      <article className="rounded-xl border border-border bg-card p-5 min-h-[40vh] overflow-hidden">
        <div key={view} className="animate-fade-in">
          {view === "enunciado" ? (
            <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{atual.enunciado}</p>
          ) : (
            <ul className="space-y-2">
              {(["A", "B", "C", "D"] as const).map((letra) => {
                const texto = (atual.alternativas as Record<string, string>)[letra];
                const selecionada = estado?.alt === letra;
                const ehCorreta = respondida && correta === letra;
                const ehErrada = respondida && selecionada && correta !== letra;
                return (
                  <li key={letra}>
                    <button
                      onClick={() => selecionar(letra)}
                      disabled={respondida}
                      className={cn(
                        "w-full text-left flex gap-3 p-3 rounded-lg border transition-colors",
                        ehCorreta && "border-green-500 bg-green-500/10",
                        ehErrada && "border-destructive bg-destructive/10",
                        !respondida && selecionada && "border-primary bg-primary/10",
                        !respondida && !selecionada && "border-border hover:bg-accent",
                        respondida && !ehCorreta && !ehErrada && "border-border opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "h-7 w-7 shrink-0 rounded-full grid place-items-center text-sm font-semibold",
                          ehCorreta && "bg-green-500 text-white",
                          ehErrada && "bg-destructive text-destructive-foreground",
                          !respondida && selecionada && "bg-primary text-primary-foreground",
                          !respondida && !selecionada && "bg-muted text-foreground",
                          respondida && !ehCorreta && !ehErrada && "bg-muted text-foreground",
                        )}
                      >
                        {ehCorreta ? <Check className="h-4 w-4" /> : ehErrada ? <X className="h-4 w-4" /> : letra}
                      </span>
                      <span className="text-sm leading-relaxed">{texto}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>


        {respondida && view === "alternativas" && (
          <div
            className={cn(
              "mt-4 rounded-lg p-3 text-sm font-medium",
              estado?.alt === correta
                ? "bg-green-500/10 text-green-600"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {estado?.alt === correta
              ? "Resposta correta!"
              : `Resposta incorreta. Gabarito: ${correta}.`}
          </div>
        )}
      </article>

      {/* Rodapé fixo: Voltar · Responder · Próximo */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border md:left-64">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => irPara(Math.max(0, idx - 1))}
            disabled={idx === 0}
            aria-label="Voltar"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          {!respondida ? (
            <Button
              className="flex-1"
              disabled={view === "alternativas" && !estado?.alt}
              onClick={() => {
                if (view === "enunciado" && !estado?.alt) {
                  setView("alternativas");
                } else {
                  if (view === "enunciado") setView("alternativas");
                  responder();
                }
              }}
            >
              {estado?.alt ? "Responder" : "Ver alternativas"}
            </Button>
          ) : ehUltima ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="flex-1 bg-gradient-gold text-gold-foreground"
                  disabled={finalMut.isPending}
                >
                  {finalMut.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Finalizando…</>
                  ) : (
                    <><Flag className="h-4 w-4 mr-1" /> Finalizar simulado</>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Finalizar este simulado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você respondeu {respondidasN} de {totalQ} questões. Após finalizar
                    não será possível alterar suas respostas. Quer continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => finalMut.mutate()}>
                    Sim, finalizar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button className="flex-1" onClick={() => irPara(idx + 1)}>
              Próxima questão <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={() => irPara(Math.min(totalQ - 1, idx + 1))}
            disabled={ehUltima}
            aria-label="Próxima"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </nav>
    </div>
  );
}
