// Lista curada dos 10 estatutos mais cobrados, na ordem de relevância.
// Os slugs correspondem à coluna `slug` da tabela `vade_mecum_leis`.
export const ESTATUTOS_DESTAQUE: { slug: string; rotulo: string }[] = [
  { slug: "eca", rotulo: "ECA" },
  { slug: "estatuto-oab", rotulo: "Estatuto da OAB" },
  { slug: "estatuto-do-idoso", rotulo: "Estatuto do Idoso" },
  { slug: "est-pessoa-c-deficiencia", rotulo: "Pessoa com Deficiência" },
  { slug: "est-igualdade-racial", rotulo: "Igualdade Racial" },
  { slug: "est-desarmamento", rotulo: "Desarmamento" },
  { slug: "estatuto-da-cidade", rotulo: "Estatuto da Cidade" },
  { slug: "est-juventude", rotulo: "Juventude" },
  { slug: "estatuto-do-torcedor", rotulo: "Torcedor" },
  { slug: "est-indio", rotulo: "Índio" },
];

export const ESTATUTOS_SLUGS = ESTATUTOS_DESTAQUE.map((e) => e.slug);
