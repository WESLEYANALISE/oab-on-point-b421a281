export type Noticia = {
  id: string;
  titulo: string;
  resumo: string;
  categoria: "OAB" | "STF" | "STJ" | "Legislação" | "Carreira" | "Exame";
  data: string;
  leitura: string;
  fonte: string;
  destaque?: boolean;
};

export const NOTICIAS: Noticia[] = [
  { id: "n1", titulo: "OAB divulga edital do 42º Exame de Ordem Unificado", resumo: "Inscrições abertas com novidades no conteúdo programático de Direito Digital e atualização da Lei 14.811/24 sobre crimes contra menores.", categoria: "Exame", data: "2026-05-12", leitura: "3 min", fonte: "Conselho Federal da OAB", destaque: true },
  { id: "n2", titulo: "STF declara constitucional teto de honorários sucumbenciais em causas contra a Fazenda", resumo: "Decisão impacta milhares de processos em andamento e fixa nova tese para o art. 85 do CPC.", categoria: "STF", data: "2026-05-10", leitura: "5 min", fonte: "STF Notícias", destaque: true },
  { id: "n3", titulo: "Reforma Tributária: o que cai na 2ª fase de Tributário da OAB", resumo: "Especialistas analisam pontos da EC 132/23 que devem aparecer no próximo exame.", categoria: "Exame", data: "2026-05-08", leitura: "7 min", fonte: "Migalhas" },
  { id: "n4", titulo: "STJ fixa tese sobre prazo prescricional em ações de improbidade", resumo: "Tese vinculante muda jurisprudência consolidada desde 2018.", categoria: "STJ", data: "2026-05-05", leitura: "4 min", fonte: "STJ Notícias" },
  { id: "n5", titulo: "Nova Lei de Licitações: principais mudanças cobradas no Exame de Ordem", resumo: "Lei 14.133/21 já é aplicada de forma integral nas questões de Direito Administrativo.", categoria: "Legislação", data: "2026-05-02", leitura: "6 min", fonte: "JOTA" },
  { id: "n6", titulo: "Como organizar a reta final de estudos para a 1ª fase da OAB", resumo: "Plano semanal, revisão por flashcards e simulados — guia completo da nossa Professora.", categoria: "Carreira", data: "2026-04-28", leitura: "8 min", fonte: "OAB na Risca" },
  { id: "n7", titulo: "FGV libera padrão de respostas da 2ª fase do 41º Exame", resumo: "Confira o gabarito oficial e veja os pontos que mais derrubaram candidatos.", categoria: "OAB", data: "2026-04-22", leitura: "5 min", fonte: "FGV Projetos" },
  { id: "n8", titulo: "Súmula 700 do STJ: o que muda no Processo Civil", resumo: "A nova súmula altera o entendimento sobre intervenção de terceiros nos JECs.", categoria: "STJ", data: "2026-04-18", leitura: "4 min", fonte: "STJ Notícias" },
];

export function getNoticias() { return NOTICIAS; }
export function getNoticia(id: string) { return NOTICIAS.find((n) => n.id === id); }
