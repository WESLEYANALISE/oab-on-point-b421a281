import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getFilaRevisao,
  revisarCard,
  criarFlashcard,
  gerarFlashcardsDeTexto,
  type FlashcardRow,
} from "@/lib/flashcards.functions";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — OAB na Risca" },
      {
        name: "description",
        content: "Flashcards com repetição espaçada (FSRS) para memorizar artigos, súmulas e conceitos da OAB.",
      },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;

  const fetchFila = useServerFn(getFilaRevisao);
  const revisar = useServerFn(revisarCard);
  const criar = useServerFn(criarFlashcard);
  const gerar = useServerFn(gerarFlashcardsDeTexto);

  const { data, isLoading } = useQuery({
    queryKey: ["flashcards-fila"],
    queryFn: () => fetchFila({ data: { limite: 50 }, headers }),
    enabled: !!headers,
  });

  const cards: FlashcardRow[] = data?.cards ?? [];
  const contadores = data?.contadores ?? { novos: 0, aprendendo: 0, revisao: 0, total: 0 };

  const [idx, setIdx] = useState(0);
  const [mostrarVerso, setMostrarVerso] = useState(false);

  useEffect(() => {
    setIdx(0);
    setMostrarVerso(false);
  }, [data?.cards?.length]);

  const cardAtual = cards[idx];

  const revisarMut = useMutation({
    mutationFn: (rating: number) =>
      revisar({ data: { cardId: cardAtual!.id, rating }, headers }),
    onSuccess: () => {
      if (idx + 1 >= cards.length) {
        qc.invalidateQueries({ queryKey: ["flashcards-fila"] });
      } else {
        setIdx((i) => i + 1);
        setMostrarVerso(false);
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  // Atalhos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!cardAtual) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!mostrarVerso) setMostrarVerso(true);
        return;
      }
      if (!mostrarVerso) return;
      if (e.key === "1") revisarMut.mutate(1);
      if (e.key === "2") revisarMut.mutate(2);
      if (e.key === "3") revisarMut.mutate(3);
      if (e.key === "4") revisarMut.mutate(4);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardAtual, mostrarVerso, revisarMut]);

  const restantes = useMemo(() => Math.max(0, cards.length - idx), [cards.length, idx]);

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display">Flashcards</h1>
          <p className="text-muted-foreground mt-1">
            Repetição espaçada (FSRS) — revise quando o cérebro está prestes a esquecer.
          </p>
        </div>
        <div className="flex gap-2">
          <DialogNovo onCreate={async (frente, verso, materia) => {
            await criar({ data: { frente, verso, materia: materia || null }, headers });
            qc.invalidateQueries({ queryKey: ["flashcards-fila"] });
            toast.success("Card criado");
          }} />
          <DialogGerar onGenerate={async (texto, materia, qtd) => {
            const r = await gerar({ data: { texto, materia, quantidade: qtd, fonte_tipo: "manual" }, headers });
            qc.invalidateQueries({ queryKey: ["flashcards-fila"] });
            toast.success(`${r.criados} cards gerados`);
          }} />
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Novos" value={contadores.novos} color="text-blue-400" />
        <Stat label="Aprendendo" value={contadores.aprendendo} color="text-amber-400" />
        <Stat label="Revisão hoje" value={contadores.revisao} color="text-emerald-400" />
        <Stat label="Total" value={contadores.total} color="text-muted-foreground" />
      </div>

      {isLoading ? (
        <Card className="p-12 grid place-items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </Card>
      ) : !cardAtual ? (
        <Card className="p-12 text-center space-y-2">
          <h2 className="text-2xl font-display">Tudo em dia! 🎉</h2>
          <p className="text-muted-foreground">
            Nenhum card pendente agora. Crie novos cards ou volte mais tarde quando os existentes vencerem.
          </p>
        </Card>
      ) : (
        <Card className="p-6 md:p-10 space-y-6 min-h-[320px] flex flex-col">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{cardAtual.materia ?? "Sem matéria"}</span>
            <span>{restantes} restantes nesta sessão</span>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-6">
            <div className="text-xl md:text-2xl whitespace-pre-wrap">{cardAtual.frente}</div>
            {mostrarVerso && (
              <>
                <hr className="w-24 border-border" />
                <div className="text-base md:text-lg text-muted-foreground whitespace-pre-wrap max-w-2xl">
                  {cardAtual.verso}
                </div>
              </>
            )}
          </div>

          {!mostrarVerso ? (
            <Button size="lg" onClick={() => setMostrarVerso(true)} className="w-full md:w-auto md:self-center">
              Mostrar resposta (Espaço)
            </Button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <Button variant="destructive" disabled={revisarMut.isPending} onClick={() => revisarMut.mutate(1)}>
                Errei <kbd className="ml-2 opacity-60">1</kbd>
              </Button>
              <Button variant="secondary" disabled={revisarMut.isPending} onClick={() => revisarMut.mutate(2)}>
                Difícil <kbd className="ml-2 opacity-60">2</kbd>
              </Button>
              <Button disabled={revisarMut.isPending} onClick={() => revisarMut.mutate(3)}>
                Bom <kbd className="ml-2 opacity-60">3</kbd>
              </Button>
              <Button variant="outline" disabled={revisarMut.isPending} onClick={() => revisarMut.mutate(4)}>
                Fácil <kbd className="ml-2 opacity-60">4</kbd>
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-3xl font-display mt-1 ${color}`}>{value}</div>
    </Card>
  );
}

function DialogNovo({ onCreate }: { onCreate: (f: string, v: string, m: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [frente, setFrente] = useState("");
  const [verso, setVerso] = useState("");
  const [materia, setMateria] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Novo</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo flashcard</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Frente (pergunta)</Label>
            <Textarea value={frente} onChange={(e) => setFrente(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Verso (resposta)</Label>
            <Textarea value={verso} onChange={(e) => setVerso(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Matéria (opcional)</Label>
            <Input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ex.: Direito Civil" />
          </div>
          <Button
            className="w-full"
            disabled={!frente.trim() || !verso.trim() || loading}
            onClick={async () => {
              setLoading(true);
              try {
                await onCreate(frente, verso, materia);
                setFrente(""); setVerso(""); setMateria(""); setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogGerar({ onGenerate }: { onGenerate: (t: string, m: string | undefined, q: number) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState("");
  const [materia, setMateria] = useState("");
  const [qtd, setQtd] = useState(8);
  const [loading, setLoading] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Sparkles className="h-4 w-4 mr-2" />Gerar com IA</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Gerar flashcards com IA</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Cole um trecho de resumo, artigo ou anotação</Label>
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={8} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Matéria (opcional)</Label>
              <Input value={materia} onChange={(e) => setMateria(e.target.value)} placeholder="Ex.: Constitucional" />
            </div>
            <div>
              <Label>Quantos cards</Label>
              <Input type="number" min={3} max={20} value={qtd} onChange={(e) => setQtd(parseInt(e.target.value) || 8)} />
            </div>
          </div>
          <Button
            className="w-full"
            disabled={texto.trim().length < 50 || loading}
            onClick={async () => {
              setLoading(true);
              try {
                await onGenerate(texto, materia || undefined, qtd);
                setTexto(""); setMateria(""); setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Erro");
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Gerar ${qtd} cards`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
