import { BookOpen, FileText, Layers, ClipboardList, Target, Newspaper, Sparkles, Award } from "lucide-react";

export type Atalho = {
  key: string;
  label: string;
  descricao: string;
  to: string;
  icon: typeof BookOpen;
  cor: string;
};

export const ATALHOS: Atalho[] = [
  { key: "aulas", label: "Aulas Interativas", descricao: "Slides + quiz inline", to: "/aulas", icon: BookOpen, cor: "bg-gradient-toga text-primary-foreground" },
  { key: "resumos", label: "Resumos", descricao: "Direto ao ponto", to: "/resumos", icon: FileText, cor: "bg-secondary text-secondary-foreground" },
  { key: "flashcards", label: "Flashcards", descricao: "Memorize com SRS", to: "/flashcards", icon: Layers, cor: "bg-gradient-gold text-gold-foreground" },
  { key: "provas", label: "Provas OAB", descricao: "Edital, prova e gabarito", to: "/provas", icon: FileText, cor: "bg-secondary text-secondary-foreground" },
  { key: "simulados", label: "Simulados", descricao: "80 questões, 5h", to: "/simulados", icon: Target, cor: "bg-gradient-toga text-primary-foreground" },
  { key: "assistente", label: "Assistente IA", descricao: "Tire dúvidas 24/7", to: "/assistente", icon: Sparkles, cor: "bg-foreground text-background" },
  { key: "noticias", label: "Notícias", descricao: "STF, STJ, OAB", to: "/noticias", icon: Newspaper, cor: "bg-muted text-foreground" },
  { key: "reta-final", label: "Reta Final", descricao: "Plano + countdown", to: "/reta-final", icon: Award, cor: "bg-gradient-gold text-gold-foreground" },
];
