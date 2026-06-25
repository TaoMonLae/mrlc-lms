import { parsePo } from './po';

export interface Language {
  code: string;
  /** Human-readable name, taken from the .po "Language-Team" header or the code. */
  label: string;
  /** msgid -> msgstr */
  messages: Record<string, string>;
}

// Auto-discovery: every .po file under ./locales becomes a selectable language.
// Drop in `fr.po` and French appears in the switcher automatically — no code
// changes required. The file's base name is the language code.
const files = import.meta.glob('./locales/*.po', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

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
  const langs: Language[] = [];
  for (const [path, raw] of Object.entries(files)) {
    const code = path.split('/').pop()!.replace(/\.po$/, '');
    const { messages, headers } = parsePo(raw);
    const label =
      KNOWN_NAMES[code] ||
      headers['Language-Team'] ||
      headers['Language'] ||
      code.toUpperCase();
    langs.push({ code, label, messages });
  }
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
