import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceDir = path.resolve(__dirname, '..');
const srcDir = path.join(workspaceDir, 'src');
const localesDir = path.join(srcDir, 'i18n', 'locales');

// Helper to escape double quotes and backslashes for PO format
function escapePo(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Helper to unescape from PO format quotes
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

function parsePo(content) {
  const entries = [];
  let header = {};
  let currentComments = [];
  let msgid = null;
  let msgstr = null;
  let mode = null; // 'id' or 'str'

  const commit = () => {
    if (msgid !== null && msgstr !== null) {
      if (msgid === '') {
        // Parse header metadata
        for (const ln of msgstr.split('\n')) {
          const idx = ln.indexOf(':');
          if (idx > 0) header[ln.slice(0, idx).trim()] = ln.slice(idx + 1).trim();
        }
      } else {
        entries.push({ id: msgid, str: msgstr, comments: [...currentComments] });
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
    if (line.startsWith('#')) {
      currentComments.push(rawLine);
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
  return { header, entries };
}

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
    // Exclude strings that look like import statements, HTML classNames or system tags
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
  return true;
}

console.log('Extracting UI strings from source code...');

walk(srcDir, (f) => f.endsWith('.tsx') || f.endsWith('.ts'), (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Match t('...')
  const tMatches = content.matchAll(/t\(\s*(['"`])((?:\\.|[^\\])*?)\1\s*\)/g);
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

  // 5. Match static JSX text
  const jsxTextMatches = content.matchAll(/>\s*([^<>{}\n]+)\s*</g);
  for (const m of jsxTextMatches) {
    const str = m[1].trim();
    if (isValidJsxText(str)) {
      addString(str);
    }
  }
});

function unescapeJs(str) {
  return str.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
}

console.log(`Found ${uniqueStrings.size} unique translatable strings in source files.`);

// Update PO files
const poFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.po'));

for (const poFileName of poFiles) {
  const poFilePath = path.join(localesDir, poFileName);
  console.log(`Processing ${poFileName}...`);
  const poContent = fs.readFileSync(poFilePath, 'utf8');
  const { header, entries } = parsePo(poContent);
  
  const existingMap = new Map();
  for (const entry of entries) {
    existingMap.set(entry.id, entry);
  }
  
  const mergedEntries = [];
  let addedCount = 0;
  
  // First, add all existing entries in their original order
  for (const entry of entries) {
    mergedEntries.push(entry);
  }
  
  // Then, append any newly discovered strings
  for (const str of uniqueStrings) {
    if (!existingMap.has(str)) {
      mergedEntries.push({
        id: str,
        str: '',
        comments: ['# Extracted string']
      });
      addedCount++;
    }
  }
  
  // Build file content
  let output = '';
  output += `msgid ""\n`;
  output += `msgstr ""\n`;
  for (const [k, v] of Object.entries(header)) {
    output += `"${k}: ${escapePo(v)}\\n"\n`;
  }
  output += '\n';
  
  for (const entry of mergedEntries) {
    for (const c of entry.comments) {
      output += `${c}\n`;
    }
    output += `msgid "${escapePo(entry.id)}"\n`;
    output += `msgstr "${escapePo(entry.str)}"\n\n`;
  }
  
  fs.writeFileSync(poFilePath, output, 'utf8');
  console.log(`Updated ${poFileName}: added ${addedCount} new strings. Total strings: ${mergedEntries.length}`);
}

console.log('PO files updated successfully.');
