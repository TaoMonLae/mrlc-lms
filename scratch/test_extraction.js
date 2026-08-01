import fs from 'fs';
import path from 'path';

const srcDir = '/Users/taomonlae/Downloads/mrlc-lms/src';

function walk(dir, filter, callback) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist' && file !== 'build') {
        walk(fullPath, filter, callback);
      }
    } else if (filter(fullPath)) {
      callback(fullPath);
    }
  }
}

const uniqueStrings = new Set();

function addString(str) {
  const collapsed = str.replace(/\s+/g, ' ').trim();
  if (collapsed && collapsed.length > 1 && !/^[0-9\s.,:\-()\[\]{}#$%/\\_*+=?!]+$/.test(collapsed)) {
    if (collapsed.includes('className') || collapsed.includes('import ') || collapsed.startsWith('text-')) {
      return;
    }
    uniqueStrings.add(collapsed);
  }
}

function isValidJsxText(str) {
  if (!str) return false;
  if (/^[0-9\s.,:\-()\[\]{}#$%/\\_*+=?!&;]+$/.test(str)) return false;
  if (str.length <= 1) return false;

  if (str.includes('&&') || str.includes('||') || str.includes('=>') || str.includes('===') || str.includes('!==') || str.includes('==') || str.includes('!=')) return false;
  if (str.startsWith(')') || str.endsWith('(') || str.startsWith('}') || str.endsWith('{') || str.startsWith('(') || str.endsWith(')') || str.endsWith(']') || str.endsWith('}')) return false;
  if (str.startsWith('=') || str.startsWith(':')) return false;
  if (str.includes(') :') || str.includes(') ?') || str.includes('? (') || str.includes(') &&')) return false;
  if (str.includes('return ') || str.includes('import ') || str.includes('export ')) return false;
  if (str.includes('as ') || str.includes('|') || str.includes('Map<') || str.includes('Set<') || str.includes('Record<') || str.includes('Array<')) return false;
  if (str.includes('React.') || str.includes('SVGProps') || str.includes('ChangeEvent')) return false;
  if (/\b(?:true|false|null|undefined|void)\b/.test(str)) return false;

  return true;
}

function unescapeJs(str) {
  return str.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

walk(srcDir, (f) => f.endsWith('.tsx') || f.endsWith('.ts'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Match t('...')
  const tMatches = content.matchAll(/\bt\(\s*(['"`])((?:\\.|[^\\])*?)\1\s*\)/g);
  for (const m of tMatches) {
    addString(unescapeJs(m[2]));
  }

  // 2. Match toast messages
  const toastMatches = content.matchAll(/toast\.(success|error|info|warning)\(\s*(['"`])((?:\\.|[^\\])*?)\2/g);
  for (const m of toastMatches) {
    addString(unescapeJs(m[3]));
  }

  // 3. Match confirm / alert
  const alertMatches = content.matchAll(/(confirm|alert)\(\s*(['"`])((?:\\.|[^\\])*?)\2/g);
  for (const m of alertMatches) {
    addString(unescapeJs(m[3]));
  }

  // 4. Match attributes: placeholder, title, aria-label, alt
  const attrMatches = content.matchAll(/(placeholder|title|aria-label|alt)=\s*(['"])((?:\\.|[^\\])*?)\2/g);
  for (const m of attrMatches) {
    addString(unescapeJs(m[3]));
  }

  // 5. Match static JSX text (only in TSX files)
  if (filePath.endsWith('.tsx')) {
    const jsxTextMatches = content.matchAll(/>\s*([^<>{}\n]+)\s*</g);
    for (const m of jsxTextMatches) {
      const str = m[1].trim();
      if (isValidJsxText(str)) {
        addString(str);
      }
    }
  }

  // 6. Navigation items in navigation.ts
  if (filePath.endsWith('navigation.ts')) {
    const navMatches = content.matchAll(/\b(title|label):\s*(['"`])((?:\\.|[^\\])*?)\2/g);
    for (const m of navMatches) {
      addString(unescapeJs(m[3]));
    }
  }
});

console.log(`Found ${uniqueStrings.size} unique translatable strings in source files.`);

// Let's see how many are new compared to existing my.po entries (which we'll parse)
const poPath = '/Users/taomonlae/Downloads/mrlc-lms/src/i18n/locales/my.po';
const poContent = fs.readFileSync(poPath, 'utf8');

function parsePo(content) {
  const entries = [];
  let header = {};
  let currentComments = [];
  let msgid = null;
  let msgstr = null;
  let mode = null;

  const commit = () => {
    if (msgid !== null && msgstr !== null) {
      if (msgid === '') {
        for (const ln of msgstr.split('\n')) {
          const idx = ln.indexOf(':');
          if (idx > 0) header[ln.slice(0, idx).trim()] = ln.slice(idx + 1).trim();
        }
      } else {
        entries.push({ id: msgid, str: msgstr });
      }
    }
    msgid = null;
    msgstr = null;
    currentComments = [];
    mode = null;
  };

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === '') {
      commit();
      continue;
    }
    if (line.startsWith('#')) continue;
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
  return { header, entries };
}

function unquote(raw) {
  const start = raw.indexOf('"');
  const end = raw.lastIndexOf('"');
  if (start === -1 || end <= start) return '';
  return unescapePo(raw.slice(start + 1, end));
}

function unescapePo(str) {
  return str
    .replace(/\\"/g, '"')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

const { entries } = parsePo(poContent);
const existingMap = new Map();
for (const entry of entries) {
  existingMap.set(entry.id, entry);
}

const newStrings = [];
for (const str of uniqueStrings) {
  if (!existingMap.has(str)) {
    newStrings.push(str);
  }
}

console.log(`Of these, ${newStrings.length} are new/untranslated strings.`);
fs.writeFileSync('/Users/taomonlae/Downloads/mrlc-lms/scratch/new_strings.json', JSON.stringify(newStrings, null, 2), 'utf8');
