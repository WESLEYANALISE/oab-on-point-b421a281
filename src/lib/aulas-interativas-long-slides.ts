type SlideDraft = {
  ordem?: number;
  tipo?: string;
  conteudo?: Record<string, any>;
  imagem_url?: string | null;
  quiz_json?: any;
};

type AulaDraft = {
  titulo?: string;
  descricao?: string;
  escopo?: string;
  duracao_min?: number;
  slides?: SlideDraft[];
};

const STOPWORDS = new Set([
  "para", "pela", "pelo", "como", "mais", "menos", "sobre", "entre", "aula", "direito", "juridico", "jurídico",
  "conceito", "conceitos", "aspectos", "principais", "material", "estudo", "oab", "modulo", "módulo",
]);

function compactText(text: string, maxChars: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  const cut = cleaned.slice(0, maxChars);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
  return cut.slice(0, lastStop > maxChars * 0.75 ? lastStop + 1 : maxChars).trim();
}

function normalizeText(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function extractTokens(...parts: Array<string | undefined | null>) {
  const raw = normalizeText(parts.filter(Boolean).join(" "));
  return Array.from(new Set(raw.match(/[a-z0-9]{4,}/g) ?? []))
    .filter((w) => !STOPWORDS.has(w))
    .slice(0, 28);
}

function splitSentences(text: string, max = 8) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  return sentences.slice(0, max);
}

