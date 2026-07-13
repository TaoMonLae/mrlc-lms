import { useMemo } from "react";
import DOMPurify from "dompurify";

/**
 * Tiny, dependency-free markdown renderer for AI replies. Escapes first, then
 * applies a safe subset (headings, bold/italic, inline + fenced code, links,
 * lists, blockquotes, rules, simple tables), and sanitizes the result with
 * DOMPurify. Not a full CommonMark parser — just enough to render assistant
 * output cleanly without pulling in a markdown library.
 */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}

function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  const closeList = () => {
    if (listType) {
      out.push(`<${listType}>${listItems.map((li) => `<li>${li}</li>`).join("")}</${listType}>`);
      listType = null;
      listItems = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (/^\s*```/.test(line)) {
      closeList();
      i++;
      const buf: string[] = [];
      while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++;
      out.push(`<pre><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Table (header row + separator row)
    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[i + 1])) {
      closeList();
      const parseRow = (r: string) => r.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => inlineMd(esc(c.trim())));
      const header = parseRow(line);
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) { body.push(parseRow(lines[i])); i++; }
      out.push(
        `<table><thead><tr>${header.map((h) => `<th>${h}</th>`).join("")}</tr></thead>` +
        `<tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`
      );
      continue;
    }

    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inlineMd(esc(h[2]))}</h${h[1].length}>`); i++; continue; }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { closeList(); out.push("<hr/>"); i++; continue; }

    if (/^\s*>\s?/.test(line)) { closeList(); out.push(`<blockquote>${inlineMd(esc(line.replace(/^\s*>\s?/, "")))}</blockquote>`); i++; continue; }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) { if (listType && listType !== "ul") closeList(); listType = "ul"; listItems.push(inlineMd(esc(ul[1]))); i++; continue; }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) { if (listType && listType !== "ol") closeList(); listType = "ol"; listItems.push(inlineMd(esc(ol[1]))); i++; continue; }

    if (!line.trim()) { closeList(); i++; continue; }

    closeList();
    out.push(`<p>${inlineMd(esc(line))}</p>`);
    i++;
  }
  closeList();
  return out.join("\n");
}

export default function MiniMarkdown({ content, className }: { content: string; className?: string }) {
  const html = useMemo(
    () => DOMPurify.sanitize(mdToHtml(content || ""), { ADD_ATTR: ["target", "rel"] }),
    [content]
  );
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
