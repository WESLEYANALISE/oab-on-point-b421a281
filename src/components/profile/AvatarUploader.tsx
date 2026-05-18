import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function initialsOf(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function AvatarUploader({ size = 56 }: { size?: number }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Use PNG, JPG ou WEBP."); return;
    }
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter até 2MB."); return; }

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", user.id);
    setUploading(false);
    if (updErr) { toast.error(updErr.message); return; }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Foto atualizada!");
  }

  const dim = { width: size, height: size };

  return (
    <button
      type="button"
      onClick={() => fileRef.current?.click()}
      className="relative shrink-0 rounded-full bg-gold/15 border border-gold/40 grid place-items-center overflow-hidden group"
      style={dim}
      aria-label="Trocar foto de perfil"
    >
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" width={96} height={96} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span className="font-display font-semibold text-gold text-base">
          {initialsOf(profile?.display_name || "")}
        </span>
      )}
      <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 grid place-items-center transition-opacity">
        {uploading ? <Loader2 className="h-4 w-4 text-white animate-spin" /> : <Camera className="h-4 w-4 text-white" />}
      </span>
      {uploading && !profile?.avatar_url && (
        <span className="absolute inset-0 bg-black/45 grid place-items-center">
          <Loader2 className="h-4 w-4 text-white animate-spin" />
        </span>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
    </button>
  );
}
