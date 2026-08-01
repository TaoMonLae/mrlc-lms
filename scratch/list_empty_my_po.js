import fs from 'fs';
import path from 'path';

const poPath = '/Users/taomonlae/Downloads/mrlc-lms/src/i18n/locales/my.po';
const content = fs.readFileSync(poPath, 'utf8');

function unescapePo(str) {
  return str
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

function unquote(raw) {
  const start = raw.indexOf('"');
  const end = raw.lastIndexOf('"');
  if (start === -1 || end <= start) return '';
  return unescapePo(raw.slice(start + 1, end));
}

const entries = [];
let msgid = null;
let msgstr = null;
let mode = null;

const commit = () => {
  if (msgid !== null && msgstr !== null) {
    if (msgid !== '') {
      entries.push({ id: msgid, str: msgstr });
    }
  }
  msgid = null;
  msgstr = null;
  mode = null;
};

const lines = content.split(/\r?\n/);
for (const rawLine of lines) {
  const line = rawLine.trim();
  if (line === '') {
    commit();
    continue;
  }
  if (line.startsWith('#')) {
    continue;
  }
  if (line.startsWith('msgid')) {
    if (mode === 'str') commit();
    msgid = unquote(line.slice(5));
    mode = 'id';
    continue;
  }
  if (line.startsWith('msgstr')) {
    const after = line.replace(/^msgstr(\[\d+\])?/, '');
    msgstr = unquote(after);
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

const emptyEntries = entries.filter(e => e.str === '');
console.log(`Found ${emptyEntries.length} empty translation entries.`);
fs.writeFileSync('/Users/taomonlae/Downloads/mrlc-lms/scratch/empty_my_po.json', JSON.stringify(emptyEntries, null, 2), 'utf8');
