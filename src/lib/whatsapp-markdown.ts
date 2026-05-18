/**
 * Converte um subconjunto de Markdown para o formato de texto do WhatsApp.
 * - **negrito**  -> *negrito*
 * - *itálico*    -> _itálico_  (cuidado: só itálico se for *single*)
 * - `code`       -> ```code```
 * - listas `- `  -> "• "
 * - blockquotes `> ` mantidos como linha iniciada por "> "
 * - títulos (#, ##, ###) viram "*Texto*"
 */
export function markdownToWhatsapp(md: string): string {
  let s = md;

  // Code blocks ``` ... ``` mantém triplo backtick (WhatsApp suporta `mono` simples)
  // Negrito **x**
  s = s.replace(/\*\*(.+?)\*\*/g, "*$1*");

  // Itálico *x* — só converte se já não for um asterisco escapado por bold (que já viramos *)
  // Para evitar conflito, primeiro tratamos _x_ (underscore italic do markdown) como _x_ (mesmo no WA).
  // Mantemos _x_ como está.

  // Inline code `x` -> `x` (WhatsApp aceita)
  // Sem mudança necessária.

  // Títulos
  s = s.replace(/^#{1,6}\s+(.*)$/gm, "*$1*");

  // Listas com - ou *
  s = s.replace(/^\s*[-*]\s+/gm, "• ");

  // Numeradas: mantém
  // Blockquote: mantém "> "

  // Links [texto](url) -> texto (url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // Linhas em branco múltiplas -> uma só
  s = s.replace(/\n{3,}/g, "\n\n");

  return s.trim();
}

/**
 * Texto puro (sem markdown) para o PDF.
 */
export function markdownToPlainText(md: string): string {
  let s = md;
  s = s.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, "").trim());
  s = s.replace(/\*\*(.+?)\*\*/g, "$1");
  s = s.replace(/\*(.+?)\*/g, "$1");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/^\s*[-*]\s+/gm, "• ");
  s = s.replace(/^\s*>\s?/gm, "  ");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}
