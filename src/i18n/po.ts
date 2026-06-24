// Minimal gettext .po parser. Returns a map of msgid -> msgstr (non-empty only)
// plus the parsed header metadata. Good enough for UI string catalogs:
// supports multi-line strings, escapes, comments, and msgctxt-less entries.

export interface ParsedPo {
  messages: Record<string, string>;
  headers: Record<string, string>;
}

function unquote(line: string): string {
  const start = line.indexOf('"');
  const end = line.lastIndexOf('"');
  if (start === -1 || end <= start) return '';
  const raw = line.slice(start + 1, end);
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

export function parsePo(input: string): ParsedPo {
  const messages: Record<string, string> = {};
  const headers: Record<string, string> = {};

  let msgid: string | null = null;
  let msgstr: string | null = null;
  let mode: 'id' | 'str' | null = null;

  const commit = () => {
    if (msgid !== null && msgstr !== null) {
      if (msgid === '') {
        // Header block: "Key: value\n" lines inside msgstr.
        for (const ln of msgstr.split('\n')) {
          const idx = ln.indexOf(':');
          if (idx > 0) headers[ln.slice(0, idx).trim()] = ln.slice(idx + 1).trim();
        }
      } else if (msgstr !== '') {
        messages[msgid] = msgstr;
      }
    }
    msgid = null;
    msgstr = null;
    mode = null;
  };

  const lines = input.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) {
      // Blank line ends an entry.
      if (line === '') commit();
      continue;
    }
    if (line.startsWith('msgid_plural') || line.startsWith('msgctxt')) {
      // Plurals/context are not used by our UI catalogs; ignore the directive
      // but keep collecting on continuation lines via current mode.
      continue;
    }
    if (line.startsWith('msgid')) {
      // Starting a new entry; flush the previous one first.
      if (mode === 'str') commit();
      msgid = unquote(line.slice('msgid'.length));
      msgstr = null;
      mode = 'id';
      continue;
    }
    if (line.startsWith('msgstr')) {
      // msgstr or msgstr[0]
      const after = line.replace(/^msgstr(\[\d+\])?/, '');
      if (msgstr === null) msgstr = unquote(after);
      mode = 'str';
      continue;
    }
    if (line.startsWith('"')) {
      const piece = unquote(line);
      if (mode === 'id') msgid = (msgid ?? '') + piece;
      else if (mode === 'str') msgstr = (msgstr ?? '') + piece;
      continue;
    }
  }
  commit();

  return { messages, headers };
}
