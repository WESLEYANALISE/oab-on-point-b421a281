import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, BookOpen, FileText, Layers, ClipboardList, Target, Sparkles, Newspaper, Award, Scale, Calendar, TrendingUp, Settings } from "lucide-react";

const groups = [
  {
    label: "Navegar",
    items: [
      { to: "/", label: "Início", icon: Home },
      { to: "/materias", label: "Matérias", icon: BookOpen },
      { to: "/reta-final", label: "Reta Final", icon: Award },
      { to: "/progresso", label: "Meu Progresso", icon: TrendingUp },
    ],
  },
  {
    label: "Estudar",
    items: [
      { to: "/aulas", label: "Aulas Interativas", icon: BookOpen },
      { to: "/resumos", label: "Resumos", icon: FileText },
      { to: "/flashcards", label: "Flashcards", icon: Layers },
      { to: "/biblioteca", label: "Biblioteca", icon: Library },
      { to: "/audioaulas", label: "Áudio-aulas", icon: Headphones },
    ],
  },
  {
    label: "Praticar",
    items: [
      { to: "/questoes", label: "Questões", icon: ClipboardList },
      { to: "/simulados", label: "Simulados", icon: Target },
    ],
  },
  {
    label: "Mais",
    items: [
      { to: "/noticias", label: "Notícias", icon: Newspaper },
      { to: "/assistente", label: "Assistente IA", icon: Sparkles },
      { to: "/reta-final", label: "Calendário do Exame", icon: Calendar },
    ],
  },
] as const;

export function MenuDrawer({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-[88vw] max-w-sm p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
        <SheetHeader className="px-5 py-5 border-b border-sidebar-border">
          <SheetTitle asChild>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-gradient-gold grid place-items-center">
                <Scale className="h-5 w-5 text-gold-foreground" />
              </div>
              <div className="text-left">
                <p className="font-display text-xl leading-none">OAB na Risca</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60 mt-1">Menu</p>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>
        <nav className="overflow-y-auto h-[calc(100vh-88px)] px-3 py-4 space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50 font-semibold">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map(({ to, label, icon: Icon }) => (
                  <li key={`${g.label}-${label}`}>
                    <Link
                      to={to}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="px-3 pt-2">
            <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent transition-colors">
              <Settings className="h-4 w-4" /> Ajustes
            </button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export function MenuTriggerButton() {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
      <span className="font-medium">Menu</span>
    </button>
  );
}
