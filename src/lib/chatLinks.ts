export interface ChatTextPart { text: string; href?: string }

// Split plain chat text into text and safe, clickable web links. React renders
// every part as text, so messages never become HTML supplied by another user.
export function chatTextParts(body: string): ChatTextPart[] {
  const parts: ChatTextPart[] = [];
  const pattern = /https?:\/\/[^\s<>"']+/gi;
  let cursor = 0;
  for (const match of body.matchAll(pattern)) {
    const start = match.index;
    if (start > cursor) parts.push({ text: body.slice(cursor, start) });
    const raw = match[0];
    const link = raw.replace(/[.,!?;:]+$/g, '').replace(/\)+$/g, (closing) => {
      const opening = (raw.match(/\(/g) || []).length;
      return ')'.repeat(Math.min(opening, closing.length));
    });
    let href: string | undefined;
    try {
      const url = new URL(link);
      if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname && !url.username && !url.password) href = url.href;
    } catch { /* leave malformed URLs as plain text */ }
    parts.push({ text: link, ...(href ? { href } : {}) });
    if (link.length < raw.length) parts.push({ text: raw.slice(link.length) });
    cursor = start + raw.length;
  }
  if (cursor < body.length) parts.push({ text: body.slice(cursor) });
  return parts;
}
