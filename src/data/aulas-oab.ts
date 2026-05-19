// Mapa estático: matéria → módulos → subtemas.
// Cada subtema referencia um capítulo de resumo já existente em
// `resumo_capitulos` (resumoLivroId + capituloOrdem). Quando o vínculo
// não estiver disponível, deixamos `null` e a tela mostra "Conteúdo em
// preparação" mas a trilha continua funcionando (a IA gera tudo).

import { MATERIAS_OAB_46 } from "@/data/oab-materias-46";

export type Nivel = "iniciante" | "intermediario" | "avancado";

export type AulaSubtema = {
  slug: string;          // único globalmente: <materiaId>-<moduloSlug>-<n>
  titulo: string;
  /** UUID do resumo_livros já gerado no banco (opcional). */
  resumoLivroId?: string;
  /** Ordem do capítulo dentro do livro (opcional). */
  capituloOrdem?: number;
  /** Eixos do edital que o subtema cobre (para gerar IA contextualizada). */
  topicos?: string[];
};

export type AulaModulo = {
  slug: string;
  titulo: string;
  nivel: Nivel;
  resumos: number;       // estimativa exibida no card
  horas: number;         // estimativa de horas
  subtemas: AulaSubtema[];
};

export type AulaMateria = {
  materiaId: string;     // bate com `MATERIAS_OAB_46[i].id`
  nome: string;
  emoji: string;
  cor: string;           // gradient tailwind
  descricao: string;
  modulos: AulaModulo[];
};

// ----------------- Catálogo -----------------

