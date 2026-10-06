#!/usr/bin/env node
/**
 * Fieldbook token codemod.
 *
 * Rewrites generic Tailwind colour and chrome classes in the school app to the
 * School Operations Fieldbook tokens documented in DESIGN.md:
 *   - slate/gray/zinc/neutral text, background, border, divide and ring colours
 *     become theme tokens (foreground, muted-foreground, muted, border, input),
 *     so light and dark themes come from one class instead of a `dark:` pair;
 *   - `dark:` colour variants made redundant by a token are removed;
 *   - large radii (rounded-xl and up) become the base radius (rounded-sm);
 *   - heavy shadows (shadow-md and up) are removed (the app is flat by doctrine);
 *   - purple / indigo / violet / fuchsia become the Fieldbook navy-blue accent;
 *   - 8–10px arbitrary text sizes are raised to the 11px floor.
 *
 * Usage:
 *   node scripts/codemods/fieldbook-tokens.mjs            # dry run, prints a summary
 *   node scripts/codemods/fieldbook-tokens.mjs --write    # rewrites files
 *   node scripts/codemods/fieldbook-tokens.mjs --write src/pages/fees   # limit to paths
 *
 * Games, Learning Quest, printed documents (ID cards, print layouts, exports),
 * the e-book reader, public marketing pages and shadcn primitives are skipped:
 * they have their own design systems or must print with fixed colours.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const targets = args.filter((a) => !a.startsWith('--'));
const roots = targets.length ? targets : ['src/pages', 'src/components'];

const SKIP = [
  /\/games\//,
  /language-quest/i,
  /LanguageQuest/,
  /\/daily-quest\//,
  /Print/,
  /Pdf/,
  /IdentityCard/,
  /OfficialStudentCard/,
  /IdCard/,
  /EbookReader/,
  /src\/pages\/(Landing|About|Login|Signup|ForgotPassword|ResetPassword|NotFound|MonLanguage)\.tsx$/,
  /src\/pages\/news\//,
];

const NEUTRAL = '(?:slate|gray|zinc|neutral)';
const VARIANT = '((?:[a-z0-9-]+:|data-[a-z-]+:|\\[[^\\]\\s]+\\]:)*)';
const BOUND_L = '(?<=^|[\\s\'"`{(,])';
const BOUND_R = '(?=$|[\\s\'"`}),])';

/** Map one neutral shade for a property to a Fieldbook token (or null = leave). */
function tokenFor(prop, shade, opacity) {
  const n = Number(shade);
  const op = opacity ? `/${opacity}` : '';
  switch (prop) {
    case 'text':
    case 'placeholder':
    case 'marker':
    case 'fill':
    case 'stroke':
      if (n >= 700) return `${prop}-foreground${op}`;
      if (n >= 400) return `${prop}-muted-foreground${op}`;
      return null; // light text sits on dark panels; leave it
    case 'bg':
      if (n <= 50) return `bg-muted/${opacity ? Math.max(10, Math.round(Number(opacity) * 0.6)) : 50}`;
      if (n <= 200) return `bg-muted${op}`;
      if (n === 300) return `bg-input${op}`;
      if (n <= 500) return `bg-muted-foreground${op}`;
      return null; // dark panels (video, overlays) keep their colour
    case 'border':
    case 'divide':
    case 'ring':
    case 'outline':
      if (n <= 200) return `${prop}-border${op}`;
      if (n <= 400) return `${prop}-input${op}`;
      if (n >= 800) return `${prop}-foreground${op}`;
      return `${prop}-input${op}`;
    default:
      return null;
  }
}

const COLOR_WORDS =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black|transparent|current|inherit|foreground|background|muted|muted-foreground|card|card-foreground|primary|primary-foreground|secondary|secondary-foreground|accent|accent-foreground|destructive|border|input|ring|popover|academic-[a-z-]+|aubergine|magenta|accent-[a-z-]+|linkblue|fieldbook-[a-z]+|sidebar[a-z-]*|chart-[0-9]';
const COLOR_CLASS = new RegExp(`^(text|bg|border|divide|ring|placeholder|fill|stroke|outline)-(?:${COLOR_WORDS})(?:-[0-9]+)?(?:/[0-9]+)?$|^(text|bg|border|divide|ring|placeholder|fill|stroke|outline)-\\[#`);
const TOKEN_CLASS = /^(text|bg|border|divide|ring|placeholder|fill|stroke|outline)-(foreground|muted|muted-foreground|border|input|card|background|secondary)(\/[0-9]+)?$/;

