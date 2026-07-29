import { createContext, useContext, useEffect, useMemo, useState } from 'react';

interface LanguageQuestPreferencesValue {
  soundEnabled: boolean;
  reducedMotion: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
}

const PreferencesContext = createContext<LanguageQuestPreferencesValue | null>(null);

function storedBoolean(key: string, fallback: boolean): boolean {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  } catch {
    return fallback;
  }
}

function storeBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Keep the in-memory preference usable when storage is unavailable.
  }
}

export function LanguageQuestPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(() => storedBoolean('lq-sound-enabled', true));
  const [reducedMotion, setReducedMotionState] = useState(() => storedBoolean(
    'lq-reduced-motion',
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  ));

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    storeBoolean('lq-sound-enabled', enabled);
  };
  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    storeBoolean('lq-reduced-motion', enabled);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('lq-reduced-motion', reducedMotion);
    return () => document.documentElement.classList.remove('lq-reduced-motion');
  }, [reducedMotion]);

  const value = useMemo(
    () => ({ soundEnabled, reducedMotion, setSoundEnabled, setReducedMotion }),
    [soundEnabled, reducedMotion],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useLanguageQuestPreferences(): LanguageQuestPreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useLanguageQuestPreferences must be used inside LanguageQuestPreferencesProvider');
  return value;
}