const ADMINISTRATIVO: AulaMateria = {
  materiaId: "administrativo",
  nome: "Direito Administrativo",
  emoji: "🏛️",
  cor: "from-violet-500 to-indigo-600",
  descricao: "Do iniciante ao avançado. Siga a ordem e domine a área.",
  modulos: [
    {
      slug: "principios",
      titulo: "Princípios do Direito Administrativo",
      nivel: "iniciante",
      resumos: 20, horas: 5,
      subtemas: [
        { slug: "adm-principios-01", titulo: "Definição, Utilidades e Panorama", resumoLivroId: "9da30c30-3051-48ea-9688-b5e07e0b64b4", capituloOrdem: 1, topicos: ["Conceito de Administração Pública", "Função administrativa"] },
        { slug: "adm-principios-02", titulo: "Princípio da Legalidade", resumoLivroId: "dbf4d666-514f-4c6a-9ca3-ba2bf13c5bd8", capituloOrdem: 1, topicos: ["Reserva legal", "Legalidade x legitimidade"] },
        { slug: "adm-principios-03", titulo: "Princípio da Impessoalidade", resumoLivroId: "dbf4d666-514f-4c6a-9ca3-ba2bf13c5bd8", capituloOrdem: 2, topicos: ["Impessoalidade na publicidade oficial"] },
        { slug: "adm-principios-04", titulo: "Princípio da Moralidade", resumoLivroId: "dbf4d666-514f-4c6a-9ca3-ba2bf13c5bd8", capituloOrdem: 3, topicos: ["Probidade administrativa"] },
        { slug: "adm-principios-05", titulo: "Princípio da Publicidade", resumoLivroId: "dbf4d666-514f-4c6a-9ca3-ba2bf13c5bd8", capituloOrdem: 4, topicos: ["Transparência", "Sigilo excepcional"] },
        { slug: "adm-principios-06", titulo: "Princípio da Eficiência", resumoLivroId: "dbf4d666-514f-4c6a-9ca3-ba2bf13c5bd8", capituloOrdem: 5, topicos: ["EC 19/98", "Resultado x meio"] },
      ],
    },
    {
      slug: "agentes-publicos",
      titulo: "Agentes Públicos",
      nivel: "iniciante",
      resumos: 22, horas: 5,
      subtemas: [
        { slug: "adm-agentes-01", titulo: "Conceito e espécies", resumoLivroId: "c04999f1-f465-4d64-9410-ca5eb262125c", capituloOrdem: 1 },
        { slug: "adm-agentes-02", titulo: "Regime jurídico único", resumoLivroId: "c04999f1-f465-4d64-9410-ca5eb262125c", capituloOrdem: 2 },
        { slug: "adm-agentes-03", titulo: "Servidores estatutários", resumoLivroId: "c04999f1-f465-4d64-9410-ca5eb262125c", capituloOrdem: 4 },
        { slug: "adm-agentes-04", titulo: "Cargos em comissão", resumoLivroId: "c04999f1-f465-4d64-9410-ca5eb262125c", capituloOrdem: 5 },
        { slug: "adm-agentes-05", titulo: "Empregados públicos", resumoLivroId: "c04999f1-f465-4d64-9410-ca5eb262125c", capituloOrdem: 6 },
        { slug: "adm-agentes-06", titulo: "Estabilidade e estágio probatório", resumoLivroId: "c04999f1-f465-4d64-9410-ca5eb262125c", capituloOrdem: 19 },
      ],
    },
    {
      slug: "atos-administrativos",
      titulo: "Atos Administrativos",
      nivel: "iniciante",
      resumos: 7, horas: 4,
      subtemas: [
        { slug: "adm-atos-01", titulo: "Conceito e classificação", resumoLivroId: "5a86ef47-1da2-4dd3-92fc-1296799f2419", capituloOrdem: 1 },
        { slug: "adm-atos-02", titulo: "Elementos e requisitos", resumoLivroId: "5a86ef47-1da2-4dd3-92fc-1296799f2419", capituloOrdem: 2 },
        { slug: "adm-atos-03", titulo: "Atributos do ato", resumoLivroId: "5a86ef47-1da2-4dd3-92fc-1296799f2419", capituloOrdem: 3 },
        { slug: "adm-atos-04", titulo: "Extinção do ato", resumoLivroId: "5a86ef47-1da2-4dd3-92fc-1296799f2419", capituloOrdem: 4 },
      ],
    },
    {
      slug: "poderes",
      titulo: "Poderes Administrativos",
      nivel: "intermediario",
      resumos: 5, horas: 3,
      subtemas: [
        { slug: "adm-poderes-01", titulo: "Poder vinculado e discricionário", resumoLivroId: "f88d1dcd-a579-4d39-92f2-459a7a7cd8d0", capituloOrdem: 1 },
        { slug: "adm-poderes-02", titulo: "Poder hierárquico", resumoLivroId: "f88d1dcd-a579-4d39-92f2-459a7a7cd8d0", capituloOrdem: 2 },
        { slug: "adm-poderes-03", titulo: "Poder disciplinar", resumoLivroId: "f88d1dcd-a579-4d39-92f2-459a7a7cd8d0", capituloOrdem: 3 },
        { slug: "adm-poderes-04", titulo: "Poder de polícia", resumoLivroId: "f88d1dcd-a579-4d39-92f2-459a7a7cd8d0", capituloOrdem: 5 },
      ],
    },
    {
      slug: "servicos-publicos",
      titulo: "Serviços Públicos",
      nivel: "intermediario",
      resumos: 7, horas: 3,
      subtemas: [
        { slug: "adm-servicos-01", titulo: "Conceito e princípios", resumoLivroId: "9930e161-1d8d-43e7-a63c-c3e613240135", capituloOrdem: 1 },
        { slug: "adm-servicos-02", titulo: "Classificação", resumoLivroId: "9930e161-1d8d-43e7-a63c-c3e613240135", capituloOrdem: 2 },
        { slug: "adm-servicos-03", titulo: "Formas de prestação", resumoLivroId: "9930e161-1d8d-43e7-a63c-c3e613240135", capituloOrdem: 3 },
      ],
    },
    {
      slug: "licitacoes",
      titulo: "Licitações e Contratos",
      nivel: "intermediario",
      resumos: 14, horas: 6,
      subtemas: [
        { slug: "adm-lic-01", titulo: "Lei 14.133/21 — princípios", topicos: ["Nova lei de licitações", "Princípios licitatórios"] },
        { slug: "adm-lic-02", titulo: "Modalidades de licitação", topicos: ["Pregão", "Concorrência", "Diálogo competitivo"] },
        { slug: "adm-lic-03", titulo: "Contratos administrativos", resumoLivroId: "5de8782d-f942-45b4-9678-07cd09e798fb", capituloOrdem: 1 },
        { slug: "adm-lic-04", titulo: "Cláusulas exorbitantes", resumoLivroId: "5de8782d-f942-45b4-9678-07cd09e798fb", capituloOrdem: 4 },
      ],
    },
    {
      slug: "bens-publicos",
      titulo: "Bens Públicos",
      nivel: "avancado",
      resumos: 6, horas: 3,
      subtemas: [
        { slug: "adm-bens-01", titulo: "Conceito e classificação", resumoLivroId: "07bbaca0-2b32-406a-9344-703b40ec622a", capituloOrdem: 1 },
        { slug: "adm-bens-02", titulo: "Regime jurídico", resumoLivroId: "07bbaca0-2b32-406a-9344-703b40ec622a", capituloOrdem: 2 },
        { slug: "adm-bens-03", titulo: "Uso de bens por particulares", resumoLivroId: "07bbaca0-2b32-406a-9344-703b40ec622a", capituloOrdem: 4 },
      ],
    },
    {
      slug: "desapropriacao",
      titulo: "Desapropriação",
      nivel: "avancado",
      resumos: 6, horas: 3,
      subtemas: [
        { slug: "adm-desap-01", titulo: "Conceito e fundamento", resumoLivroId: "0a07cdb0-b909-4324-9d16-410bea9109b9", capituloOrdem: 1 },
        { slug: "adm-desap-02", titulo: "Modalidades", resumoLivroId: "0a07cdb0-b909-4324-9d16-410bea9109b9", capituloOrdem: 2 },
        { slug: "adm-desap-03", titulo: "Procedimento", resumoLivroId: "0a07cdb0-b909-4324-9d16-410bea9109b9", capituloOrdem: 3 },
      ],
    },
    {
      slug: "responsabilidade",
      titulo: "Responsabilidade Civil do Estado",
      nivel: "avancado",
      resumos: 4, horas: 3,
      subtemas: [
        { slug: "adm-resp-01", titulo: "Teoria do risco administrativo", resumoLivroId: "3ce58d4d-fbb2-468f-a2fe-1f9456ea1c1a", capituloOrdem: 15 },
        { slug: "adm-resp-02", titulo: "Excludentes de responsabilidade", topicos: ["Caso fortuito", "Culpa exclusiva da vítima"] },
      ],
    },
    {
      slug: "controle",
      titulo: "Controle da Administração",
      nivel: "avancado",
      resumos: 6, horas: 3,
      subtemas: [
        { slug: "adm-ctrl-01", titulo: "Controle interno e externo", resumoLivroId: "c8141621-c214-45ab-8025-0fd841d66eb4", capituloOrdem: 1 },
        { slug: "adm-ctrl-02", titulo: "Controle judicial", resumoLivroId: "c8141621-c214-45ab-8025-0fd841d66eb4", capituloOrdem: 4 },
      ],
    },
    {
      slug: "improbidade",
      titulo: "Improbidade Administrativa",
      nivel: "avancado",
      resumos: 5, horas: 3,
      subtemas: [
        { slug: "adm-improb-01", titulo: "Lei 8.429/92 e reforma 14.230/21", resumoLivroId: "3ce58d4d-fbb2-468f-a2fe-1f9456ea1c1a", capituloOrdem: 14 },
        { slug: "adm-improb-02", titulo: "Atos de improbidade — tipos", topicos: ["Enriquecimento ilícito", "Prejuízo ao erário", "Princípios"] },
        { slug: "adm-improb-03", titulo: "Sanções e prescrição", topicos: ["Sanções", "Prescrição quinquenal"] },
      ],
    },
  ],
};