const stats = { files: 0, changed: 0, colors: 0, darkDropped: 0, radius: 0, shadow: 0, purple: 0, tiny: 0, bgWhite: 0 };

function splitVariant(cls) {
  const m = cls.match(/^((?:[^:\s]+:)*)(.*)$/);
  return { variant: m[1], base: m[2] };
}

/** Step 1: context-free class rewrites. */
function rewriteClasses(src) {
  // Neutral colours -> tokens
  const neutralRe = new RegExp(
    `${BOUND_L}${VARIANT}(text|bg|border|divide|ring|placeholder|marker|fill|stroke|outline)-${NEUTRAL}-([0-9]{2,3})(?:/([0-9]+))?${BOUND_R}`,
    'g',
  );
  src = src.replace(neutralRe, (whole, variant, prop, shade, opacity) => {
    if (/(^|:)dark:/.test(variant)) return whole; // handled in step 2
    const token = tokenFor(prop, shade, opacity);
    if (!token) return whole;
    stats.colors++;
    return variant + token;
  });

  // Large radii -> base radius (keep rounded-full for avatars, dots and pills)
  src = src.replace(
    new RegExp(`${BOUND_L}${VARIANT}rounded(-[trbl]{1,2}|-[se]{1,2})?-(xl|2xl|3xl)${BOUND_R}`, 'g'),
    (whole, variant, side = '') => {
      stats.radius++;
      return `${variant}rounded${side}-sm`;
    },
  );

  // Heavy shadows -> removed (flat by doctrine); also drop coloured shadow tints
  src = src.replace(
    new RegExp(`${BOUND_L}${VARIANT}shadow-(md|lg|xl|2xl|inner|[a-z]+-[0-9]{2,3}(?:/[0-9]+)?)${BOUND_R}`, 'g'),
    (whole, variant) => {
      stats.shadow++;
      return `${variant}shadow-none`;
    },
  );

  // Purple family -> Fieldbook navy-blue accent (accent-purple / academic tokens)
  src = src.replace(
    new RegExp(`${BOUND_L}${VARIANT}(text|bg|border|ring|from|to|via|fill|stroke|divide|outline)-(?:purple|indigo|violet|fuchsia)-([0-9]{2,3})(?:/([0-9]+))?${BOUND_R}`, 'g'),
    (whole, variant, prop, shade, opacity) => {
      if (/(^|:)dark:/.test(variant)) {
        stats.purple++;
        return DROP;
      }
      const n = Number(shade);
      const op = opacity ? `/${opacity}` : '';
      stats.purple++;
      if (prop === 'bg' && n <= 100) return `${variant}bg-lavender${op}`;
      if (prop === 'bg' && n <= 300) return `${variant}bg-academic-sky/20`;
      if (prop === 'border' && n <= 300) return `${variant}border-border${op}`;
      if (prop === 'ring' && n <= 300) return `${variant}ring-border${op}`;
      return `${variant}${prop}-accent-purple${op}`;
    },
  );

  // 8–10px text -> 11px floor
  src = src.replace(new RegExp(`${BOUND_L}${VARIANT}text-\\[(8|9|10)px\\]${BOUND_R}`, 'g'), (whole, variant) => {
    stats.tiny++;
    return `${variant}text-[11px]`;
  });
  return src;
}

const DROP = '\u0000';
let SKIP_BARE_WHITE = false;

