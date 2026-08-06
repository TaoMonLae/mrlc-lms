import fs from 'fs';
import path from 'path';

const workspaceDir = '/Users/taomonlae/Downloads/mrlc-lms';
const myPoPath = path.join(workspaceDir, 'src', 'i18n', 'locales', 'my.po');
const mnwPoPath = path.join(workspaceDir, 'src', 'i18n', 'locales', 'mnw.po');
const courseStringsPath = path.join(workspaceDir, 'scratch', 'course_strings.json');

const courseStrings = JSON.parse(fs.readFileSync(courseStringsPath, 'utf8'));

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

function parsePo(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const entries = new Map();
  let msgid = null;
  let msgstr = null;
  let mode = null;

  const commit = () => {
    if (msgid !== null && msgstr !== null) {
      if (msgid !== '') {
        entries.set(msgid.replace(/\s+/g, ' ').trim(), msgstr);
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
  return entries;
}

const myMap = parsePo(myPoPath);
const mnwMap = parsePo(mnwPoPath);

const missingMy = [];
const missingMnw = [];

for (const str of courseStrings) {
  const myVal = myMap.get(str);
  if (!myVal) {
    missingMy.push(str);
  }
  const mnwVal = mnwMap.get(str);
  if (!mnwVal) {
    missingMnw.push(str);
  }
}

fs.writeFileSync(path.join(workspaceDir, 'scratch', 'missing_my_course_strings.json'), JSON.stringify(missingMy, null, 2), 'utf8');
fs.writeFileSync(path.join(workspaceDir, 'scratch', 'missing_mnw_course_strings.json'), JSON.stringify(missingMnw, null, 2), 'utf8');

console.log(`Burmese (my.po) is missing ${missingMy.length} / ${courseStrings.length} course strings.`);
console.log(`Mon (mnw.po) is missing ${missingMnw.length} / ${courseStrings.length} course strings.`);
