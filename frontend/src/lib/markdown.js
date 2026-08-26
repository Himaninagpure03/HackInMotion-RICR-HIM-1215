/**
 * Minimal markdown-to-HTML for LLM responses.
 * Handles: **bold**, *italic*, `code`, - bullet lists, # headers, newlines.
 */
export function renderMarkdown(text) {
  if (!text) return "";

  let html = text
    // escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // headers
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>");

  // bullet lines: "- item" or "* item"
  const lines = html.split("\n");
  const out = [];
  let inList = false;

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*] (.+)$/);
    if (bulletMatch) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${bulletMatch[1]}</li>`);
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      if (line.trim() === "") {
        out.push("<br/>");
      } else {
        out.push(line);
      }
    }
  }
  if (inList) out.push("</ul>");

  return out.join("\n");
}
