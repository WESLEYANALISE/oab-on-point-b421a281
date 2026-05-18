// Lista curada dos 10 estatutos mais cobrados, na ordem de relevância.
// Os slugs correspondem à coluna `slug` da tabela `vade_mecum_leis`.
import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Scale,
  PersonStanding,
  Accessibility,
  Users,
  ShieldOff,
  Building2,
  Sparkles,
  Trophy,
  Feather,
} from "lucide-react";

export type EstatutoMeta = {
  slug: string;
  rotulo: string;
  sigla: string;
  nomeCompleto: string;
  decreto: string;
  cor: string;
  bg: string;
  barra: string;
  planaltoUrl: string;
  Icon: LucideIcon;
};

export const ESTATUTOS_DESTAQUE: EstatutoMeta[] = [
  {
    slug: "eca",
    rotulo: "ECA",
    sigla: "ECA",
    nomeCompleto: "Estatuto da Criança e do Adolescente",
    decreto: "Lei nº 8.069/1990",
    cor: "text-orange-300",
    bg: "bg-gradient-to-br from-orange-400 to-amber-500",
    barra: "bg-orange-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/leis/l8069.htm",
    Icon: Baby,
  },
  {
    slug: "estatuto-oab",
    rotulo: "OAB",
    sigla: "OAB",
    nomeCompleto: "Estatuto da Advocacia e da OAB",
    decreto: "Lei nº 8.906/1994",
    cor: "text-red-300",
    bg: "bg-gradient-to-br from-rose-500 to-red-600",
    barra: "bg-red-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/leis/l8906.htm",
    Icon: Scale,
  },
  {
    slug: "estatuto-do-idoso",
    rotulo: "Idoso",
    sigla: "Idoso",
    nomeCompleto: "Estatuto do Idoso",
    decreto: "Lei nº 10.741/2003",
    cor: "text-blue-300",
    bg: "bg-gradient-to-br from-sky-500 to-blue-600",
    barra: "bg-sky-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.741.htm",
    Icon: PersonStanding,
  },
  {
    slug: "est-pessoa-c-deficiencia",
    rotulo: "PCD",
    sigla: "PCD",
    nomeCompleto: "Estatuto da Pessoa com Deficiência",
    decreto: "Lei nº 13.146/2015",
    cor: "text-violet-300",
    bg: "bg-gradient-to-br from-violet-500 to-purple-600",
    barra: "bg-violet-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13146.htm",
    Icon: Accessibility,
  },
  {
    slug: "est-igualdade-racial",
    rotulo: "Igualdade Racial",
    sigla: "Igualdade",
    nomeCompleto: "Estatuto da Igualdade Racial",
    decreto: "Lei nº 12.288/2010",
    cor: "text-emerald-300",
    bg: "bg-gradient-to-br from-emerald-500 to-green-600",
    barra: "bg-emerald-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12288.htm",
    Icon: Users,
  },
  {
    slug: "est-desarmamento",
    rotulo: "Desarmamento",
    sigla: "Desarmamento",
    nomeCompleto: "Estatuto do Desarmamento",
    decreto: "Lei nº 10.826/2003",
    cor: "text-zinc-300",
    bg: "bg-gradient-to-br from-zinc-500 to-slate-700",
    barra: "bg-zinc-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.826.htm",
    Icon: ShieldOff,
  },
  {
    slug: "estatuto-da-cidade",
    rotulo: "Cidade",
    sigla: "Cidade",
    nomeCompleto: "Estatuto da Cidade",
    decreto: "Lei nº 10.257/2001",
    cor: "text-teal-300",
    bg: "bg-gradient-to-br from-teal-500 to-cyan-600",
    barra: "bg-teal-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/leis/leis_2001/l10257.htm",
    Icon: Building2,
  },
  {
    slug: "est-juventude",
    rotulo: "Juventude",
    sigla: "Juventude",
    nomeCompleto: "Estatuto da Juventude",
    decreto: "Lei nº 12.852/2013",
    cor: "text-pink-300",
    bg: "bg-gradient-to-br from-pink-500 to-fuchsia-600",
    barra: "bg-pink-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/lei/l12852.htm",
    Icon: Sparkles,
  },
  {
    slug: "estatuto-do-torcedor",
    rotulo: "Torcedor",
    sigla: "Torcedor",
    nomeCompleto: "Estatuto de Defesa do Torcedor",
    decreto: "Lei nº 10.671/2003",
    cor: "text-yellow-300",
    bg: "bg-gradient-to-br from-yellow-500 to-amber-600",
    barra: "bg-yellow-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.671.htm",
    Icon: Trophy,
  },
  {
    slug: "est-indio",
    rotulo: "Índio",
    sigla: "Índio",
    nomeCompleto: "Estatuto do Índio",
    decreto: "Lei nº 6.001/1973",
    cor: "text-lime-300",
    bg: "bg-gradient-to-br from-lime-500 to-green-700",
    barra: "bg-lime-500",
    planaltoUrl: "https://www.planalto.gov.br/ccivil_03/leis/l6001.htm",
    Icon: Feather,
  },
];

export const ESTATUTOS_SLUGS = ESTATUTOS_DESTAQUE.map((e) => e.slug);

export function getEstatuto(slug: string): EstatutoMeta | undefined {
  return ESTATUTOS_DESTAQUE.find((e) => e.slug === slug);
}
