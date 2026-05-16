export type Materia = {
  slug: string;
  nome: string;
  area: "Constitucional" | "Profissional" | "Civil" | "Penal" | "Trabalho" | "Tributário" | "Administrativo" | "Empresarial" | "Especial" | "Humanístico";
  peso: number; // questões médias na 1ª fase
  cor: string; // token semântico bg
  emoji: string;
  descricao: string;
  topicos: string[];
};

export const MATERIAS: Materia[] = [
  { slug: "etica-oab", nome: "Ética e Estatuto da OAB", area: "Profissional", peso: 8, cor: "from-primary to-primary/70", emoji: "⚖️",
    descricao: "Regras da advocacia, infrações e CED-OAB. Matéria com peso alto e cobrada com literalidade.",
    topicos: ["Estatuto da OAB (Lei 8.906/94)", "Código de Ética e Disciplina", "Honorários", "Processo Disciplinar", "Sociedades de advogados"] },
  { slug: "constitucional", nome: "Direito Constitucional", area: "Constitucional", peso: 7, cor: "from-secondary to-secondary/70", emoji: "📜",
    descricao: "Princípios fundamentais, direitos e garantias, organização do Estado e controle de constitucionalidade.",
    topicos: ["Princípios fundamentais", "Direitos e garantias", "Organização do Estado", "Poder Legislativo, Executivo e Judiciário", "Controle de constitucionalidade", "Remédios constitucionais"] },
  { slug: "civil", nome: "Direito Civil", area: "Civil", peso: 8, cor: "from-primary to-primary/70", emoji: "📚",
    descricao: "Parte geral, obrigações, contratos, responsabilidade civil, família e sucessões.",
    topicos: ["Parte Geral", "Obrigações", "Contratos", "Responsabilidade Civil", "Direito das Coisas", "Família", "Sucessões"] },
  { slug: "processo-civil", nome: "Processo Civil", area: "Civil", peso: 9, cor: "from-secondary to-secondary/70", emoji: "🧾",
    descricao: "NCPC: jurisdição, processo, recursos, execução e tutela provisória.",
    topicos: ["Jurisdição e competência", "Partes e procuradores", "Atos processuais", "Procedimento comum", "Recursos", "Execução", "Tutela provisória"] },
  { slug: "penal", nome: "Direito Penal", area: "Penal", peso: 7, cor: "from-primary to-primary/70", emoji: "🔒",
    descricao: "Teoria geral do crime, parte especial e legislação penal extravagante.",
    topicos: ["Aplicação da lei penal", "Teoria do crime", "Concurso de pessoas", "Penas", "Crimes em espécie", "Lei de Drogas", "Lei Maria da Penha"] },
  { slug: "processo-penal", nome: "Processo Penal", area: "Penal", peso: 6, cor: "from-secondary to-secondary/70", emoji: "🛡️",
    descricao: "Inquérito, ação penal, procedimentos, prisões e recursos no processo penal.",
    topicos: ["Inquérito policial", "Ação penal", "Provas", "Prisões cautelares", "Procedimentos", "Recursos", "Habeas corpus"] },
  { slug: "trabalho", nome: "Direito do Trabalho", area: "Trabalho", peso: 7, cor: "from-primary to-primary/70", emoji: "👷",
    descricao: "CLT, contrato individual, jornada, remuneração, rescisão e direito coletivo.",
    topicos: ["Contrato individual", "Jornada de trabalho", "Remuneração", "Alteração do contrato", "Rescisão", "Direito coletivo", "Estabilidades"] },
  { slug: "processo-trabalho", nome: "Processo do Trabalho", area: "Trabalho", peso: 5, cor: "from-secondary to-secondary/70", emoji: "📂",
    descricao: "Justiça do Trabalho, dissídios, recursos e execução trabalhista.",
    topicos: ["Justiça do Trabalho", "Reclamação trabalhista", "Recursos", "Execução", "Custas e honorários"] },
  { slug: "tributario", nome: "Direito Tributário", area: "Tributário", peso: 6, cor: "from-primary to-primary/70", emoji: "💰",
    descricao: "STN, espécies tributárias, obrigação, crédito, processo e execução fiscal.",
    topicos: ["Sistema Tributário Nacional", "Espécies tributárias", "Obrigação tributária", "Crédito tributário", "Processo administrativo", "Execução fiscal"] },
  { slug: "administrativo", nome: "Direito Administrativo", area: "Administrativo", peso: 6, cor: "from-secondary to-secondary/70", emoji: "🏛️",
    descricao: "Atos, contratos, licitações, servidores, improbidade e responsabilidade do Estado.",
    topicos: ["Princípios", "Atos administrativos", "Licitações e contratos", "Servidores públicos", "Improbidade administrativa", "Responsabilidade civil do Estado"] },
  { slug: "empresarial", nome: "Direito Empresarial", area: "Empresarial", peso: 5, cor: "from-primary to-primary/70", emoji: "🏢",
    descricao: "Empresário, sociedades, títulos de crédito, falência e recuperação judicial.",
    topicos: ["Empresário", "Sociedades", "Títulos de crédito", "Contratos empresariais", "Falência e recuperação", "Propriedade industrial"] },
  { slug: "consumidor", nome: "Direito do Consumidor", area: "Especial", peso: 4, cor: "from-secondary to-secondary/70", emoji: "🛒",
    descricao: "CDC: relação de consumo, responsabilidade, práticas comerciais e proteção contratual.",
    topicos: ["Relação de consumo", "Responsabilidade por vício e fato", "Práticas comerciais", "Proteção contratual", "Defesa em juízo"] },
  { slug: "ambiental", nome: "Direito Ambiental", area: "Especial", peso: 3, cor: "from-primary to-primary/70", emoji: "🌿",
    descricao: "Política Nacional do Meio Ambiente, licenciamento, ZEE e responsabilidade ambiental.",
    topicos: ["Princípios", "Política Nacional do Meio Ambiente", "Licenciamento", "Áreas protegidas", "Responsabilidade ambiental"] },
  { slug: "internacional", nome: "Direito Internacional", area: "Especial", peso: 3, cor: "from-secondary to-secondary/70", emoji: "🌍",
    descricao: "Tratados, organismos, sujeitos de DIP e DI privado.",
    topicos: ["Fontes do DI", "Tratados", "Sujeitos de DIP", "Direito Internacional Privado", "Mercosul"] },
  { slug: "eca", nome: "ECA — Criança e Adolescente", area: "Especial", peso: 2, cor: "from-primary to-primary/70", emoji: "🧒",
    descricao: "Estatuto da Criança e do Adolescente — direitos, medidas protetivas e ato infracional.",
    topicos: ["Princípios", "Direitos fundamentais", "Medidas protetivas", "Ato infracional", "Conselho Tutelar"] },
  { slug: "direitos-humanos", nome: "Direitos Humanos", area: "Humanístico", peso: 2, cor: "from-secondary to-secondary/70", emoji: "🕊️",
    descricao: "Sistema global, sistema interamericano e princípios.",
    topicos: ["Conceito e características", "Sistema global de proteção", "Sistema interamericano", "DH na Constituição"] },
  { slug: "filosofia", nome: "Filosofia do Direito", area: "Humanístico", peso: 2, cor: "from-primary to-primary/70", emoji: "🧠",
    descricao: "Correntes do pensamento jurídico, justiça e teoria da norma.",
    topicos: ["Jusnaturalismo e positivismo", "Justiça", "Hermenêutica", "Direito e moral"] },
];

export function getMaterias() { return MATERIAS; }
export function getMateria(slug: string) { return MATERIAS.find((m) => m.slug === slug); }
