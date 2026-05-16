import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { useProfile, greetingFor } from "@/hooks/use-auth";

export function HomeGreeting() {
  const { data: profile } = useProfile();
  const firstName = (profile?.display_name || "").trim().split(/\s+/)[0] || "Estudante";
  const greet = greetingFor();

  return (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-toga text-primary-foreground px-3.5 py-3 md:px-6 md:py-4 flex items-center gap-3 shadow-lg shadow-black/30 border border-gold/15">
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-gold/20 blur-3xl pointer-events-none" />
      <AvatarUploader size={52} />
      <Link to="/perfil" className="relative min-w-0 flex-1 flex items-center gap-2 group">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/85 font-semibold leading-none">
            {greet}
          </p>
          <p className="font-display font-semibold text-[17px] md:text-xl leading-tight tracking-tight truncate mt-1">
            {firstName}
          </p>
          <p className="text-[11px] text-primary-foreground/70 mt-0.5 truncate">Foco no 46º Exame OAB</p>
        </div>
        <ChevronRight className="ml-auto h-4 w-4 text-gold/80 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
