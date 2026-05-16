import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import {
  adminListBlogPosts,
  adminGetBlogPost,
  adminDeleteBlogPost,
  adminTogglePublicar,
} from "@/lib/blog-admin.functions";
import { PostForm } from "@/components/blog/admin/PostForm";

export const Route = createFileRoute("/_app/admin/blog")({
  head: () => ({ meta: [{ title: "Admin · Blog — OAB na Risca" }] }),
  component: AdminBlog,
});

function AdminBlog() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useQuery({ queryKey: ["admin", "blog"], queryFn: () => adminListBlogPosts() });
  const editing = useQuery({
    queryKey: ["admin", "blog", editingId],
    queryFn: () => adminGetBlogPost({ data: { id: editingId! } }),
    enabled: !!editingId,
  });

  const toggle = useMutation({
    mutationFn: adminTogglePublicar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog"] }),
  });
  const remove = useMutation({
    mutationFn: adminDeleteBlogPost,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "blog"] }),
  });

  if (creating || editingId) {
    return (
      <div className="px-4 md:px-8 py-6 max-w-6xl mx-auto">
        <button
          onClick={() => {
            setCreating(false);
            setEditingId(null);
          }}
          className="text-xs text-muted-foreground mb-4"
        >
          ← Voltar à lista
        </button>
        <h1 className="font-display text-2xl mb-6">
          {editingId ? "Editar post" : "Novo post"}
        </h1>
        {editingId && editing.isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <PostForm
            initial={editingId ? (editing.data as any) : undefined}
            onSaved={() => {
              qc.invalidateQueries({ queryKey: ["admin", "blog"] });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="font-display text-3xl">Blog</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-gold text-gold-foreground text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Novo post
        </button>
      </header>

      {list.isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
      {list.data && (
        <ul className="space-y-2">
          {list.data.map((p: any) => (
            <li
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              {p.capa_url ? (
                <img
                  src={p.capa_url}
                  alt=""
                  className="h-14 w-20 object-cover rounded-md border border-border"
                />
              ) : (
                <div className="h-14 w-20 rounded-md bg-muted" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-display truncate">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {p.categoria} · {p.tempo_leitura_min} min ·{" "}
                  {p.publicado ? (
                    <span className="text-success">Publicado</span>
                  ) : (
                    <span className="text-muted-foreground">Rascunho</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => toggle.mutate({ data: { id: p.id, publicado: !p.publicado } })}
                className="p-2 rounded-md hover:bg-accent"
                title={p.publicado ? "Despublicar" : "Publicar"}
              >
                {p.publicado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setEditingId(p.id)}
                className="p-2 rounded-md hover:bg-accent"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Excluir "${p.titulo}"?`)) remove.mutate({ data: { id: p.id } });
                }}
                className="p-2 rounded-md hover:bg-accent text-destructive"
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
