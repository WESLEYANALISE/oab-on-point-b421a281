import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function ComingSoon({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-4 md:px-10 py-16 md:py-24 max-w-3xl mx-auto text-center">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gradient-gold mb-5">
        <Sparkles className="h-6 w-6 text-gold-foreground" />
      </div>
      <h1 className="font-display text-4xl md:text-5xl leading-tight">{title}</h1>
      <p className="mt-4 text-muted-foreground">{subtitle}</p>
      <p className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">Em construção · próxima fase do roadmap</p>
      <Link to="/inicio" className="inline-block mt-6 text-primary hover:underline text-sm font-medium">Voltar ao início</Link>
    </div>
  );
}

