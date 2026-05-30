// Maps backend pipeline sub-steps into the two user-facing stages.
// Etapa 1 = Extração (ocr + analisando)
// Etapa 2 = Geração (gerando + validando)

export type EtapaInfo = {
  numero: 1 | 2;
  label: string;
  sub: string;
};

export function mapEtapa(etapa?: string | null): EtapaInfo {
  switch (etapa) {
    case "ocr":
      return { numero: 1, label: "Extração", sub: "Lendo PDFs (OCR Mistral)…" };
    case "analisando":
      return { numero: 1, label: "Extração", sub: "Detectando total de questões…" };
    case "gerando":
      return { numero: 2, label: "Geração", sub: "Extraindo questões com Gemini…" };
    case "validando":
      return { numero: 2, label: "Geração", sub: "Revalidando questões faltantes…" };
    case "pronto":
      return { numero: 2, label: "Concluído", sub: "Simulado pronto" };
    case "erro":
      return { numero: 1, label: "Erro", sub: "Falha na geração" };
    default:
      return { numero: 1, label: "Aguardando", sub: "Preparando job…" };
  }
}

export type StageStatus = "pendente" | "ativo" | "concluido" | "erro";

export function getStageStatus(
  stage: 1 | 2,
  etapa?: string | null,
): StageStatus {
  if (!etapa) return "pendente";
  if (etapa === "erro") {
    // erro: marca a etapa atual como erro; primeiro estágio assumido
    return stage === 1 ? "erro" : "pendente";
  }
  if (etapa === "pronto") return "concluido";
  const info = mapEtapa(etapa);
  if (info.numero === stage) return "ativo";
  if (info.numero > stage) return "concluido";
  return "pendente";
}