function pickSentences(text: string, start: number, count: number, fallback: string) {
  const sentences = splitSentences(text, start + count + 2).slice(start, start + count);
  return sentences.length ? sentences.join(" ") : fallback;
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function existingSlideText(slides: SlideDraft[] = []) {
  return slides
    .map((s) => {
      const c = s.conteudo ?? {};
      return [c.titulo, c.texto, c.destaque, c.enunciado, c.pergunta, c.analise, ...(Array.isArray(c.bullets) ? c.bullets : [])]
        .filter(Boolean)
        .join(". ");
    })
    .filter(Boolean)
    .join(" ");
}

function buildPares(_titulo: string, base: string, termos: string[]) {
  const sentences = splitSentences(base, 24);
  const pares = termos.slice(0, 5)
    .map((termo, i) => {
      const frase = sentences[i] || sentences[(i + 3) % Math.max(1, sentences.length)] || "";
      const definicao = compactText(frase, 160).trim();
      return { termo: cap(termo), definicao };
    })
    .filter((p) => p.termo.trim().length >= 2 && p.definicao.length >= 60);
  return pares.length >= 3 ? pares : [];
}


function buildRamos(titulo: string, escopo: string, termos: string[]) {
  const base = termos.length >= 4 ? termos.slice(0, 4) : [...termos, "conceito", "regra", "aplicação", "exceção"].slice(0, 4);
  const frases = splitSentences(escopo, 6);
  return base.map((t, i) => ({
    titulo: cap(t),
    descricao: compactText(frases[i] || `Aspecto relevante de ${titulo}.`, 110),
  }));
}

export function buildLongSlides(aula: AulaDraft, material = "") {
  const titulo = String(aula?.titulo ?? "Aula");
  const escopo = String(aula?.escopo ?? aula?.descricao ?? "Tema central da aula.");
  const base = compactText((material || existingSlideText(aula.slides) || escopo).replace(/PÁGINA \d+:/g, " ").replace(/---/g, " "), 12_000);

  const c1 = pickSentences(base, 0, 4, escopo);
  const c2 = pickSentences(base, 4, 4, escopo);
  const ex1 = pickSentences(base, 8, 3, `Aplique ${titulo} a um caso concreto, identificando conceito, regra e consequência.`);
  const ex2 = pickSentences(base, 11, 3, `Outro ângulo de ${titulo}: observe o fato, enquadre na norma e conclua.`);
  const casoTexto = pickSentences(base, 14, 3, `Situação envolvendo ${titulo}.`);
  const analise = pickSentences(base, 5, 3, "Identifique o instituto, destaque os fatos relevantes e aplique a regra estudada.");

  const termos = extractTokens(titulo, escopo, base).slice(0, 8);
  const pares = buildPares(titulo, base, termos);
  const ramos = buildRamos(titulo, escopo, termos);
  const bulletsEsquema = (termos.slice(0, 5).length ? termos.slice(0, 5) : ["conceito", "regra", "exceção", "aplicação"])
    .map((t) => `${cap(t)} — ponto-chave do tema.`);

  let ordem = 0;
  const next = () => ordem++;

  return [
    { ordem: next(), tipo: "capa", conteudo: { titulo, objetivos: ["Compreender o tema no contexto da OAB", "Identificar conceitos centrais", "Aplicar o raciocínio em questões práticas"] }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "conceito", conteudo: { titulo: "Base conceitual", texto: c1, destaque: "Domine o conceito antes de resolver o caso." }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "esquema", conteudo: { titulo: "Mapa do conteúdo", bullets: bulletsEsquema }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "exemplo", conteudo: { titulo: "Aplicação prática", texto: ex1, destaque: "Conecte fato, regra e consequência." }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "quiz", conteudo: { titulo: "Checagem rápida" }, imagem_url: null, quiz_json: { pergunta: `Sobre ${titulo}, qual afirmação é correta?`, alternativas: [{ letra: "A", texto: "O instituto exige análise conjunta de conceito, regra aplicável e situação fática" }, { letra: "B", texto: "Basta decorar a palavra-chave para acertar a questão" }, { letra: "C", texto: "O tema independe do contexto da OAB" }, { letra: "D", texto: "A regra não admite qualquer exceção" }], correta: "A", explicacao: "A correta é A: o raciocínio jurídico exige integrar conceito, norma e fato. B reduz o estudo à memorização; C ignora o recorte da prova; D é absoluta e por isso falsa." } },
    { ordem: next(), tipo: "conceito", conteudo: { titulo: "Aprofundamento", texto: c2, destaque: "Atenção às palavras que alteram o alcance da regra." }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "comparativo", conteudo: { titulo: "Regra x Exceção", colunas: [{ titulo: "Regra geral", itens: ["Aplica-se à maioria dos casos", "Decorre direto do conteúdo estudado", "Cobra-se com frequência na OAB"] }, { titulo: "Exceções e cuidados", itens: ["Hipóteses restritas previstas no material", "Exigem leitura atenta do enunciado", "Costumam ser pegadinha de prova"] }] }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "ligar_termos", conteudo: { titulo: "Ligue os termos", pares }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "caso_pratico", conteudo: { titulo: "Caso prático", enunciado: compactText(casoTexto, 320), pergunta: `Qual é o primeiro passo para resolver corretamente uma questão sobre ${titulo}?`, analise: compactText(analise, 360) }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "quiz", conteudo: { titulo: "Aplicação em prova" }, imagem_url: null, quiz_json: { pergunta: `Em uma questão prática de ${titulo}, o examinador costuma cobrar:`, alternativas: [{ letra: "A", texto: "A identificação do instituto e a consequência jurídica correta" }, { letra: "B", texto: "A repetição literal de doutrina" }, { letra: "C", texto: "A escolha da alternativa mais longa" }, { letra: "D", texto: "Resposta baseada em intuição pessoal" }], correta: "A", explicacao: "A correta é A: a OAB cobra raciocínio aplicado. B confunde estudo com decoreba; C é um chute; D ignora a técnica jurídica." } },
    { ordem: next(), tipo: "mapa_mental", conteudo: { titulo: "Mapa mental", central: titulo, ramos }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "dicas", conteudo: { titulo: "Dicas de prova", dicas: [{ tipo: "dica", texto: "Leia o enunciado caçando a regra cobrada." }, { tipo: "atencao", texto: "Cuidado com alternativas absolutas (sempre, nunca, jamais) — costumam ser falsas." }, { tipo: "alvo", texto: "Foque nos termos que aparecem repetidos no material — sinalizam o que cai." }, { tipo: "estrela", texto: "Treine ligando o conceito teórico ao caso concreto." }] }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "exemplo", conteudo: { titulo: "Outra aplicação", texto: ex2, destaque: "Variar o cenário ajuda a fixar a regra." }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "quiz", conteudo: { titulo: "Pegadinha clássica" }, imagem_url: null, quiz_json: { pergunta: `Sobre ${titulo}, qual alternativa apresenta um ERRO comum?`, alternativas: [{ letra: "A", texto: "Tratar a exceção como se fosse a regra geral" }, { letra: "B", texto: "Identificar o instituto antes de responder" }, { letra: "C", texto: "Confrontar fato e norma" }, { letra: "D", texto: "Verificar a consequência jurídica" }], correta: "A", explicacao: "A correta é A: confundir exceção com regra é o erro clássico. B, C e D descrevem o método correto de resolução." } },
    { ordem: next(), tipo: "resumo", conteudo: { titulo: "Resumo da aula", bullets: ["Conceito central do tema", "Regra geral e principais exceções", "Aplicação em caso prático", "Vocabulário essencial", "Erros comuns a evitar", "Estratégia para a prova da OAB"] }, imagem_url: null, quiz_json: null },
    { ordem: next(), tipo: "quiz", conteudo: { titulo: "Questão final integradora" }, imagem_url: null, quiz_json: { pergunta: `Em uma questão de OAB sobre ${titulo}, o melhor caminho é:`, alternativas: [{ letra: "A", texto: "Ler os fatos, identificar o instituto e aplicar a consequência jurídica prevista" }, { letra: "B", texto: "Escolher a alternativa mais longa" }, { letra: "C", texto: "Desconsiderar o contexto fático" }, { letra: "D", texto: "Responder apenas por familiaridade com o tema" }], correta: "A", explicacao: "A é correta porque reproduz o método jurídico: fato → norma → consequência. B, C e D são atalhos inseguros que costumam levar ao erro." } },
    { ordem: next(), tipo: "conclusao", conteudo: { titulo: "Fechamento", texto: `Você percorreu os pontos centrais de ${titulo}: conceito, regra, exceções, aplicação e estratégia de prova.`, bullets: ["Revise os pares termo–definição", "Refaça os quizzes errados", "Avance para a próxima aula"] }, imagem_url: null, quiz_json: null },
  ];
}

export function ensureLongSlides(aula: AulaDraft) {
  const slides = Array.isArray(aula.slides) ? aula.slides : [];
  const tipos = new Set(slides.map((s) => s.tipo));
  const completos = slides.length >= 15 && ["ligar_termos", "caso_pratico", "mapa_mental", "comparativo", "dicas"].every((t) => tipos.has(t));
  return completos ? slides.map((s, i) => ({ ...s, ordem: typeof s.ordem === "number" ? s.ordem : i })) : buildLongSlides(aula);
}

export function ensureLongCourseStructure<T extends { modulos?: any[] }>(estrutura: T): T {
  return {
    ...estrutura,
    modulos: (estrutura.modulos ?? []).map((m) => ({
      ...m,
      aulas: (m.aulas ?? []).map((a: AulaDraft) => ({ ...a, slides: ensureLongSlides(a) })),
    })),
  } as T;
}