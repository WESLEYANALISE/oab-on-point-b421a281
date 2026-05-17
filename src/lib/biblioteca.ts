import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FavoritoRow = { slug: string; livro_id: number };

export const favoritosQueryOptions = (slug: string | null) =>
  queryOptions({
    queryKey: ["livros-favoritos", slug],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as FavoritoRow[];
      let q = supabase.from("livros_favoritos").select("slug, livro_id");
      if (slug) q = q.eq("slug", slug);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((r) => ({ slug: r.slug, livro_id: Number(r.livro_id) })) as FavoritoRow[];
    },
    staleTime: 5 * 60_000,
  });

export async function toggleFavorito(slug: string, livroId: number, currentlyFav: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Faça login para favoritar.");
  if (currentlyFav) {
    const { error } = await supabase
      .from("livros_favoritos")
      .delete()
      .eq("user_id", auth.user.id)
      .eq("slug", slug)
      .eq("livro_id", livroId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("livros_favoritos")
      .insert({ user_id: auth.user.id, slug, livro_id: livroId });
    if (error) throw error;
  }
}

export type BibCfg = { title: string; hasAreas: boolean };

export const BIB_MAP: Record<string, BibCfg> = {
  estudos: { title: "Biblioteca de Estudos", hasAreas: true },
  classicos: { title: "Clássicos do Direito", hasAreas: true },
  oratoria: { title: "Oratória", hasAreas: false },
  lideranca: { title: "Liderança", hasAreas: false },
  politica: { title: "Política", hasAreas: true },
  "fora-da-toga": { title: "Fora da Toga", hasAreas: true },
};

export type LivroLista = {
  id: number;
  titulo: string;
  autor: string | null;
  capa: string | null;
  area: string | null;
};

export type LivroDetalhe = LivroLista & {
  sobre: string | null;
  link: string | null;
  download: string | null;
};

export const countsQueryOptions = () =>
  queryOptions({
    queryKey: ["biblioteca-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_biblioteca_counts" as never);
      if (error) throw error;
      return (data ?? {}) as Record<string, number>;
    },
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

export type AreaCount = { area: string; total: number };

export const areasQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["biblioteca-areas-counts", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_biblioteca_areas_counts" as never, { _slug: slug } as never);
      if (error) throw error;
      return ((data ?? []) as Array<{ area: string; total: number | string }>).map((r) => ({
        area: r.area,
        total: Number(r.total),
      })) as AreaCount[];
    },
    enabled: !!BIB_MAP[slug]?.hasAreas,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

export type SortMode = "cronologica" | "alfabetica";

export const livrosQueryOptions = (
  slug: string,
  area: string | null = null,
  limit = 60,
  offset = 0,
  sort: SortMode = "cronologica",
) =>
  queryOptions({
    queryKey: ["biblioteca-livros", slug, area, limit, offset, sort],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_biblioteca_books" as never,
        { _slug: slug, _area: area, _limit: limit, _offset: offset, _sort: sort } as never,
      );
      if (error) throw error;
      return (data ?? []) as LivroLista[];
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });

export const livroQueryOptions = (slug: string, bookId: string | number) =>
  queryOptions({
    queryKey: ["biblioteca-livro", slug, String(bookId)],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_biblioteca_book" as never,
        { _slug: slug, _id: Number(bookId) } as never,
      );
      if (error) throw error;
      const arr = (data ?? []) as LivroDetalhe[];
      return arr[0] ?? null;
    },
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
