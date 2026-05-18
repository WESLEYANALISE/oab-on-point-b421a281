import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, ChevronRight, FileText, Newspaper, AudioLines } from "lucide-react";

export const Route = createFileRoute("/_app/admin/")({
  component: AdminHome,
});

function AdminHome() {
  return (
    <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Painel</p>
        <h1 className="font-display text-3xl md:text-4xl">Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">Ferramentas administrativas do OAB na Risca.</p>
      </header>

      <ul className="grid gap-3 md:grid-cols-2">
        <li>
          <Link
            to="/admin/simulados"
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-gradient-gold grid place-items-center text-gold-foreground">
              <Target className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg">Simulados</p>
              <p className="text-xs text-muted-foreground">Gerar simulados a partir das provas OAB</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/admin/resumos"
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-gradient-gold grid place-items-center text-gold-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg">Resumos</p>
              <p className="text-xs text-muted-foreground">Extrair e gerar resumos didáticos dos livros</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/admin/blog"
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-gradient-gold grid place-items-center text-gold-foreground">
              <Newspaper className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg">Blog</p>
              <p className="text-xs text-muted-foreground">Criar, editar e publicar artigos</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
        <li>
          <Link
            to="/admin/narracoes"
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
          >
            <div className="h-12 w-12 rounded-lg bg-gradient-gold grid place-items-center text-gold-foreground">
              <AudioLines className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-lg">Narração</p>
              <p className="text-xs text-muted-foreground">Gerar narração dos artigos do Vade Mecum (Gemini TTS)</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </li>
      </ul>
    </div>
  );
}