/** Decide which dark: classes in one class-string scope are redundant; return the scope with DROP markers. */
function markDarkInScope(text) {
  if (!/dark:/.test(text)) return text;
  const words = text.match(/[^\s'"`{}()?,]+/g) || [];
  const tokenSlots = new Set();
  const otherSlots = new Set();
  for (const c of words) {
    const { variant, base } = splitVariant(c);
    if (/(^|:)dark:/.test(variant)) continue;
    const prop = base.split('-')[0];
    if (TOKEN_CLASS.test(base)) tokenSlots.add(variant + '|' + prop);
    else if (COLOR_CLASS.test(base)) otherSlots.add(variant + '|' + prop);
  }
  const darkRe = new RegExp(
    `${BOUND_L}((?:[^\\s:'"\`]+:)*dark:(?:[^\\s:'"\`]+:)*)(text|bg|border|divide|ring|placeholder|fill|stroke|outline)-(?:${NEUTRAL}-[0-9]{2,3}(?:/[0-9]+)?|white|black|surface-indigo|surface-raised|canvas)(?:/[0-9]+)?${BOUND_R}`,
    'g',
  );
  return text.replace(darkRe, (whole, variant, prop) => {
    const lightVariant = variant.replace(/(^|:)dark:/, '$1');
    const slot = lightVariant + '|' + prop;
    if (tokenSlots.has(slot) || !otherSlots.has(slot)) {
      stats.darkDropped++;
      return DROP;
    }
    return whole;
  });
}

/** Step 2: drop dark: colour variants a token now covers. Scope = one quoted string, or the static parts of one template. */
function dropRedundantDark(src) {
  src = src.replace(/(["'])((?:(?!\1)[^\\\n]|\\.)*)\1/g, (whole, q, body) => q + markDarkInScope(body) + q);
  src = src.replace(/`((?:[^`\\]|\\.)*)`/g, (whole, body) => {
    const pieces = body.split(/(\$\{[^}]*\})/);
    const staticText = pieces.filter((p, i) => i % 2 === 0).join(' ');
    if (!/dark:/.test(staticText)) return whole;
    return '`' + pieces.map((p, i) => (i % 2 === 0 ? markDarkInScope(p) : p)).join('') + '`';
  });
  return src;
}

/** Remove DROP markers together with one neighbouring space. */
function sweep(src) {
  return src.replace(/[ \t]\u0000/g, '').replace(/\u0000[ \t]?/g, '');
}

/** Step 2a: bg-white -> bg-card where the same literal handled a dark surface explicitly. */
function whiteSurfaces(src) {
  const literal = /(["'])((?:(?!\1)[^\\\n]|\\.)*)\1/g;
  return src.replace(literal, (whole, q, body) => {
    if (!/(^|\s)bg-white(\s|$)/.test(body)) return whole;
    const pairedDark = /(^|\s)dark:bg-(?:(?:slate|gray|zinc|neutral)-[0-9]|black|surface-indigo|canvas)/.test(body);
    // A bare white surface (bordered or padded panel/field) with no dark handling renders white in dark mode.
    const bareSurface =
      !/(^|\s)dark:bg-/.test(body) &&
      !/rounded-full|text-white|(^|\s)bg-white\//.test(body) &&
      /(^|\s)(border|border-[a-z]+|p[xytblr]?-[0-9.]+|rounded-sm|rounded-md|rounded-lg|rounded)(\s|$)/.test(body);
    if (!pairedDark && !(bareSurface && !SKIP_BARE_WHITE)) return whole;
    stats.bgWhite++;
    return q + body.replace(/(^|\s)bg-white(?=\s|$)/g, '$1bg-card') + q;
  });
}

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, files);
    else if (/\.(tsx|ts)$/.test(name)) files.push(p);
  }
  return files;
}

const files = roots.flatMap((r) => (statSync(r).isDirectory() ? walk(r) : [r]));
for (const file of files) {
  const rel = relative(ROOT, file);
  if (SKIP.some((re) => re.test(rel))) continue;
  stats.files++;
  const before = readFileSync(file, 'utf8');
  SKIP_BARE_WHITE = /qrcode|QRCode|<canvas|SignaturePad/.test(before);
  let after = rewriteClasses(before);
  after = whiteSurfaces(after);
  after = dropRedundantDark(after);
  after = sweep(after);
  if (after !== before) {
    stats.changed++;
    if (WRITE) writeFileSync(file, after);
  }
}

console.log(JSON.stringify({ mode: WRITE ? 'write' : 'dry-run', ...stats }, null, 2));
