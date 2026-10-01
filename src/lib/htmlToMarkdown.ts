/**
 * Nettoyage du contenu collé depuis Word, Google Docs, un e-mail ou une page web.
 *
 * Le site public affiche un Markdown léger sans HTML (aucun risque XSS) : le HTML
 * collé est donc CONVERTI vers ce format et tout le reste est supprimé (styles,
 * polices, couleurs, classes, scripts, images, tableaux réduits à leur texte).
 *
 * Conservés : titres (##, ###), paragraphes, retours à la ligne, **gras**, *italique*,
 * listes à puces / numérotées, citations, liens https / mailto / tel.
 */
const SAFE_LINK = /^(https?:\/\/|mailto:|tel:)/i;

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\s+/g, " ");
  if (!(node instanceof HTMLElement)) return "";
  const tag = node.tagName.toLowerCase();
  if (["script", "style", "head", "meta", "title", "noscript", "img", "svg"].includes(tag)) return "";
  if (tag === "br") return "\n";
  const content = Array.from(node.childNodes).map(inline).join("");
  const trimmed = content.trim();
  if (!trimmed) return content;
  const style = node.getAttribute("style") ?? "";
  const bold = tag === "strong" || tag === "b" || /font-weight\s*:\s*(bold|[6-9]00)/i.test(style);
  const italic = tag === "em" || tag === "i" || /font-style\s*:\s*italic/i.test(style);
  if (tag === "a") {
    const href = node.getAttribute("href") ?? "";
    return SAFE_LINK.test(href) ? `[${trimmed.replace(/[[\]]/g, "")}](${href})` : content;
  }
  // Google Docs entoure tout le document d'un <b style="font-weight:normal">.
  if (bold && !/font-weight\s*:\s*normal/i.test(style)) return wrap(content, "**");
  if (italic) return wrap(content, "*");
  return content;
}

/** Entoure le texte en conservant les espaces extérieurs (« mot **gras** suivant »). */
function wrap(content: string, marker: string): string {
  const match = content.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!match || !match[2]) return content;
  return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
}

function blocks(node: Node, output: string[]): void {
  if (!(node instanceof HTMLElement)) {
    const text = inline(node).trim();
    if (text) output.push(text);
    return;
  }
  const tag = node.tagName.toLowerCase();
  if (["script", "style", "head", "meta", "title", "noscript"].includes(tag)) return;
  const text = () => inline(node).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (/^h[1-2]$/.test(tag)) return void (text() && output.push(`## ${text().replace(/\*\*/g, "")}`));
  if (/^h[3-6]$/.test(tag)) return void (text() && output.push(`### ${text().replace(/\*\*/g, "")}`));
  if (tag === "ul" || tag === "ol") {
    const items = Array.from(node.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child, index) => `${tag === "ol" ? `${index + 1}.` : "-"} ${inline(child).replace(/\s+/g, " ").trim()}`)
      .filter((line) => !/^(-|\d+\.)\s*$/.test(line));
    if (items.length) output.push(items.join("\n"));
    return;
  }
  if (tag === "blockquote") {
    const quoted = text();
    if (quoted) output.push(quoted.split("\n").map((line) => `> ${line}`).join("\n"));
    return;
  }
  if (tag === "p" || tag === "pre") {
    const paragraph = text();
    if (paragraph) output.push(paragraph);
    return;
  }
  if (tag === "tr") {
    const row = Array.from(node.children).map((cell) => inline(cell).trim()).filter(Boolean).join(" — ");
    if (row) output.push(row);
    return;
  }
  // Conteneurs (div, section, body, table…) : on descend, en regroupant le texte en ligne.
  const hasBlockChildren = Array.from(node.children).some((child) => /^(p|div|h[1-6]|ul|ol|blockquote|table|tbody|thead|tr|section|article|pre)$/i.test(child.tagName));
  if (!hasBlockChildren) {
    const paragraph = text();
    if (paragraph) output.push(paragraph);
    return;
  }
  for (const child of Array.from(node.childNodes)) blocks(child, output);
}

export function htmlToMarkdown(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  const output: string[] = [];
  blocks(document.body, output);
  return output
    .join("\n\n")
    .replace(/\u00a0/g, " ") // espaces insécables
    .replace(/\*\*\s*\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
