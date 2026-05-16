import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Receipt,
  ListChecks,
  BookOpen,
  Sparkles,
} from "lucide-react";
import {
  getSimuladoOverview,
  getSimuladoCompleto,
  listMinhasTentativas,
  getEditalResumo,
  reiniciarTentativa,
} from "@/lib/simulados.functions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { isUuid } from "@/lib/simulado-slug";

export const Route = createFileRoute("/_app/simulados/$slug/")({
  head: () => ({ meta: [{ title: "Simulado — OAB na Risca" }] }),
  component: OverviewPage,
});

type Aba = "materiais" | "raiox" | "desempenho";

// Estado overlay (simula "nova tela" dentro da mesma página)
type Overlay =
  | { kind: "none" }
  | { kind: "edital" } // lista de seções
  | { kind: "edital-secao"; secaoId: string }; // detalhe de uma seção

function OverviewPage() {
  const { slug } = Route.useParams();
  const id = slug;
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(getSimuladoOverview);
  const completoFn = useServerFn(getSimuladoCompleto);
  const historicoFn = useServerFn(listMinhasTentativas);
  const reiniciarFn = useServerFn(reiniciarTentativa);
  const card = queryClient.getQueryData<{
    prova_numero: number;
    titulo: string;
    total_questoes: number;
    ano: number | null;
  }>(["simulado-card", slug]);

  const [aba, setAba] = useState<Aba>("materiais");
  const [overlay, setOverlay] = useState<Overlay>({ kind: "none" });
  const [confirmReiniciar, setConfirmReiniciar] = useState(false);

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

  const historico = useQuery({
    queryKey: ["simulado-historico", id],
    queryFn: () => historicoFn({ data: { simuladoId: id } }),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: !!user && aba === "desempenho",
  });

  const iniciarMut = useMutation({
    mutationFn: () => completoFn({ data: { id } }),
    onSuccess: (data) => {
      queryClient.setQueryData(["simulado-completo", id], data);
      queryClient.setQueryData(["simulado-completo", data.simulado.slug], data);
      navigate({ to: "/simulados/$slug/praticar", params: { slug: data.simulado.slug } });
    },
  });

  const reiniciarMut = useMutation({
    mutationFn: () => reiniciarFn({ data: { id } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["simulado-overview", id] });
      queryClient.removeQueries({ queryKey: ["simulado-completo", id] });
      iniciarMut.mutate();
    },
  });

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
      <div className="px-4 md:px-8 py-5 pb-32 max-w-3xl mx-auto">
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
        <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl mb-5 text-xs">
          {["Materiais", "Raio-X", "Desempenho"].map((label, index) => (
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
    <div className="px-4 md:px-8 py-5 pb-32 max-w-3xl mx-auto">
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

      {/* Tabs (3) */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-xl mb-5 text-xs">
        {([
          { id: "materiais", label: "Materiais", Icon: FileText },
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
        {aba === "materiais" && (
          <Materiais
            prova={prova}
            onAbrirEdital={() => setOverlay({ kind: "edital" })}
          />
        )}
        {aba === "raiox" && <RaioX raioX={raioX} total={total} />}
        {aba === "desempenho" && (
          <Desempenho
            isLoading={historico.isLoading}
            tentativas={historico.data ?? []}
            simuladoId={id}
          />
        )}
      </section>

      {/* Rodapé fixo */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur border-t border-border md:left-64">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button
            className="flex-1 bg-gradient-gold text-gold-foreground shadow-md"
            disabled={iniciarMut.isPending || reiniciarMut.isPending}
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
              <><PlayCircle className="h-4 w-4 mr-2" /> Iniciar simulado</>
            )}
          </Button>
          {tem && (
            <Button
              variant="outline"
              disabled={iniciarMut.isPending || reiniciarMut.isPending}
              onClick={() => setConfirmReiniciar(true)}
              title="Apagar progresso e começar do zero"
            >
              {reiniciarMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="h-4 w-4" />
              )}
              <span className="ml-1.5 hidden sm:inline">Do zero</span>
            </Button>
          )}
        </div>
      </nav>

      <AlertDialog open={confirmReiniciar} onOpenChange={setConfirmReiniciar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Iniciar do zero?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua tentativa em andamento será apagada e você começará uma nova do início. Tentativas já finalizadas continuam no seu histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => reiniciarMut.mutate()}>
              Sim, apagar e iniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overlay "nova tela" para o Edital */}
      {overlay.kind !== "none" && (
        <EditalOverlay
          provaNumero={simulado.prova_numero}
          editalUrl={prova?.edital_url ?? null}
          overlay={overlay}
          onChange={setOverlay}
          onClose={() => setOverlay({ kind: "none" })}
        />
      )}
    </div>
  );
}

// ============ Materiais ============
function Materiais({
  prova,
  onAbrirEdital,
}: {
  prova: {
    prova_1fase_url: string | null;
    gabarito_1fase_url: string | null;
    edital_url: string | null;
    oab_source_url: string | null;
  } | null;
  onAbrirEdital: () => void;
}) {
  const items: Array<
    | { type: "internal"; key: string; title: string; desc: string; Icon: typeof FileText; onClick: () => void }
    | { type: "external"; key: string; title: string; desc: string; Icon: typeof FileText; href: string }
  > = [];

  if (prova?.edital_url) {
    items.push({
      type: "internal",
      key: "edital",
      title: "Edital",
      desc: "Cronograma, taxas, requisitos e mais",
      Icon: ScrollText,
      onClick: onAbrirEdital,
    });
  }
  if (prova?.prova_1fase_url) {
    items.push({
      type: "external",
      key: "prova",
      title: "Prova oficial (PDF)",
      desc: "Caderno aplicado pela FGV",
      Icon: FileText,
      href: prova.prova_1fase_url,
    });
  }
  if (prova?.gabarito_1fase_url) {
    items.push({
      type: "external",
      key: "gabarito",
      title: "Gabarito oficial (PDF)",
      desc: "Respostas divulgadas",
      Icon: CheckCircle2,
      href: prova.gabarito_1fase_url,
    });
  }
  if (prova?.oab_source_url) {
    items.push({
      type: "external",
      key: "oab",
      title: "Página oficial OAB",
      desc: "Fonte na FGV/OAB",
      Icon: ExternalLink,
      href: prova.oab_source_url,
    });
  }

  if (items.length === 0) {
    return <Vazio mensagem="Nenhum material oficial cadastrado para esta prova." />;
  }
  return (
    <ul className="grid gap-3">
      {items.map((it) => {
        const inner = (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors w-full text-left">
            <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
              <it.Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{it.title}</p>
              <p className="text-xs text-muted-foreground truncate">{it.desc}</p>
            </div>
            {it.type === "internal" ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Download className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        );
        return (
          <li key={it.key}>
            {it.type === "internal" ? (
              <button onClick={it.onClick} className="w-full">{inner}</button>
            ) : (
              <a href={it.href} target="_blank" rel="noreferrer">{inner}</a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ============ Edital (overlay full-screen) ============
type EditalConteudo = {
  resumo: string;
  cronograma: Array<{ data: string; titulo: string }>;
  taxas: Array<{ descricao: string; valor: string }>;
  requisitos: string[];
  secoes: Array<{ titulo: string; conteudo: string }>;
};
type EditalResult = { conteudo: EditalConteudo | null; fonte: string };

type EditalSecao = {
  id: string;
  titulo: string;
  resumo: string;
  Icon: typeof FileText;
  render: () => React.ReactNode;
};

function EditalOverlay({
  provaNumero,
  editalUrl,
  overlay,
  onChange,
  onClose,
}: {
  provaNumero: number;
  editalUrl: string | null;
  overlay: Overlay;
  onChange: (o: Overlay) => void;
  onClose: () => void;
}) {
  const fn = useServerFn(getEditalResumo);
  const q = useQuery<EditalResult>({
    queryKey: ["edital-resumo", provaNumero],
    queryFn: async () => {
      const timeout = new Promise<EditalResult>((resolve) =>
        setTimeout(() => resolve({ conteudo: null, fonte: "timeout" }), 35_000),
      );
      const real = fn({ data: { provaNumero } }) as unknown as Promise<EditalResult>;
      return await Promise.race([real, timeout]);
    },
    staleTime: Infinity,
    enabled: !!editalUrl,
    retry: 1,
  });

  const secoes: EditalSecao[] = useMemo(() => {
    const c = q.data?.conteudo;
    if (!c) return [];
    const lista: EditalSecao[] = [];
    if (c.resumo) {
      lista.push({
        id: "resumo",
        titulo: "Resumo do edital",
        resumo: "Visão geral em poucas frases",
        Icon: Sparkles,
        render: () => <Prose>{c.resumo}</Prose>,
      });
    }
    if (c.cronograma?.length) {
      lista.push({
        id: "cronograma",
        titulo: "Cronograma",
        resumo: `${c.cronograma.length} datas-chave`,
        Icon: CalendarDays,
        render: () => (
          <ul className="space-y-2">
            {c.cronograma.map((e, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-border bg-card p-3">
                <span className="text-xs font-medium text-primary shrink-0 w-28 pt-0.5">{e.data}</span>
                <span className="text-sm">{e.titulo}</span>
              </li>
            ))}
          </ul>
        ),
      });
    }
    if (c.taxas?.length) {
      lista.push({
        id: "taxas",
        titulo: "Taxas",
        resumo: `${c.taxas.length} valores`,
        Icon: Receipt,
        render: () => (
          <ul className="rounded-xl border border-border bg-card divide-y divide-border">
            {c.taxas.map((t, i) => (
              <li key={i} className="flex justify-between gap-3 p-3 text-sm">
                <span>{t.descricao}</span>
                <span className="font-medium tabular-nums">{t.valor}</span>
              </li>
            ))}
          </ul>
        ),
      });
    }
    if (c.requisitos?.length) {
      lista.push({
        id: "requisitos",
        titulo: "Requisitos",
        resumo: `${c.requisitos.length} itens obrigatórios`,
        Icon: ListChecks,
        render: () => (
          <ul className="space-y-2">
            {c.requisitos.map((r, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ),
      });
    }
    for (const s of c.secoes ?? []) {
      lista.push({
        id: `secao-${slugify(s.titulo)}`,
        titulo: s.titulo,
        resumo: trim(s.conteudo, 80),
        Icon: BookOpen,
        render: () => <Prose>{s.conteudo}</Prose>,
      });
    }
    return lista;
  }, [q.data]);

  const secaoAtual =
    overlay.kind === "edital-secao"
      ? secoes.find((s) => s.id === overlay.secaoId) ?? null
      : null;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto animate-fade-in">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (overlay.kind === "edital-secao") onChange({ kind: "edital" });
              else onClose();
            }}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <p className="text-sm font-medium truncate">
            {secaoAtual ? secaoAtual.titulo : "Edital"}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 pb-16">
        {!editalUrl ? (
          <Vazio mensagem="Edital ainda não disponível." />
        ) : q.isLoading || q.isFetching ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Estruturando o edital…</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pode levar alguns segundos. Depois fica salvo.
            </p>
          </div>
        ) : !q.data?.conteudo ? (
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
        ) : secaoAtual ? (
          <article className="animate-fade-in">
            <h2 className="font-display text-2xl mb-3">{secaoAtual.titulo}</h2>
            {secaoAtual.render()}
            <a
              href={editalUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver no edital oficial
            </a>
          </article>
        ) : (
          <ul className="grid gap-2 animate-fade-in">
            {secoes.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onChange({ kind: "edital-secao", secaoId: s.id })}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
                    <s.Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.titulo}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{s.resumo}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Prose({ children }: { children: string }) {
  // Renderiza preservando parágrafos
  const blocks = children.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((b, i) => (
        <p key={i} className="whitespace-pre-wrap">{b}</p>
      ))}
    </div>
  );
}

function trim(s: string, max: number) {
  const norm = s.replace(/\s+/g, " ").trim();
  return norm.length > max ? norm.slice(0, max - 1) + "…" : norm;
}
function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ============ Raio-X ============
function RaioX({ raioX, total }: { raioX: Array<{ materia: string; qtd: number; pct: number }>; total: number }) {
  if (raioX.length === 0) return <Vazio mensagem="Sem questões cadastradas ainda." />;
  const top = raioX[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
          <p className="font-display text-3xl mt-1">{total}</p>
          <p className="text-xs text-muted-foreground">questões</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mais cobrada</p>
          <p className="font-display text-lg mt-1 truncate" title={top.materia}>{top.materia}</p>
          <p className="text-xs text-muted-foreground">{top.qtd} questões · {top.pct}%</p>
        </div>
      </div>
      <ul className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
        {raioX.map((m, i) => (
          <li key={m.materia} className="p-3">
            <div className="flex items-baseline justify-between text-sm mb-1.5 gap-2">
              <span className="font-medium truncate">
                <span className="text-muted-foreground tabular-nums mr-2">{String(i + 1).padStart(2, "0")}</span>
                {m.materia}
              </span>
              <span className="text-muted-foreground tabular-nums shrink-0">{m.qtd} · {m.pct}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all"
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
  const ordenado = [...pctList].sort((a, b) => b.pct - a.pct);
  const melhor = ordenado[0];
  const pior = ordenado[ordenado.length - 1];

  return (
    <div className="space-y-4">
      {finalizadas.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Média" value={mediaPct !== null ? `${mediaPct}%` : "—"} Icon={Trophy} />
          <Stat label="Melhor" value={melhor?.materia ?? "—"} sub={melhor ? `${melhor.pct}%` : ""} />
          <Stat label="Reforçar" value={pior?.materia ?? "—"} sub={pior ? `${pior.pct}%` : ""} />
        </div>
      )}

      {finalizadas.length > 0 && ordenado.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Por matéria</p>
          <ul className="space-y-2.5">
            {ordenado.map((m) => (
              <li key={m.materia}>
                <div className="flex items-baseline justify-between text-sm mb-1 gap-2">
                  <span className="font-medium truncate">{m.materia}</span>
                  <span
                    className={cn(
                      "text-xs tabular-nums shrink-0 font-semibold",
                      m.pct >= 70 ? "text-green-600" : m.pct >= 50 ? "text-amber-600" : "text-red-600",
                    )}
                  >
                    {m.pct}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      m.pct >= 70 ? "bg-green-500" : m.pct >= 50 ? "bg-amber-500" : "bg-red-500",
                    )}
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 px-1">Histórico</p>
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
                {t.status !== "abandonado" && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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
