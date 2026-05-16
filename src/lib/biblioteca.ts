import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export const areasQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["biblioteca-areas", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_biblioteca_areas" as never, { _slug: slug } as never);
      if (error) throw error;
      return (data ?? []) as string[];
    },
    enabled: !!BIB_MAP[slug]?.hasAreas,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

export const livrosQueryOptions = (slug: string, area: string | null = null, limit = 60, offset = 0) =>
  queryOptions({
    queryKey: ["biblioteca-livros", slug, area, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_biblioteca_books" as never,
        { _slug: slug, _area: area, _limit: limit, _offset: offset } as never,
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