// Para as demais matérias do edital criamos um stub mínimo (sem módulos)
// para que apareçam na grade com aviso "em preparação". O usuário pode
// expandir depois sem mexer no código de UI.
const STUB_EMOJIS: Record<string, { emoji: string; cor: string }> = {
  etica: { emoji: "⚖️", cor: "from-amber-500 to-yellow-500" },
  constitucional: { emoji: "📜", cor: "from-blue-500 to-indigo-500" },
  "direitos-humanos": { emoji: "🕊️", cor: "from-sky-500 to-cyan-500" },
  internacional: { emoji: "🌐", cor: "from-cyan-500 to-teal-500" },
  tributario: { emoji: "💰", cor: "from-emerald-500 to-green-600" },
  administrativo: { emoji: "🏛️", cor: "from-violet-500 to-indigo-600" },
  ambiental: { emoji: "🌳", cor: "from-green-500 to-lime-500" },
  civil: { emoji: "📚", cor: "from-rose-500 to-pink-500" },
  consumidor: { emoji: "🛒", cor: "from-orange-500 to-red-500" },
  empresarial: { emoji: "🏢", cor: "from-slate-500 to-zinc-600" },
  processo_civil: { emoji: "⚙️", cor: "from-purple-500 to-fuchsia-600" },
  penal: { emoji: "⚔️", cor: "from-red-600 to-rose-700" },
  processo_penal: { emoji: "🔒", cor: "from-red-500 to-orange-600" },
  trabalho: { emoji: "👷", cor: "from-yellow-600 to-amber-600" },
  processo_trabalho: { emoji: "📋", cor: "from-amber-600 to-orange-600" },
  ecaegf: { emoji: "🧒", cor: "from-pink-500 to-rose-500" },
  filosofia: { emoji: "🤔", cor: "from-stone-500 to-neutral-600" },
};

