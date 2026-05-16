import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, BookOpen, FileText, Layers, ClipboardList, Target, Sparkles, Newspaper, Award, Scale, Calendar, TrendingUp, Settings, Library, Headphones, User, Crown, ChevronRight, LogOut, HelpCircle, ShieldCheck } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-admin";

const baseGroups = [
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
      { to: "/provas", label: "Provas OAB", icon: FileText },
      { to: "/simulados", label: "Simulados", icon: Target },
    ],
  },
  {
    label: "Mais",
    items: [
      { to: "/blog", label: "Blog", icon: Newspaper },
      { to: "/noticias", label: "Notícias", icon: Newspaper },
      { to: "/assistente", label: "Assistente IA", icon: Sparkles },
      { to: "/reta-final", label: "Calendário do Exame", icon: Calendar },
    ],
  },
] as const;

const accountItems = [
  { to: "/perfil", label: "Ver perfil", sub: "Conta e dados pessoais", icon: User, accent: "bg-gold/15 text-gold" },
  { to: "/planos", label: "Ver planos", sub: "Upgrade e assinatura", icon: Crown, accent: "bg-primary/15 text-primary" },
] as const;

const adminGroup = {
  label: "Admin",
  items: [
    { to: "/admin", label: "Painel admin", icon: ShieldCheck },
    { to: "/admin/simulados", label: "Gerar simulados", icon: Target },
    { to: "/admin/blog", label: "Gerenciar blog", icon: Newspaper },
  ],
} as const;

export function MenuDrawer({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const { data: isAdmin } = useIsAdmin();
  const groups = isAdmin ? [...baseGroups, adminGroup] : baseGroups;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="left"
        className="w-[88vw] max-w-sm p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col"
      >
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

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Conta — topo destacado */}
          <div className="space-y-2">
            {accountItems.map(({ to, label, sub, icon: Icon, accent }) => (
              <Link
                key={to}
                to={to}
                onClick={close}
                className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border hover:bg-sidebar-accent transition-colors"
              >
                <div className={`h-10 w-10 rounded-lg grid place-items-center ${accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-[11px] text-sidebar-foreground/60 truncate">{sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
              </Link>
            ))}
          </div>

          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/50 font-semibold">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map(({ to, label, icon: Icon }) => (
                  <li key={`${g.label}-${label}`}>
                    <Link
                      to={to}
                      onClick={close}
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

          <div className="pt-2 border-t border-sidebar-border space-y-0.5">
            <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors">
              <Settings className="h-4 w-4" /> Ajustes
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent transition-colors">
              <HelpCircle className="h-4 w-4" /> Ajuda e suporte
            </button>
            <button className="flex items-center gap-3 px-3 py-2.5 w-full rounded-md text-sm text-destructive hover:bg-sidebar-accent transition-colors">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

export const MenuTriggerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className="flex flex-col items-center gap-1 py-2 text-[11px] text-foreground hover:text-primary transition-colors w-full"
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
      <span className="font-medium">Menu</span>
    </button>
  );
});
MenuTriggerButton.displayName = "MenuTriggerButton";
