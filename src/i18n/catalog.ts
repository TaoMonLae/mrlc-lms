import { parsePo } from './po';

export interface Language {
  code: string;
  /** Human-readable name shown in the language switcher. */
  label: string;
}

// Auto-discovery: every .po file under ./locales becomes a selectable language.
// Drop in `fr.po` and French appears in the switcher automatically — no code
// changes required. The file's base name is the language code.
const files = import.meta.glob('./locales/*.po', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

// Friendly display names for common codes; falls back to the .po header/code.
const KNOWN_NAMES: Record<string, string> = {
  en: 'English',
  my: 'မြန်မာ (Burmese)',
  mnw: 'ဘာသာမန် (Mon)',
  th: 'ไทย (Thai)',
  km: 'ខ្មែរ (Khmer)',
  fr: 'Français',
  es: 'Español',
  ar: 'العربية',
};

function buildLanguages(): Language[] {
  const langs: Language[] = Object.keys(files).map((path) => {
    const code = path.split('/').pop()!.replace(/\.po$/, '');
    return { code, label: KNOWN_NAMES[code] || code.toUpperCase() };
  });
  // English first, then alphabetical by label.
  langs.sort((a, b) => {
    if (a.code === 'en') return -1;
    if (b.code === 'en') return 1;
    return a.label.localeCompare(b.label);
  });
  return langs;
}

export const LANGUAGES: Language[] = buildLanguages();

export const DEFAULT_LANGUAGE = 'en';

export function getLanguage(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

const messageCache = new Map<string, Promise<Record<string, string>>>();

/** Load and parse a catalog only when its language is selected. */
export function loadLanguageMessages(code: string): Promise<Record<string, string>> {
  if (code === DEFAULT_LANGUAGE) return Promise.resolve({});

  const existing = messageCache.get(code);
  if (existing) return existing;

  const path = Object.keys(files).find((file) => file.endsWith(`/${code}.po`));
  if (!path) return Promise.resolve({});

  const pending = files[path]().then((raw) => parsePo(raw).messages);
  messageCache.set(code, pending);
  return pending;
}
