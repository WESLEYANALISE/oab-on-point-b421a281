import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BibCfg = {
  table: string;
  title: string;
  capaCol: string;
  tituloCol: string;
  autorCol?: string;
  linkCol: string;
  downloadCol: string;
  sobreCol: string;
};

export const BIB_MAP: Record<string, BibCfg> = {
  estudos: { table: "BIBLIOTECA-ESTUDOS", title: "Biblioteca de Estudos", capaCol: "Capa-livro", tituloCol: "Tema", linkCol: "Link", downloadCol: "Download", sobreCol: "Sobre" },
  classicos: { table: "BIBLIOTECA-CLASSICOS", title: "Clássicos do Direito", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
  oratoria: { table: "BIBLIOTECA-ORATORIA", title: "Oratória", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
  lideranca: { table: "BIBLIOTECA-LIDERANÇA", title: "Liderança", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
  politica: { table: "BIBLIOTECA-POLITICA", title: "Política", capaCol: "imagem", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
  "fora-da-toga": { table: "BIBLIOTECA-FORA-DA-TOGA", title: "Fora da Toga", capaCol: "capa-livro", tituloCol: "livro", autorCol: "autor", linkCol: "link", downloadCol: "download", sobreCol: "sobre" },
};

const q = (c: string) => `"${c}"`;

export const livrosQueryOptions = (slug: string) => {
  const cfg = BIB_MAP[slug];
  return queryOptions({
    queryKey: ["biblioteca", slug],
    queryFn: async () => {
      if (!cfg) return [] as Record<string, unknown>[];
      const cols = ["id", cfg.capaCol, cfg.tituloCol, cfg.autorCol, cfg.linkCol, cfg.downloadCol, cfg.sobreCol]
        .filter(Boolean)
        .map((c) => q(c as string))
        .join(",");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from(cfg.table).select(cols).order("id");
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
};