function stub(materiaId: string, nome: string): AulaMateria {
  const meta = STUB_EMOJIS[materiaId] ?? { emoji: "📖", cor: "from-slate-500 to-slate-700" };
  return {
    materiaId,
    nome,
    emoji: meta.emoji,
    cor: meta.cor,
    descricao: "Trilha em preparação. Em breve módulos completos.",
    modulos: [],
  };
}

export const AULAS_MATERIAS: AulaMateria[] = MATERIAS_OAB_46.map((m) => {
  if (m.id === "administrativo") return ADMINISTRATIVO;
  return stub(m.id, m.nome);
});

export function getMateriaAula(materiaId: string): AulaMateria | undefined {
  return AULAS_MATERIAS.find((m) => m.materiaId === materiaId);
}

export function getModuloAula(materiaId: string, moduloSlug: string): AulaModulo | undefined {
  return getMateriaAula(materiaId)?.modulos.find((mo) => mo.slug === moduloSlug);
}

export function getSubtemaAula(subtemaSlug: string):
  | { materia: AulaMateria; modulo: AulaModulo; subtema: AulaSubtema; index: number }
  | undefined {
  for (const materia of AULAS_MATERIAS) {
    for (const modulo of materia.modulos) {
      const idx = modulo.subtemas.findIndex((s) => s.slug === subtemaSlug);
      if (idx >= 0) {
        return { materia, modulo, subtema: modulo.subtemas[idx], index: idx };
      }
    }
  }
  return undefined;
}

// ---------------- Trilha (8 passos) ----------------

export const PASSOS_AULA = [
  { n: 1, key: "resumo",    titulo: "Ler o resumo",            desc: "Estude o conteúdo central deste subtema antes de praticar.", icone: "book" },
  { n: 2, key: "flashcards", titulo: "Revisar com flashcards",  desc: "Memorize os conceitos-chave do subtema.", icone: "layers" },
  { n: 3, key: "rodada1",   titulo: "Questões — Rodada 1",     desc: "Teste o que aprendeu com questões focadas.", icone: "file" },
  { n: 4, key: "erros1",    titulo: "Caderno de Erros — Rodada 1", desc: "Revise as questões erradas com o trecho do resumo grifado.", icone: "alert" },
  { n: 5, key: "rodada2",   titulo: "Questões — Rodada 2",     desc: "Refaça apenas as questões que você errou.", icone: "refresh" },
  { n: 6, key: "simulado",  titulo: "Simulado do Subtema",     desc: "Resolva todas as questões deste subtema em formato de prova.", icone: "clipboard" },
  { n: 7, key: "erros_sim", titulo: "Caderno de Erros do Simulado", desc: "Revise as questões erradas no simulado deste subtema.", icone: "alert" },
  { n: 8, key: "feedback",  titulo: "Feedback do Subtema",     desc: "Veja sua evolução e conclua este subtema.", icone: "trophy" },
] as const;

export type PassoKey = (typeof PASSOS_AULA)[number]["key"];
