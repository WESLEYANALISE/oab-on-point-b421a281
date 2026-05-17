import { queryOptions } from "@tanstack/react-query";
import { obterLivroResumo } from "@/lib/resumos.functions";

export const resumoLivroQueryOptions = (livroId: string) =>
  queryOptions({
    queryKey: ["resumo-livro", livroId],
    queryFn: () => obterLivroResumo({ data: { resumo_livro_id: livroId } }),
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
  });
