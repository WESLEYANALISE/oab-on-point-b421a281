import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Loader2,
  FileText,
  Download,
  ExternalLink,
  PlayCircle,
  RotateCcw,
  BarChart3,
  History,
  ScrollText,
  CheckCircle2,
  Clock,
  XCircle,
  Trophy,
  AlertTriangle,
} from "lucide-react";
import {
  getSimuladoOverview,
  getSimuladoCompleto,
  listMinhasTentativas,
  getEditalResumo,
} from "@/lib/simulados.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { isUuid } from "@/lib/simulado-slug";

export const Route = createFileRoute("/_app/simulados/$slug/")({
  head: () => ({ meta: [{ title: "Simulado — OAB na Risca" }] }),
  component: OverviewPage,
});

type Aba = "materiais" | "edital" | "raiox" | "desempenho";

function OverviewPage() {
  const { slug } = Route.useParams();
  const id = slug;
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(getSimuladoOverview);
  const completoFn = useServerFn(getSimuladoCompleto);
  const historicoFn = useServerFn(listMinhasTentativas);
  const card = queryClient.getQueryData<{
    prova_numero: number;
    titulo: string;
    total_questoes: number;
    ano: number | null;
  }>(["simulado-card", slug]);

  const [aba, setAba] = useState<Aba>("materiais");

  const overview = useQuery({
    queryKey: ["simulado-overview", id],
    queryFn: () => overviewFn({ data: { id } }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled: !!user,
  });

  useEffect(() => {
    const canonical = overview.data?.simulado.slug;
    if (canonical && isUuid(slug)) {
      navigate({ to: "/simulados/$slug", params: { slug: canonical }, replace: true });
    }
  }, [navigate, overview.data?.simulado.slug, slug]);
  // Histórico só carrega quando a aba "Desempenho" é aberta
  const historico = useQuery({
    queryKey: ["simulado-historico", id],
    queryFn: () => historicoFn({ data: { simuladoId: id } }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !!user && aba === "desempenho",
  });

  // Ao clicar em "Começar/Continuar", buscamos TUDO em uma chamada e
  // seedamos o cache da prática para a próxima tela abrir instantânea.
  const iniciarMut = useMutation({
    mutationFn: () => completoFn({ data: { id } }),
    onSuccess: (data) => {
      queryClient.setQueryData(["simulado-completo", id], data);
      queryClient.setQueryData(["simulado-completo", data.simulado.slug], data);
      navigate({ to: "/simulados/$slug/praticar", params: { slug: data.simulado.slug } });
    },
  });

  // Pré-aquece o cache no hover/foco para a navegação ser imediata.
  function prefetchPratica() {
    queryClient.prefetchQuery({
      queryKey: ["simulado-completo", id],
      queryFn: () => completoFn({ data: { id } }),
      staleTime: 5 * 60_000,
    });
  }

  if (overview.isError) {
    return <div className="p-6 text-center text-muted-foreground">Não foi possível abrir este simulado agora.</div>;
  }

  if (!overview.data) {
    return (
      <div className="px-4 md:px-8 py-5 pb-28 max-w-3xl mx-auto animate-fade-in">
        <header className="mb-5">
          <p className="text-xs text-muted-foreground">
            Exame da Ordem{card?.ano ? ` · ${card.ano}` : ""}
          </p>
          <h1 className="font-display text-3xl md:text-4xl mt-1">
            {card ? `${card.prova_numero}º Exame da Ordem` : "Simulado OAB"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simulado{card ? ` · ${card.total_questoes} questões` : ""}
          </p>
        </header>
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-xl mb-5 text-xs">
          {["Materiais", "Edital", "Raio-X", "Desempenho"].map((label, index) => (
            <div key={label} className={cn("h-14 rounded-lg bg-card/70", index === 0 && "shadow-sm")} />
          ))}
        </div>
        <div className="grid gap-3">
          <div className="h-20 rounded-xl border border-border bg-card/70" />
          <div className="h-20 rounded-xl border border-border bg-card/50" />
          <div className="h-20 rounded-xl border border-border bg-card/40" />
        </div>
      </div>
    );
  }

  const { simulado, prova, raioX, total, tentativaEmAndamento } = overview.data;
  const tem = tentativaEmAndamento !== null;

  return (
    <div className="px-4 md:px-8 py-5 pb-28 max-w-3xl mx-auto">
      {/* Header */}
      <header className="mb-5">
        <p className="text-xs text-muted-foreground">
          Exame da Ordem{simulado.ano ? ` · ${simulado.ano}` : ""}
        </p>
        <h1 className="font-display text-3xl md:text-4xl mt-1">
          {simulado.prova_numero}º Exame da Ordem
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulado · {total} questões
        </p>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-xl mb-5 text-xs">
        {([
          { id: "materiais", label: "Materiais", Icon: FileText },
          { id: "edital", label: "Edital", Icon: ScrollText },
          { id: "raiox", label: "Raio-X", Icon: BarChart3 },
          { id: "desempenho", label: "Desempenho", Icon: History },
        ] as const).map(({ id: a, label, Icon }) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={cn(
              "flex flex-col items-center gap-1 py-2 rounded-lg font-medium transition-colors",
              aba === a
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <section key={aba} className="animate-fade-in">
        {aba === "materiais" && <Materiais prova={prova} />}
        {aba === "edital" && <Edital provaNumero={simulado.prova_numero} editalUrl={prova?.edital_url ?? null} />}
        {aba === "raiox" && <RaioX raioX={raioX} total={total} />}
        {aba === "desempenho" && (
          <Desempenho
            isLoading={historico.isLoading}
            tentativas={historico.data ?? []}
            simuladoId={id}
          />
        )}
      </section>

      {/* Rodapé fixo: Começar/Continuar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border md:left-64">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button
            className="flex-1 bg-gradient-gold text-gold-foreground"
            disabled={iniciarMut.isPending}
            onMouseEnter={prefetchPratica}
            onTouchStart={prefetchPratica}
            onFocus={prefetchPratica}
            onClick={() => iniciarMut.mutate()}
          >
            {iniciarMut.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Abrindo…</>
            ) : tem ? (
              <><RotateCcw className="h-4 w-4 mr-2" /> Continuar simulado</>
            ) : (
              <><PlayCircle className="h-4 w-4 mr-2" /> Começar simulado</>
            )}
          </Button>
        </div>
      </nav>
    </div>
  );
}

// ============ Materiais ============
function Materiais({
  prova,
}: {
  prova: {
    prova_1fase_url: string | null;
    gabarito_1fase_url: string | null;
    edital_url: string | null;
    oab_source_url: string | null;
  } | null;
}) {
  const items = [
    { url: prova?.prova_1fase_url, title: "Prova oficial (PDF)", desc: "Caderno aplicado pela FGV", Icon: FileText },
    { url: prova?.gabarito_1fase_url, title: "Gabarito oficial (PDF)", desc: "Respostas divulgadas", Icon: CheckCircle2 },
    { url: prova?.edital_url, title: "Edital (PDF)", desc: "Documento normativo do exame", Icon: ScrollText },
    { url: prova?.oab_source_url, title: "Página oficial OAB", desc: "Fonte na FGV/OAB", Icon: ExternalLink },
  ].filter((i) => !!i.url);

  if (items.length === 0) {
    return <Vazio mensagem="Nenhum material oficial cadastrado para esta prova." />;
  }
  return (
    <ul className="grid gap-3">
      {items.map(({ url, title, desc, Icon }) => (
        <li key={url}>
          <a
            href={url!}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center">
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{title}</p>
              <p className="text-xs text-muted-foreground truncate">{desc}</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        </li>
      ))}
    </ul>
  );
}

// ============ Edital estruturado ============
function Edital({ provaNumero, editalUrl }: { provaNumero: number; editalUrl: string | null }) {
  const fn = useServerFn(getEditalResumo);
  const q = useQuery({
    queryKey: ["edital-resumo", provaNumero],
    queryFn: async () => {
      // Timeout de UI de 35s — se o LLM travar, devolve null e mostra fallback.
      const result = await Promise.race([
        fn({ data: { provaNumero } }),
        new Promise<{ conteudo: null; fonte: string }>((resolve) =>
          setTimeout(() => resolve({ conteudo: null, fonte: "timeout" }), 35_000),
        ),
      ]);
      return result as { conteudo: typeof result extends { conteudo: infer C } ? C : null; fonte: string };
    },
    staleTime: Infinity,
    enabled: !!editalUrl,
    retry: 1,
  });
  const [secaoAtiva, setSecaoAtiva] = useState(0);

  if (!editalUrl) return <Vazio mensagem="Edital ainda não disponível." />;
  if (q.isLoading || q.isFetching) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground mb-2" />
        <p className="text-sm font-medium">Estruturando o edital…</p>
        <p className="text-xs text-muted-foreground mt-1">
          Pode levar alguns segundos. Depois fica salvo.
        </p>
      </div>
    );
  }
  const conteudo = q.data?.conteudo;
  if (!conteudo) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">Não foi possível estruturar o edital agora.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {q.data?.fonte === "timeout"
                ? "O serviço demorou demais para responder. Tente novamente em alguns segundos."
                : "Você ainda pode abrir o PDF oficial."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => q.refetch()} disabled={q.isFetching}>
                <RotateCcw className="h-4 w-4 mr-1.5" /> Tentar novamente
              </Button>
              <a
                href={editalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline px-2"
              >
                <ExternalLink className="h-4 w-4" /> Abrir edital oficial
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Resumo</p>
        <p className="text-sm leading-relaxed">{conteudo.resumo}</p>
        <a
          href={editalUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Fonte oficial
        </a>
      </div>

      {/* Cronograma + Taxas + Requisitos */}
      <div className="grid gap-3 md:grid-cols-2">
        {conteudo.cronograma?.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Cronograma</p>
            <ul className="space-y-1.5 text-sm">
              {conteudo.cronograma.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-muted-foreground shrink-0 w-24">{e.data}</span>
                  <span>{e.titulo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {conteudo.taxas?.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Taxas</p>
            <ul className="space-y-1.5 text-sm">
              {conteudo.taxas.map((t, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{t.descricao}</span>
                  <span className="font-medium tabular-nums">{t.valor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {conteudo.requisitos?.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Requisitos</p>
          <ul className="space-y-1 text-sm list-disc pl-5">
            {conteudo.requisitos.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}

      {/* Seções (sumário navegável) */}
      {conteudo.secoes?.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex gap-1 p-1 bg-muted/50 overflow-x-auto">
            {conteudo.secoes.map((s, i) => (
              <button
                key={i}
                onClick={() => setSecaoAtiva(i)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  secaoAtiva === i
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.titulo}
              </button>
            ))}
          </div>
          <div className="p-4">
            <h3 className="font-display text-lg mb-2">{conteudo.secoes[secaoAtiva]?.titulo}</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {conteudo.secoes[secaoAtiva]?.conteudo}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Raio-X ============
function RaioX({ raioX, total }: { raioX: Array<{ materia: string; qtd: number; pct: number }>; total: number }) {
  if (raioX.length === 0) return <Vazio mensagem="Sem questões cadastradas ainda." />;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
        <p className="font-display text-3xl mt-1">{total} <span className="text-base text-muted-foreground">questões</span></p>
      </div>
      <ul className="rounded-xl border border-border bg-card divide-y divide-border">
        {raioX.map((m) => (
          <li key={m.materia} className="p-3">
            <div className="flex items-baseline justify-between text-sm mb-1.5">
              <span className="font-medium">{m.materia}</span>
              <span className="text-muted-foreground tabular-nums">{m.qtd} · {m.pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70"
                style={{ width: `${m.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============ Desempenho ============
type Tentativa = {
  id: string;
  iniciado_em: string;
  concluido_em: string | null;
  acertos: number;
  total: number;
  por_materia: Record<string, { acertos: number; total: number }>;
  status: "finalizado" | "em-andamento" | "abandonado";
};

function Desempenho({
  isLoading,
  tentativas,
  simuladoId,
}: {
  isLoading: boolean;
  tentativas: Tentativa[];
  simuladoId: string;
}) {
  if (isLoading) {
    return (
      <div className="py-10 text-center text-muted-foreground text-sm">
        <Loader2 className="h-5 w-5 inline-block animate-spin mr-2" /> Carregando histórico…
      </div>
    );
  }
  if (tentativas.length === 0) {
    return <Vazio mensagem="Você ainda não fez este simulado. Comece pela primeira vez!" />;
  }

  // Resumo agregado: melhor matéria, pior matéria, média
  const finalizadas = tentativas.filter((t) => t.status === "finalizado");
  const mediaPct =
    finalizadas.length > 0
      ? Math.round(
          (finalizadas.reduce((s, t) => s + (t.total ? t.acertos / t.total : 0), 0) /
            finalizadas.length) *
            100,
        )
      : null;

  const agreg: Record<string, { acertos: number; total: number }> = {};
  for (const t of finalizadas) {
    for (const [m, v] of Object.entries(t.por_materia)) {
      agreg[m] ??= { acertos: 0, total: 0 };
      agreg[m].acertos += v.acertos;
      agreg[m].total += v.total;
    }
  }
  const pctList = Object.entries(agreg).map(([m, v]) => ({
    materia: m,
    pct: v.total ? Math.round((v.acertos / v.total) * 100) : 0,
  }));
  const melhor = pctList.sort((a, b) => b.pct - a.pct)[0];
  const pior = pctList[pctList.length - 1];

  return (
    <div className="space-y-4">
      {finalizadas.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Média" value={mediaPct !== null ? `${mediaPct}%` : "—"} Icon={Trophy} />
          <Stat label="Melhor" value={melhor?.materia ?? "—"} sub={melhor ? `${melhor.pct}%` : ""} />
          <Stat label="Reforçar" value={pior?.materia ?? "—"} sub={pior ? `${pior.pct}%` : ""} />
        </div>
      )}

      <ul className="space-y-2">
        {tentativas.map((t) => {
          const pct = t.total ? Math.round((t.acertos / t.total) * 100) : 0;
          const data = new Date(t.iniciado_em).toLocaleDateString("pt-BR", {
            day: "2-digit", month: "short", year: "numeric",
          });
          const StatusBadge = {
            finalizado: { Icon: CheckCircle2, label: "Finalizado", cls: "bg-green-500/15 text-green-600" },
            "em-andamento": { Icon: Clock, label: "Em andamento", cls: "bg-amber-500/15 text-amber-600" },
            abandonado: { Icon: XCircle, label: "Abandonado", cls: "bg-muted text-muted-foreground" },
          }[t.status];

          const content = (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", StatusBadge.cls)}>
                    <StatusBadge.Icon className="h-3 w-3" /> {StatusBadge.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{data}</span>
                </div>
                {t.status === "finalizado" ? (
                  <p className="font-display text-lg mt-1">
                    {t.acertos}/{t.total}
                    <span className="text-muted-foreground text-sm ml-2">({pct}%)</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Respostas salvas no progresso.</p>
                )}
              </div>
            </div>
          );

          return (
            <li key={t.id}>
              {t.status === "finalizado" ? (
                <Link to="/simulados/$slug/resultado/$tentativaId" params={{ slug: simuladoId, tentativaId: t.id }}>
                  {content}
                </Link>
              ) : t.status === "em-andamento" ? (
                <Link to="/simulados/$slug/praticar" params={{ slug: simuladoId }}>
                  {content}
                </Link>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value, sub, Icon }: { label: string; value: string; sub?: string; Icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <p className="font-display text-base mt-1 truncate" title={value}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground tabular-nums">{sub}</p>}
    </div>
  );
}

function Vazio({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
      {mensagem}
    </div>
  );
}
