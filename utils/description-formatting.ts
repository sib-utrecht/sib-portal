import DOMPurify from "isomorphic-dompurify";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Paired WhatsApp markers at word boundaries; unmatched markers remain literal. */
export function whatsappTextHtml(text: string): string {
  const pattern = /(?<![\w*~_\\])([*_~])(?!\s)([^\n]*?\S)\1(?![\w*~_])/g;
  let html = "";
  let offset = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index!;
    html += escapeHtml(text.slice(offset, index));
    const tag = match[1] === "*" ? "strong" : match[1] === "_" ? "em" : "s";
    html += `<${tag}>${whatsappTextHtml(match[2])}</${tag}>`;
    offset = index + match[0].length;
  }
  return html + escapeHtml(text.slice(offset));
}

export function whatsappPasteHtml(clipboard: Pick<DataTransfer, "getData">): string {
  const rich = clipboard.getData("text/html");
  if (!rich) return whatsappTextHtml(clipboard.getData("text/plain")).replace(/\r?\n/g, "<br>");
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(rich), "text/html");
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (node.parentElement?.closest("a, code, pre")) continue;
    const template = doc.createElement("template");
    template.innerHTML = whatsappTextHtml(node.data);
    node.replaceWith(template.content);
  }
  return DOMPurify.sanitize(doc.body.innerHTML);
}
