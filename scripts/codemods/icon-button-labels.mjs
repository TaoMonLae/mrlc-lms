#!/usr/bin/env node
/**
 * Finds icon-only buttons without an accessible name and (with --write) adds one.
 *
 * An icon-only button is a <Button size="icon*"> or a <button>/<Button> whose
 * only child is a single icon element (no text). It has an accessible name when
 * it carries aria-label, aria-labelledby, or visually hidden text (sr-only).
 *
 * The label is taken from, in order: the button's `title` attribute, then a
 * mapping from the Lucide icon it renders. Buttons the script cannot name are
 * listed so a person can label them.
 *
 *   node scripts/codemods/icon-button-labels.mjs            # report
 *   node scripts/codemods/icon-button-labels.mjs --write    # add aria-labels
 *   node scripts/codemods/icon-button-labels.mjs --check    # exit 1 if any remain (CI)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const CHECK = args.includes('--check');
const roots = args.filter((a) => !a.startsWith('--'));
const ROOTS = roots.length ? roots : ['src', 'components'];

const ICON_LABELS = {
  X: 'Close', XIcon: 'Close', XCircle: 'Clear',
  Trash: 'Delete', Trash2: 'Delete',
  Pencil: 'Edit', PencilLine: 'Edit', Edit: 'Edit', Edit2: 'Edit', Edit3: 'Edit', SquarePen: 'Edit', PenLine: 'Edit',
  Plus: 'Add', PlusCircle: 'Add', CirclePlus: 'Add',
  Minus: 'Remove', MinusCircle: 'Remove',
  ChevronLeft: 'Previous', ChevronRight: 'Next', ChevronUp: 'Move up', ChevronDown: 'Expand',
  ChevronsLeft: 'First page', ChevronsRight: 'Last page',
  ArrowLeft: 'Back', ArrowRight: 'Next', ArrowUp: 'Move up', ArrowDown: 'Move down',
  MoreHorizontal: 'More actions', MoreVertical: 'More actions', Ellipsis: 'More actions', EllipsisVertical: 'More actions',
  RefreshCw: 'Refresh', RefreshCcw: 'Refresh', RotateCw: 'Refresh', RotateCcw: 'Reset',
  Download: 'Download', Upload: 'Upload', Printer: 'Print', Share: 'Share', Share2: 'Share',
  Eye: 'Show', EyeOff: 'Hide', Search: 'Search', Filter: 'Filter', Settings: 'Settings', Settings2: 'Settings',
  Copy: 'Copy', Check: 'Confirm', Save: 'Save', Send: 'Send', SendHorizontal: 'Send', Paperclip: 'Attach file',
  Smile: 'Add sticker', Image: 'Add image', ImagePlus: 'Add image', Camera: 'Take photo', Mic: 'Record audio', MicOff: 'Stop recording',
  Play: 'Play', Pause: 'Pause', Volume2: 'Play audio', VolumeX: 'Mute', Maximize: 'Full screen', Maximize2: 'Full screen', Minimize: 'Exit full screen', Minimize2: 'Exit full screen',
  ExternalLink: 'Open in new tab', Link: 'Copy link', Link2: 'Copy link', Bell: 'Notifications', Menu: 'Open menu',
  ZoomIn: 'Zoom in', ZoomOut: 'Zoom out', Info: 'More information', HelpCircle: 'Help', CircleHelp: 'Help',
  Calendar: 'Choose date', CalendarDays: 'Choose date', Flag: 'Report', Star: 'Favourite', Heart: 'Like',
  GripVertical: 'Drag to reorder', Archive: 'Archive', Undo: 'Undo', Undo2: 'Undo', Redo: 'Redo', Redo2: 'Redo',
  LogOut: 'Sign out', Sun: 'Switch to light theme', Moon: 'Switch to dark theme', Bookmark: 'Bookmark', MessageSquare: 'Message',
  Lock: 'Lock', Unlock: 'Unlock', Key: 'Reset password', KeyRound: 'Reset password', UserPlus: 'Add user', Mail: 'Email',
  Phone: 'Call', Sparkles: 'Suggest', ListFilter: 'Filter', SlidersHorizontal: 'Filter options', Columns: 'Columns',
  PanelLeft: 'Toggle sidebar', PanelLeftClose: 'Collapse sidebar', PanelLeftOpen: 'Expand sidebar', Home: 'Home',
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const attrsOf = (opening) => opening.attributes.properties.filter(ts.isJsxAttribute);
const attr = (opening, name) => attrsOf(opening).find((a) => a.name.getText() === name);
const hasSpread = (opening) => opening.attributes.properties.some(ts.isJsxSpreadAttribute);

function iconChild(el) {
  const kids = el.children.filter((c) => !(ts.isJsxText(c) && !c.text.trim()));
  if (kids.length !== 1) return null;
  const k = kids[0];
  const tag = ts.isJsxSelfClosingElement(k) ? k.tagName.getText() : ts.isJsxElement(k) ? k.openingElement.tagName.getText() : null;
  if (!tag || !/^[A-Z]/.test(tag) || /Badge|Avatar|Tooltip|Popover|Link|Fragment|Trans|MathText|Text$/.test(tag)) return null;
  return tag;
}

function hasSrOnlyText(el) {
  return /sr-only/.test(el.getText());
}

const results = [];
for (const file of ROOTS.flatMap((r) => walk(r))) {
  const src = readFileSync(file, 'utf8');
  if (!/<(Button|button)\b/.test(src)) continue;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const visit = (node) => {
    let opening = null, element = null;
    if (ts.isJsxElement(node)) { opening = node.openingElement; element = node; }
    else if (ts.isJsxSelfClosingElement(node)) { opening = node; }
    if (opening) {
      const tag = opening.tagName.getText();
      const renderAttr = attr(opening, 'render');
      const rendersIconButton = renderAttr && /<Button\b[^>]*size=["'{][^>]*icon/.test(renderAttr.initializer?.getText() ?? '');
      const isRenderProp = ts.isJsxSelfClosingElement(opening) && ts.isJsxExpression(opening.parent) && ts.isJsxAttribute(opening.parent.parent) && opening.parent.parent.name.getText() === 'render';
      if (((tag === 'Button' || tag === 'button') && !isRenderProp) || (rendersIconButton && element)) {
        const size = attr(opening, 'size');
        const sizeIcon = rendersIconButton || (size && /icon/.test(size.initializer?.getText() ?? ''));
        const icon = element ? iconChild(element) : null;
        const candidate = sizeIcon || Boolean(icon);
        const named = attr(opening, 'aria-label') || attr(opening, 'aria-labelledby') || (rendersIconButton && /aria-label/.test(renderAttr.initializer?.getText() ?? ''));
        if (candidate && !named && !hasSpread(opening) && !(element && hasSrOnlyText(element))) {
          const title = attr(opening, 'title');
          let label = null;
          if (title?.initializer) label = title.initializer.getText();
          else if (icon && ICON_LABELS[icon]) label = JSON.stringify(ICON_LABELS[icon]);
          const { line } = sf.getLineAndCharacterOfPosition(opening.getStart());
          results.push({ file: relative(process.cwd(), file), line: line + 1, icon, label });
          if (label) edits.push({ pos: opening.tagName.getEnd(), text: ` aria-label=${label}` });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (WRITE && edits.length) {
    let out = src;
    for (const e of edits.sort((a, b) => b.pos - a.pos)) out = out.slice(0, e.pos) + e.text + out.slice(e.pos);
    writeFileSync(file, out);
  }
}

const unnamed = results.filter((r) => !r.label);
if (CHECK) {
  for (const r of results) console.log(`${r.file}:${r.line} icon-only button has no accessible name (${r.icon ?? 'size=icon'})`);
  process.exit(results.length ? 1 : 0);
}
console.log(JSON.stringify({ mode: WRITE ? 'write' : 'report', found: results.length, labelled: results.length - unnamed.length, needsManualLabel: unnamed.length }, null, 2));
for (const r of unnamed) console.log(`  ${r.file}:${r.line}  ${r.icon ?? '(size=icon, no single icon child)'}`);
