import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Brain, Loader2, Sparkles, Trash2, Zap, ChevronRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  listarLivrosParaFlashcardsCurados,
  apagarFlashcardsLivro,
} from "@/lib/flashcards-curados.functions";
import { fcQueue, useFCQueue, fcKey, type FCJob } from "@/lib/flashcards-curados-queue";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/admin/flashcards")({
  component: AdminFlashcards,
});

type Livro = {
  id: string;
  titulo: string;
  autor: string | null;
  capa: string | null;
  area: string | null;
  total_capitulos: number | null;
  capitulos_gerados: number | null;
  status: string;
  job: {
    status: string;
    total_capitulos: number;
    capitulos_gerados: number;
    total_cards: number;
    erro_msg: string | null;
  } | null;
};

function AdminFlashcards() {
  const qc = useQueryClient();
  const listFn = useServerFn(listarLivrosParaFlashcardsCurados);
  const delFn = useServerFn(apagarFlashcardsLivro);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-fc-curados"],
    queryFn: () => listFn(),
    refetchInterval: 8_000,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    placeholderData: (prev) => prev,
    refetchOnMount: false,
  });

  const queueState = useFCQueue();
  const naFilaKeys = useMemo(() => {
    const s = new Set<string>();
    for (const i of queueState.fila) s.add(i.key);
    if (queueState.atual) s.add(queueState.atual.key);
    return s;
  }, [queueState]);

  const [areaSelecionada, setAreaSelecionada] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const livros = (data ?? []) as Livro[];

  const areas = useMemo(() => {
    const map = new Map<string, { total: number; comCards: number }>();
    for (const l of livros) {
      const k = l.area ?? "Sem área";
      const cur = map.get(k) ?? { total: 0, comCards: 0 };
      cur.total++;
      if ((l.job?.total_cards ?? 0) > 0) cur.comCards++;
      map.set(k, cur);
    }
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [livros]);

  const livrosDaArea = useMemo(() => {
    if (!areaSelecionada) return [];
    return livros
      .filter((l) => (l.area ?? "Sem área") === areaSelecionada)
      .filter((l) => !busca || l.titulo.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [livros, areaSelecionada, busca]);

  function enfileirarLivros(ls: Livro[]) {
    const jobs: FCJob[] = ls
      .filter((l) => (l.capitulos_gerados ?? 0) > 0)
      .map((l) => ({ key: fcKey(l.id), resumo_livro_id: l.id, titulo: l.titulo }))
      .filter((j) => !naFilaKeys.has(j.key));
    if (jobs.length === 0) {
      toast.info("Nada novo para enfileirar");
      return;
    }
    fcQueue.enqueue(jobs);
    toast.success(`${jobs.length} ${jobs.length === 1 ? "livro" : "livros"} na fila`);
  }

  const excluir = useMutation({
    mutationFn: (id: string) => delFn({ data: { resumo_livro_id: id } }),
    onSuccess: () => {
      toast.success("Flashcards excluídos");
      qc.invalidateQueries({ queryKey: ["admin-fc-curados"] });
    },
  });

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel</p>
        <h1 className="font-display text-2xl md:text-4xl">Flashcards (IA)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gera flashcards intuitivos com explicação e exemplo a partir dos capítulos dos resumos. Eles aparecem na aba "Por tema" dos flashcards.
        </p>
      </header>

      {isLoading && (
        <div className="py-12 text-center text-muted-foreground inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      )}

      {!isLoading && !areaSelecionada && (
        <div>
          <div className="mb-4 p-3 rounded-xl border border-gold/30 bg-gold/5 flex items-start gap-3">
            <Zap className="h-5 w-5 text-gold mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Gerar tudo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enfileira todos os livros que já têm resumo. 5–35 cards por capítulo (proporcional ao texto).
              </p>
              <Button size="sm" className="mt-2" onClick={() => enfileirarLivros(livros)}>
                <Zap className="h-3.5 w-3.5 mr-1.5" /> Iniciar tudo
              </Button>
            </div>
          </div>

          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            Áreas ({areas.length})
          </h2>
          <ul className="grid gap-2">
            {areas.map((a) => (
              <li key={a.nome}>
                <button
                  onClick={() => { setAreaSelecionada(a.nome); setBusca(""); }}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/40 transition text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.total} {a.total === 1 ? "livro" : "livros"} · {a.comCards} com flashcards
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isLoading && areaSelecionada && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={() => setAreaSelecionada(null)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Áreas
            </button>
            <span className="text-xs text-muted-foreground">{livrosDaArea.length} livros</span>
          </div>
          <h2 className="font-display text-xl md:text-2xl mb-3">{areaSelecionada}</h2>

          <div className="flex gap-2 mb-3">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por título…"
              className="flex-1 text-sm px-4 py-2.5 rounded-full border bg-card"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => enfileirarLivros(livrosDaArea)}
              className="rounded-full"
            >
              <Zap className="h-4 w-4 mr-1.5" /> Gerar área
            </Button>
          </div>

          <div className="grid gap-2">
            {livrosDaArea.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhum livro encontrado.</p>
            )}
            {livrosDaArea.map((l) => {
              const job = l.job;
              const k = fcKey(l.id);
              const proc = queueState.atual?.key === k;
              const enfileirado = naFilaKeys.has(k) && !proc;
              return (
                <div key={l.id} className="p-3 rounded-xl border bg-card">
                  <div className="flex items-start gap-3">
                    <div className="h-16 w-12 bg-muted rounded overflow-hidden flex-shrink-0">
                      {l.capa && <img src={l.capa} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">{l.titulo}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                        {!job && (
                          <span className="text-muted-foreground">Sem flashcards ainda</span>
                        )}
                        {job?.status === "gerando" && !proc && (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Loader2 className="h-3 w-3 animate-spin" /> Gerando
                          </span>
                        )}
                        {proc && (
                          <span className="inline-flex items-center gap-1 text-gold">
                            <Loader2 className="h-3 w-3 animate-spin" /> Processando agora
                          </span>
                        )}
                        {job?.status === "concluido" && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> Pronto
                          </span>
                        )}
                        {job?.status === "erro" && (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-3 w-3" /> Erro
                          </span>
                        )}
                        {enfileirado && (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <Clock className="h-3 w-3" /> na fila
                          </span>
                        )}
                        {job && (
                          <span className="text-muted-foreground">
                            {job.capitulos_gerados}/{job.total_capitulos} cap · {job.total_cards} cards
                          </span>
                        )}
                      </div>
                      {job?.erro_msg && (
                        <p className="text-xs text-destructive mt-1 break-words">{job.erro_msg}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => enfileirarLivros([l])}
                      disabled={enfileirado || proc || (l.capitulos_gerados ?? 0) === 0}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      {job?.status === "concluido" ? "Regerar" : "Gerar"}
                    </Button>
                    {job && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Apagar todos os flashcards deste livro?")) excluir.mutate(l.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-border">
        <Link to="/flashcards" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <Brain className="h-3 w-3" /> Ver como os usuários veem
        </Link>
      </div>
    </div>
  );
}
