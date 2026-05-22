import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, MessageCircle, Plus, Send, Sparkles, Trash2, Loader2, Pencil, Check, X, Menu,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  listConversas, criarConversa, excluirConversa, renomearConversa,
  listMensagens, salvarMensagem,
  type ConversaItem, type MensagemItem,
} from "@/lib/assistente.functions";

export const Route = createFileRoute("/_app/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente IA — OAB na Risca" },
      { name: "description", content: "Chat com a Profa. Ana, sua professora de Direito IA. Tire dúvidas da OAB em tempo real." },
    ],
  }),
  component: AssistentePage,
});

type ChatMsg = { role: "user" | "assistant"; content: string };

function AssistentePage() {
  const qc = useQueryClient();
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const conversasQuery = useQuery({
    queryKey: ["assistente", "conversas"],
    queryFn: () => listConversas(),
    staleTime: 30_000,
  });

  const mensagensQuery = useQuery({
    queryKey: ["assistente", "mensagens", conversaId],
    queryFn: () => listMensagens({ data: { conversaId: conversaId! } }),
    enabled: !!conversaId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (mensagensQuery.data) {
      setMensagens(
        mensagensQuery.data.map((m: MensagemItem) => ({ role: m.role, content: m.content })),
      );
    } else if (!conversaId) {
      setMensagens([]);
    }
  }, [mensagensQuery.data, conversaId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [mensagens.length]);

  const criarMut = useMutation({
    mutationFn: () => criarConversa({ data: {} }),
    onSuccess: (nova) => {
      qc.invalidateQueries({ queryKey: ["assistente", "conversas"] });
      setConversaId(nova.id);
      setMensagens([]);
      setSidebarOpen(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    },
  });

  const excluirMut = useMutation({
    mutationFn: (id: string) => excluirConversa({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["assistente", "conversas"] });
      if (conversaId === id) {
        setConversaId(null);
        setMensagens([]);
      }
    },
  });

  const renomearMut = useMutation({
    mutationFn: (vars: { id: string; titulo: string }) =>
      renomearConversa({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assistente", "conversas"] });
      setEditId(null);
    },
  });

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || streaming) return;

    let convId = conversaId;
    let isNovaConversa = false;
    if (!convId) {
      try {
        const nova = await criarConversa({ data: {} });
        convId = nova.id;
        setConversaId(nova.id);
        isNovaConversa = true;
        qc.invalidateQueries({ queryKey: ["assistente", "conversas"] });
      } catch (e: any) {
        toast.error(e?.message ?? "Erro ao criar conversa");
        return;
      }
    }

    const novas: ChatMsg[] = [...mensagens, { role: "user", content: texto }];
    const idxAssistente = novas.length;
    setMensagens([...novas, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    // título automático = primeiras palavras da pergunta
    const novoTitulo = isNovaConversa
      ? texto.slice(0, 60).replace(/\s+/g, " ").trim() || "Nova conversa"
      : undefined;

    // salva pergunta no banco (best effort)
    salvarMensagem({
      data: { conversaId: convId, role: "user", content: texto, novoTitulo },
    }).catch(() => {});

    try {
      const resp = await fetch("/api/assistente-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: novas }),
      });
      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => "");
        throw new Error(t || `Erro ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        acumulado += chunk;
        setMensagens((prev) => {
          const copy = prev.slice();
          if (copy[idxAssistente]?.role === "assistant") {
            copy[idxAssistente] = { role: "assistant", content: acumulado };
          }
          return copy;
        });
      }
      if (acumulado.trim()) {
        salvarMensagem({
          data: { conversaId: convId, role: "assistant", content: acumulado },
        }).catch(() => {});
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao consultar IA");
      setMensagens((prev) => {
        const copy = prev.slice();
        if (copy[idxAssistente]?.role === "assistant" && !copy[idxAssistente].content) {
          copy.splice(idxAssistente, 1);
        }
        return copy;
      });
    } finally {
      setStreaming(false);
      qc.invalidateQueries({ queryKey: ["assistente", "conversas"] });
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const sugestoes = useMemo(
    () => [
      "Me explique a diferença entre prescrição e decadência.",
      "Quais são os princípios do processo penal mais cobrados na OAB?",
      "Resuma os requisitos do contrato de compra e venda.",
      "Como estruturar uma peça de habeas corpus na 2ª fase?",
    ],
    [],
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-background text-foreground">
      {/* ===== Sidebar de conversas (desktop sempre; mobile drawer) ===== */}
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static inset-y-0 left-0 z-20 w-72 border-r border-border bg-card flex flex-col transition-transform`}
      >
        <div className="p-3 border-b border-border flex items-center gap-2">
          <Link
            to="/inicio"
            className="p-2 -ml-1 rounded-lg hover:bg-muted"
            aria-label="Voltar ao início"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-gold/15 border border-gold/30 grid place-items-center shrink-0">
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="font-display font-semibold text-sm leading-tight truncate">Profa. Ana</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">Assistente IA · OAB</p>
            </div>
          </div>
        </div>
        <div className="p-3">
          <button
            onClick={() => criarMut.mutate()}
            disabled={criarMut.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gold text-gold-foreground font-semibold text-sm shadow-sm hover:brightness-105 active:scale-[.98] transition disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> Nova conversa
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {conversasQuery.isLoading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Carregando…</p>
          ) : (conversasQuery.data ?? []).length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Nenhuma conversa ainda. Comece perguntando algo!
            </p>
          ) : (
            (conversasQuery.data ?? []).map((c: ConversaItem) => {
              const ativa = c.id === conversaId;
              const editing = editId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm cursor-pointer ${ativa ? "bg-gold/15 text-foreground" : "hover:bg-muted text-foreground/85"}`}
                  onClick={() => {
                    if (editing) return;
                    setConversaId(c.id);
                    setSidebarOpen(false);
                  }}
                >
                  <MessageCircle className="h-3.5 w-3.5 text-gold shrink-0" />
                  {editing ? (
                    <>
                      <input
                        autoFocus
                        value={editTitulo}
                        onChange={(e) => setEditTitulo(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 min-w-0 bg-background border border-border rounded px-1.5 py-0.5 text-xs"
                      />
                      <button
                        className="p-1 rounded hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editTitulo.trim())
                            renomearMut.mutate({ id: c.id, titulo: editTitulo.trim() });
                        }}
                      >
                        <Check className="h-3.5 w-3.5 text-gold" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditId(null);
                        }}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 truncate">{c.titulo}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background/60 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditId(c.id);
                          setEditTitulo(c.titulo);
                        }}
                        aria-label="Renomear"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background/60 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Excluir esta conversa?")) excluirMut.mutate(c.id);
                        }}
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* backdrop mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-10 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ===== Área central do chat ===== */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 border-b border-border flex items-center gap-2 px-3 md:px-4">
          <button
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir conversas"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-semibold text-sm truncate flex-1">
            {conversasQuery.data?.find((c) => c.id === conversaId)?.titulo ?? "Assistente IA"}
          </h1>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-10">
            {mensagens.length === 0 ? (
              <div className="text-center py-10 md:py-16">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gold/15 border border-gold/30 grid place-items-center mb-5">
                  <Sparkles className="h-7 w-7 text-gold" />
                </div>
                <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-2">
                  Oi! Sou a Profa. Ana 👋
                </h2>
                <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                  Pode me perguntar qualquer dúvida sobre o Exame da Ordem — 1ª fase, 2ª fase, técnicas de estudo, jurisprudência…
                </p>
                <div className="mt-8 grid sm:grid-cols-2 gap-2.5 max-w-2xl mx-auto">
                  {sugestoes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="text-left text-sm p-3 rounded-xl border border-border bg-card hover:border-gold/40 hover:bg-gold/5 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {mensagens.map((m, i) => (
                  <MensagemBubble
                    key={i}
                    role={m.role}
                    content={m.content}
                    streaming={streaming && i === mensagens.length - 1 && m.role === "assistant"}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Composer ===== */}
        <div className="border-t border-border bg-background">
          <div className="mx-auto max-w-3xl px-4 md:px-6 py-3 md:py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
              className="relative flex items-end gap-2 rounded-2xl border border-border bg-card focus-within:border-gold/40 transition"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                rows={1}
                placeholder="Pergunte qualquer coisa sobre a OAB…"
                className="flex-1 resize-none bg-transparent px-4 py-3 text-sm md:text-[15px] focus:outline-none min-h-[48px] max-h-40"
                disabled={streaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="m-1.5 h-9 w-9 rounded-xl bg-gold text-gold-foreground grid place-items-center shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-105 active:scale-95 transition"
                aria-label="Enviar"
              >
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              A Profa. Ana pode cometer erros. Confira sempre artigos e súmulas citados.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function MensagemBubble({
  role, content, streaming,
}: { role: "user" | "assistant"; content: string; streaming?: boolean }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gold/15 border border-gold/25 px-4 py-2.5 text-sm md:text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-lg bg-gold/15 border border-gold/30 grid place-items-center shrink-0">
        <Sparkles className="h-4 w-4 text-gold" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-[11px] uppercase tracking-wider text-gold font-semibold mb-1">Profa. Ana</p>
        <div className="markdown-body text-sm md:text-[15px] leading-relaxed">
          {content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: "120ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-gold animate-bounce" style={{ animationDelay: "240ms" }} />
            </div>
          )}
          {streaming && content && (
            <span className="inline-block w-1.5 h-4 align-middle bg-gold/70 ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
