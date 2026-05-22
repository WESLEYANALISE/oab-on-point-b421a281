import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, AlertCircle, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getAtoConteudo, type AtoSecao } from "@/lib/resenha-sync.functions";
import brasao from "@/assets/brasao-republica.png";

export const Route = createFileRoute("/_app/atualizacoes-leis/$atoId")({
  head: () => ({ meta: [{ title: "Ato — Atualizações de Leis" }] }),
  component: AtoPage,
});

function AtoPage() {
  const { atoId } = Route.useParams();
  const fn = useServerFn(getAtoConteudo);
  const q = useQuery({
    queryKey: ["ato-conteudo", atoId],
    queryFn: () => fn({ data: { id: atoId } }),
    staleTime: 5 * 60_000,
  });

  const [openArtigo, setOpenArtigo] = useState<Extract<AtoSecao, { kind: "artigo" }> | null>(null);

  if (q.isLoading) {
    return (
      <div className="px-4 py-16 flex flex-col items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mb-3" />
        <p className="text-sm">Carregando ato…</p>
      </div>
    );
  }

  if (q.error || !q.data) {
    return (
      <div className="px-4 py-10 max-w-2xl mx-auto">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {q.error instanceof Error ? q.error.message : "Não foi possível carregar este ato."}
        </div>
      </div>
    );
  }

  const { ato, estruturado, erroConteudo } = q.data;

  if (erroConteudo || !estruturado) {
    return (
      <div className="px-4 py-10 max-w-2xl mx-auto">
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm text-yellow-200">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Não conseguimos carregar o texto do ato dentro do app.</span>
          </div>
          <a
            href={ato.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gold font-semibold hover:underline"
          >
            Abrir no Planalto <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  const { titulo, ementa, secoes, assinaturas } = estruturado;
  const artigos = secoes.filter((s): s is Extract<AtoSecao, { kind: "artigo" }> => s.kind === "artigo");
  const preambulo = secoes.find((s): s is Extract<AtoSecao, { kind: "preambulo" }> => s.kind === "preambulo");

  return (
    <article className="px-4 md:px-8 py-5 max-w-3xl mx-auto pb-24">
      {/* Cabeçalho oficial */}
      <header className="flex flex-col items-center text-center pb-6 border-b border-border/60">
        <img
          src={brasao}
          alt="Brasão da República"
          width={88}
          height={88}
          className="h-20 w-20 object-contain drop-shadow-[0_0_22px_color-mix(in_oklab,var(--gold)_30%,transparent)]"
        />
        <h2 className="font-display font-semibold text-lg md:text-xl mt-3 leading-tight">
          Presidência da República
        </h2>
        <p className="text-sm text-foreground/90 leading-snug">Casa Civil</p>
        <p className="text-xs text-muted-foreground leading-snug">
          Secretaria Especial para Assuntos Jurídicos
        </p>

        {(() => {
          const fallback = (() => {
            if (!ato.tipo && !ato.numero) return null;
            const meses = ["JANEIRO","FEVEREIRO","MARÇO","ABRIL","MAIO","JUNHO","JULHO","AGOSTO","SETEMBRO","OUTUBRO","NOVEMBRO","DEZEMBRO"];
            let data = "";
            if (ato.data_assinatura) {
              const [y, m, d] = ato.data_assinatura.split("-").map(Number);
              if (y && m && d) data = `, DE ${d} DE ${meses[m - 1]} DE ${y}`;
            }
            return `${(ato.tipo || "").toUpperCase()}${ato.numero ? ` Nº ${ato.numero}` : ""}${data}`.trim();
          })();
          const display = titulo || fallback;
          return display ? (
            <h1 className="font-display text-base md:text-lg font-bold uppercase tracking-wide text-gold mt-5 px-2 max-w-full break-words">
              {display}
            </h1>
          ) : null;
        })()}

        <div className="mt-3 w-20 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
      </header>

      {/* Link fonte — acima da ementa */}
      <div className="mt-6 flex justify-center">
        <a
          href={ato.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold rounded-full px-3.5 py-2 bg-yellow-400/10 border border-yellow-400/30 hover:bg-yellow-400/15 transition-colors"
        >
          Ver no Planalto <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Legenda: qual lei é alterada */}
      {(() => {
        const alvo = detectarLeiAlvo(ementa);
        if (!alvo) return null;
        return (
          <div className="mt-5 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold">
              <span className="opacity-70">Altera:</span>
              <span>{alvo.nome}</span>
              <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] text-gold">
                {alvo.sigla}
              </span>
            </span>
          </div>
        );
      })()}

      {/* Ementa em vermelho */}
      {ementa && (
        <p className="text-sm md:text-base leading-relaxed text-red-400 italic mt-6 text-justify">
          {ementa}
        </p>
      )}

      {/* Preâmbulo */}
      {preambulo && (
        <p className="text-sm md:text-base leading-relaxed mt-5 text-justify">
          {preambulo.text}
        </p>
      )}

      {/* Lista de artigos — estilo Vade Mecum */}
      {artigos.length > 0 && (
        <section className="mt-7">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Artigos
          </p>
          <ul className="space-y-2">
            {artigos.map((art, i) => {
              const previa = (art.titulo || art.itens[0]?.text || "").replace(/^Art\.?\s*\d+[ºoOª°.\-A-Z]*\s*[.\-–—:]?\s*/i, "");
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenArtigo(art)}
                    className="w-full flex items-center gap-3 text-left p-3 rounded-xl border border-border/60 bg-card/50 hover:bg-card/80 hover:border-gold/40 transition-colors"
                  >
                    <span className="font-display font-semibold text-gold shrink-0 min-w-[3.5rem]">
                      {art.numero}
                    </span>
                    <span className="text-sm text-foreground/90 line-clamp-2 flex-1">
                      {previa || "—"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Assinaturas centralizadas */}
      {assinaturas.length > 0 && (
        <footer className="mt-10 pt-6 border-t border-border/60 flex flex-col items-center text-center gap-1.5">
          {assinaturas.map((s, i) => {
            // Corrige ordinais: "205o" / "138O" -> "205º"
            const texto = s.text.replace(/(\d+)[oO°](?=\b|\s|\.|,|;)/g, "$1º");
            // Presidente: linha em CAIXA ALTA e não-itálica vira vermelha
            const isPresidente = !s.italic && texto === texto.toUpperCase() && /[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}/.test(texto);
            return (
              <p
                key={i}
                className={`text-sm leading-snug ${
                  isPresidente
                    ? "text-red-400 font-semibold tracking-wide"
                    : s.italic
                    ? "italic text-muted-foreground"
                    : "text-foreground/90"
                }`}
              >
                {texto}
              </p>
            );
          })}
        </footer>
      )}

      {/* Anexos — tabelas com scroll horizontal */}
      {estruturado.anexos && estruturado.anexos.length > 0 && (
        <section className="mt-10 space-y-8">
          {estruturado.anexos.map((anexo, i) => (
            <div key={i} className="space-y-3">
              <div className="text-center">
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-gold">
                  {anexo.titulo}
                </h3>
                {anexo.subtitulo && (
                  <p className="text-xs md:text-sm text-foreground/80 mt-1 leading-snug">
                    {anexo.subtitulo}
                  </p>
                )}
              </div>
              {anexo.tabelas.map((tab, ti) => {
                const [head, ...body] = tab.rows;
                return (
                  <div
                    key={ti}
                    className="rounded-xl border border-border/60 bg-card/40 overflow-x-auto overscroll-x-contain scrollbar-gold"
                    style={{ WebkitOverflowScrolling: "touch" }}
                  >
                    <table className="w-full min-w-[420px] text-xs md:text-sm border-collapse">
                      {head && (
                        <thead>
                          <tr className="bg-gold/10">
                            {head.map((c, ci) => (
                              <th
                                key={ci}
                                className="text-left font-semibold text-gold uppercase tracking-wide px-3 py-2 border-b border-gold/30 whitespace-nowrap"
                              >
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {body.map((row, ri) => {
                          const isTotal = /^total/i.test((row[0] ?? "").trim());
                          return (
                            <tr
                              key={ri}
                              className={`border-b border-border/40 last:border-b-0 ${
                                isTotal ? "bg-muted/40 font-semibold text-foreground" : "text-foreground/90"
                              }`}
                            >
                              {row.map((c, ci) => (
                                <td
                                  key={ci}
                                  className="px-3 py-2 align-top leading-snug"
                                >
                                  {c}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      )}




      {/* Sheet/overlay do artigo — sobe de baixo */}
      <AnimatePresence>
        {openArtigo && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpenArtigo(null)}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] bg-background rounded-t-3xl border-t border-border shadow-2xl flex flex-col"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border/60">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                    Artigo
                  </p>
                  <h2 className="font-display text-xl text-gold">{openArtigo.numero}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenArtigo(null)}
                  className="h-9 w-9 rounded-full inline-flex items-center justify-center hover:bg-accent"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-5 space-y-3.5">
                {openArtigo.itens.map((it, i) => (
                  <p
                    key={i}
                    className={`text-[15px] leading-relaxed text-justify ${
                      it.italic ? "italic text-muted-foreground" : "text-foreground/95"
                    }`}
                  >
                    {it.text}
                  </p>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </article>
  );
}
