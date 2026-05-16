import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useState } from "react";
import { BIB_MAP, livrosQueryOptions } from "./_app.biblioteca.$slug";

export const Route = createFileRoute("/_app/biblioteca/$slug/$bookId/ler")({
  head: () => ({ meta: [{ title: "Leitor · OAB na Risca" }] }),
  component: BookReader,
});

function BookReader() {
  const { slug, bookId } = Route.useParams();
  const navigate = useNavigate();
  const cfg = BIB_MAP[slug];
  const { data: livros } = useQuery(livrosQueryOptions(slug));
  const [iframeFailed, setIframeFailed] = useState(false);

  const livro = livros?.find((l) => String(l.id) === bookId);
  const titulo = livro && cfg ? ((livro[cfg.tituloCol] as string) ?? "Livro") : "Livro";
  const link = livro && cfg ? (livro[cfg.linkCol] as string | null) : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="bg-background border-b border-border">
        <div className="px-4 py-2 flex items-center gap-2">
          <button
            onClick={() => navigate({ to: "/biblioteca/$slug/$bookId", params: { slug, bookId } })}
            className="p-2 -ml-2 rounded-full hover:bg-muted"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-foreground truncate flex-1">{titulo}</h1>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-muted"
              aria-label="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          )}
        </div>
      </header>

      <div className="flex-1 bg-muted relative">
        {!link && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
            Link de leitura indisponível para este livro.
          </div>
        )}

        {link && !iframeFailed && (
          <iframe
            src={link}
            title={titulo}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            referrerPolicy="no-referrer"
            onError={() => setIframeFailed(true)}
          />
        )}

        {link && iframeFailed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não foi possível exibir o livro dentro do app.
            </p>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4" /> Abrir em nova aba
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
