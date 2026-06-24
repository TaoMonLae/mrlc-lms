import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { LANGUAGES, DEFAULT_LANGUAGE, getLanguage, type Language } from './catalog';
import { DomTranslator } from './domTranslator';

const STORAGE_KEY = 'mrlc-lms-lang';

interface I18nContextValue {
  lang: string;
  languages: Language[];
  setLang: (code: string) => void;
  /** Translate a known source string; falls back to the source (or `fallback`). */
  t: (source: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLang(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && getLanguage(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LANGUAGE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(readStoredLang);
  const translatorRef = useRef<DomTranslator | null>(null);

  const messages = useMemo(
    () => getLanguage(lang)?.messages ?? {},
    [lang]
  );

  // Set up the DOM translator once.
  useEffect(() => {
    const translator = new DomTranslator(document.body);
    translatorRef.current = translator;
    translator.setCatalog(messages);
    translator.start();
    return () => translator.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to language changes: update catalog, re-translate, persist, set <html lang>.
  useEffect(() => {
    const translator = translatorRef.current;
    if (translator) {
      translator.setCatalog(messages);
      translator.refresh();
    }
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang, messages]);

  const setLang = useCallback((code: string) => {
    if (getLanguage(code)) setLangState(code);
  }, []);

  const t = useCallback(
    (source: string, fallback?: string) => {
      if (lang === DEFAULT_LANGUAGE) return source;
      const key = source.replace(/\s+/g, ' ').trim();
      return messages[key] ?? fallback ?? source;
    },
    [lang, messages]
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, languages: LANGUAGES, setLang, t }),
    [lang, setLang, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback if used outside the provider (e.g. isolated tests).
    return {
      lang: DEFAULT_LANGUAGE,
      languages: LANGUAGES,
      setLang: () => {},
      t: (s: string) => s,
    };
  }
  return ctx;
}

/** Convenience hook returning just the translate function. */
export function useT() {
  return useI18n().t;
}
