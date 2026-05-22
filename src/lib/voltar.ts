// Resolve o destino "lógico" do botão Voltar a partir do pathname + search atuais.
// Retorna também o label (nome humano do destino) para o cabeçalho mostrar
// "Voltar para X" sem precisar do history.back().

import { getMateria } from "@/data/materias";

export type DestinoVoltar = {
  to: string;
  search?: Record<string, unknown>;
  label: string;
};

// Dicionário canônico raiz -> nome humano
const NOME_RAIZ: Record<string, string> = {
  "/app": "Início",
  "/resumos": "Resumos",
  "/aulas": "Aulas",
  "/biblioteca": "Biblioteca",
  "/vade-mecum": "Vade-Mécum",
  "/vade-mecum/cf": "Constituição",
  "/vade-mecum/estatutos": "Estatutos",
  "/simulados": "Simulados",
  "/provas": "Provas",
  "/noticias": "Notícias",
  "/blog": "Blog",
  "/flashcards": "Flashcards",
  "/flashcards-tema": "Flashcards por tema",
  "/oab": "OAB",
  "/oab/primeira-fase": "1ª Fase",
  "/oab/segunda-fase": "2ª Fase",
  "/admin": "Admin",
  "/perfil": "Perfil",
  "/caderno-erros": "Aulas",
  "/plano-estudo": "Início",
  "/progresso": "Início",
  "/reta-final": "Início",
  "/questoes": "Início",
  "/assistente": "Início",
  "/audioaulas": "Início",
  "/materias": "Matérias",
  "/atualizacoes-leis": "Início",
};

function nomeMateria(slug: string): string {
  return getMateria(slug)?.nome ?? "Matéria";
}

function rotuloRaiz(to: string): string {
  return NOME_RAIZ[to] ?? "Voltar";
}

export function resolverVoltar(
  pathname: string,
  search?: Record<string, unknown>,
): DestinoVoltar {
  const p = pathname.replace(/\/+$/, "");
  const sp = search ?? {};

  // ===== Flashcards por tema (navegação por search params) =====
  if (p === "/flashcards-tema") {
    if (sp.capitulo) return { to: "/flashcards-tema", search: { area: sp.area, livro: sp.livro }, label: "Livro" };
    if (sp.livro) return { to: "/flashcards-tema", search: { area: sp.area }, label: typeof sp.area === "string" ? String(sp.area) : "Áreas" };
    if (sp.area) return { to: "/flashcards-tema", label: "Áreas" };
    return { to: "/flashcards", label: "Flashcards" };
  }

  // ===== Resumos =====
  // /resumos?area=X -> /resumos
  if (p === "/resumos") {
    if (sp.area) return { to: "/resumos", label: "Resumos" };
    return { to: "/app", label: "Início" };
  }
  // /resumos/capitulo/:livroId/:ordem -> /resumos/:livroId
  const mCap = p.match(/^\/resumos\/capitulo\/([^/]+)\/[^/]+$/);
  if (mCap) return { to: `/resumos/${mCap[1]}`, label: "Resumo" };
  // /resumos/:livroId -> /resumos
  if (/^\/resumos\/[^/]+$/.test(p)) return { to: "/resumos", label: "Resumos" };

  // ===== Aulas =====
  // /aulas/:materia/:livroId/:ordem -> /aulas/:materia/:livroId
  const mAulaCap = p.match(/^\/aulas\/([^/]+)\/([^/]+)\/[^/]+$/);
  if (mAulaCap) return { to: `/aulas/${mAulaCap[1]}/${mAulaCap[2]}`, label: "Livro" };
  // /aulas/:materia/:livroId -> /aulas/:materia
  const mAulaLivro = p.match(/^\/aulas\/([^/]+)\/[^/]+$/);
  if (mAulaLivro) return { to: `/aulas/${mAulaLivro[1]}`, label: nomeMateria(mAulaLivro[1]) };
  // /aulas/:materia -> /aulas
  if (/^\/aulas\/[^/]+$/.test(p)) return { to: "/aulas", label: "Aulas" };
  if (p === "/aulas") return { to: "/app", label: "Início" };

  // ===== Biblioteca =====
  const mBibLer = p.match(/^\/biblioteca\/([^/]+)\/([^/]+)\/ler$/);
  if (mBibLer) return { to: `/biblioteca/${mBibLer[1]}/${mBibLer[2]}`, label: "Livro" };
  const mBibBook = p.match(/^\/biblioteca\/([^/]+)\/[^/]+$/);
  if (mBibBook) return { to: `/biblioteca/${mBibBook[1]}`, label: "Categoria" };
  if (/^\/biblioteca\/[^/]+$/.test(p)) return { to: "/biblioteca", label: "Biblioteca" };
  if (p === "/biblioteca") return { to: "/app", label: "Início" };

  // ===== Vade-Mécum =====
  if (/^\/vade-mecum\/cf\/[^/]+$/.test(p)) return { to: "/vade-mecum/cf", label: "Constituição" };
  if (p === "/vade-mecum/cf") return { to: "/vade-mecum", label: "Vade-Mécum" };
  if (/^\/vade-mecum\/estatutos\/[^/]+$/.test(p)) return { to: "/vade-mecum/estatutos", label: "Estatutos" };
  if (p === "/vade-mecum/estatutos") return { to: "/vade-mecum", label: "Vade-Mécum" };
  if (/^\/vade-mecum\/[^/]+$/.test(p)) return { to: "/vade-mecum", label: "Vade-Mécum" };
  if (p === "/vade-mecum") return { to: "/app", label: "Início" };

  // ===== OAB =====
  if (p === "/oab/primeira-fase" || p === "/oab/segunda-fase") return { to: "/app", label: "Início" };
  if (/^\/oab\/(progresso|reforco|caderno-erros)$/.test(p)) return { to: "/oab/primeira-fase", label: "1ª Fase" };
  if (/^\/oab\/.+$/.test(p)) return { to: "/app", label: "Início" };

  // ===== Simulados =====
  if (/^\/simulados\/[^/]+\/resultado\/[^/]+$/.test(p)) return { to: "/simulados", label: "Simulados" };
  if (/^\/simulados\/[^/]+\/praticar$/.test(p)) {
    const slug = p.split("/")[2];
    return { to: `/simulados/${slug}`, label: "Simulado" };
  }
  if (/^\/simulados\/[^/]+$/.test(p)) return { to: "/simulados", label: "Simulados" };
  if (p === "/simulados") return { to: "/app", label: "Início" };

  // ===== Provas =====
  if (/^\/provas\/[^/]+$/.test(p)) return { to: "/provas", label: "Provas" };
  if (p === "/provas") return { to: "/app", label: "Início" };

  // ===== Notícias / Blog =====
  if (/^\/noticias\/[^/]+$/.test(p)) return { to: "/noticias", label: "Notícias" };
  if (/^\/blog\/[^/]+$/.test(p)) return { to: "/blog", label: "Blog" };

  // ===== Matérias =====
  if (/^\/materias\/[^/]+$/.test(p)) return { to: "/materias", label: "Matérias" };

  // ===== Admin =====
  if (/^\/admin\/.+/.test(p)) return { to: "/admin", label: "Admin" };
  if (p === "/admin") return { to: "/app", label: "Início" };

  // ===== Genérico: sobe um nível =====
  const idx = p.lastIndexOf("/");
  if (idx > 0) {
    const pai = p.slice(0, idx);
    return { to: pai, label: rotuloRaiz(pai) };
  }

  return { to: "/app", label: "Início" };
}
