// Dados extraídos do site oficial do Exame de Ordem (examedeordem.oab.org.br).
// Fontes: https://examedeordem.oab.org.br/  e  https://examedeordem.oab.org.br/EditaisProvas
// Última atualização: maio/2026.

export type EventoCalendario = {
  data: string;           // ISO yyyy-mm-dd ou "previsto" quando estimado
  rotulo: string;         // Texto exibido (ex.: "03 mai 2026")
  titulo: string;
  detalhe?: string;
  status: "concluido" | "atual" | "previsto";
};

export type ExameOAB = {
  numero: number;
  romano: string;          // "46º"
  titulo: string;          // "46º Exame de Ordem Unificado"
  status: "em-andamento" | "encerrado" | "previsto";
  resumo: string;
  eventos: EventoCalendario[];
  linkEdital?: string;
};

export const EXAMES_OAB: ExameOAB[] = [
  {
    numero: 46,
    romano: "46º",
    titulo: "46º Exame de Ordem Unificado",
    status: "em-andamento",
    resumo:
      "Edital publicado pela FGV em fevereiro/2026. 1ª fase aplicada em 3 de maio. Aguardando aplicação da 2ª fase.",
    linkEdital: "https://examedeordem.oab.org.br/EditaisProvas?NumeroExame=46",
    eventos: [
      { data: "2026-04-27", rotulo: "27 abr 2026", titulo: "Divulgação dos locais de prova",
        detalhe: "Candidatos consultaram local da 1ª fase no site da FGV.", status: "concluido" },
      { data: "2026-05-03", rotulo: "03 mai 2026", titulo: "1ª fase — Prova objetiva",
        detalhe: "80 questões de múltipla escolha aplicadas em todo o país.", status: "concluido" },
      { data: "2026-05-03", rotulo: "03 mai 2026", titulo: "Gabarito preliminar da 1ª fase",
        detalhe: "Publicado pela FGV no mesmo dia da aplicação.", status: "concluido" },
      { data: "previsto", rotulo: "Maio/2026", titulo: "Prazo de recursos contra o gabarito preliminar",
        detalhe: "Janela oficial divulgada no edital.", status: "atual" },
      { data: "previsto", rotulo: "Jun/2026", titulo: "Resultado definitivo da 1ª fase",
        status: "previsto" },
      { data: "previsto", rotulo: "Jul/2026", titulo: "2ª fase — Prova prático-profissional",
        detalhe: "Peça processual + 4 questões discursivas na área de opção.", status: "previsto" },
      { data: "previsto", rotulo: "Set/2026", titulo: "Resultado preliminar da 2ª fase", status: "previsto" },
      { data: "previsto", rotulo: "Out/2026", titulo: "Resultado definitivo da 2ª fase", status: "previsto" },
    ],
  },
  {
    numero: 45,
    romano: "45º",
    titulo: "45º Exame de Ordem Unificado",
    status: "encerrado",
    resumo: "Ciclo encerrado em abril de 2026 com a divulgação do resultado definitivo da 2ª fase.",
    linkEdital: "https://examedeordem.oab.org.br/EditaisProvas?NumeroExame=45",
    eventos: [
      { data: "2025-11-23", rotulo: "23 nov 2025", titulo: "1ª fase — Prova objetiva", status: "concluido" },
      { data: "2026-03-01", rotulo: "01 mar 2026", titulo: "2ª fase — Prova prático-profissional", status: "concluido" },
      { data: "2026-04-01", rotulo: "01 abr 2026", titulo: "Resultado definitivo do 45º Exame OAB",
        detalhe: "Encerrado o ciclo recursal da 2ª fase.", status: "concluido" },
    ],
  },
  {
    numero: 44,
    romano: "44º",
    titulo: "44º Exame de Ordem Unificado",
    status: "encerrado",
    resumo: "Aplicado entre o segundo semestre de 2025 e início de 2026.",
    linkEdital: "https://examedeordem.oab.org.br/EditaisProvas?NumeroExame=44",
    eventos: [
      { data: "2025-08-03", rotulo: "03 ago 2025", titulo: "1ª fase — Prova objetiva", status: "concluido" },
      { data: "2025-10-26", rotulo: "26 out 2025", titulo: "2ª fase — Prova prático-profissional", status: "concluido" },
      { data: "2025-12-19", rotulo: "19 dez 2025", titulo: "Resultado definitivo", status: "concluido" },
    ],
  },
  {
    numero: 43,
    romano: "43º",
    titulo: "43º Exame de Ordem Unificado",
    status: "encerrado",
    resumo: "Primeiro exame do ciclo de 2025.",
    linkEdital: "https://examedeordem.oab.org.br/EditaisProvas?NumeroExame=43",
    eventos: [
      { data: "2025-03-30", rotulo: "30 mar 2025", titulo: "1ª fase — Prova objetiva", status: "concluido" },
      { data: "2025-06-22", rotulo: "22 jun 2025", titulo: "2ª fase — Prova prático-profissional", status: "concluido" },
      { data: "2025-08-15", rotulo: "15 ago 2025", titulo: "Resultado definitivo", status: "concluido" },
    ],
  },
];

export const FONTE_OFICIAL = "https://examedeordem.oab.org.br/";
export const FONTE_EDITAIS = "https://examedeordem.oab.org.br/EditaisProvas?NumeroExame=0";
