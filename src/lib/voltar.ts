// Resolve o destino "lógico" do botão Voltar a partir do pathname atual.
// Evita usar history.back() (que re-executa loaders e gera flash).
export function resolverVoltar(pathname: string): string {
  const p = pathname.replace(/\/+$/, "");

  // /resumos/capitulo/:livroId/:ordem -> /resumos/:livroId
  const mCap = p.match(/^\/resumos\/capitulo\/([^/]+)\/[^/]+$/);
  if (mCap) return `/resumos/${mCap[1]}`;

  // /resumos/:livroId -> /resumos
  if (/^\/resumos\/[^/]+$/.test(p)) return "/resumos";

  // /resumos -> /
  if (p === "/resumos") return "/app";

  // /simulados/... -> /simulados
  if (/^\/simulados\/.+/.test(p)) return "/simulados";

  // /provas/... -> /provas
  if (/^\/provas\/.+/.test(p)) return "/provas";

  // genérico: sobe um nível
  const idx = p.lastIndexOf("/");
  if (idx > 0) return p.slice(0, idx);

  return "/app";
}
