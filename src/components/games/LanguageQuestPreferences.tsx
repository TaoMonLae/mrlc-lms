import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { LanguageQuestVoiceProvider } from '@/shared/languageQuestVoice';

interface LanguageQuestPreferencesValue {
  soundEnabled: boolean;
  reducedMotion: boolean;
  voiceProvider: LanguageQuestVoiceProvider;
  setSoundEnabled: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setVoiceProvider: (provider: LanguageQuestVoiceProvider) => void;
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

function storedVoiceProvider(): LanguageQuestVoiceProvider {
  try {
    // Any legacy stored value (e.g. the old "voxcpm" provider) other than
    // "browser" falls through to the current default provider.
    return window.localStorage.getItem('lq-voice-provider') === 'browser' ? 'browser' : 'kokoro';
  } catch {
    return 'kokoro';
  }
}

export function LanguageQuestPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(() => storedBoolean('lq-sound-enabled', true));
  const [reducedMotion, setReducedMotionState] = useState(() => storedBoolean(
    'lq-reduced-motion',
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  ));
  const [voiceProvider, setVoiceProviderState] = useState<LanguageQuestVoiceProvider>(storedVoiceProvider);

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    storeBoolean('lq-sound-enabled', enabled);
  };
  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    storeBoolean('lq-reduced-motion', enabled);
  };
  const setVoiceProvider = (provider: LanguageQuestVoiceProvider) => {
    setVoiceProviderState(provider);
    try {
      window.localStorage.setItem('lq-voice-provider', provider);
    } catch {
      // Keep the in-memory preference usable when storage is unavailable.
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle('lq-reduced-motion', reducedMotion);
    return () => document.documentElement.classList.remove('lq-reduced-motion');
  }, [reducedMotion]);

  const value = useMemo(
    () => ({ soundEnabled, reducedMotion, voiceProvider, setSoundEnabled, setReducedMotion, setVoiceProvider }),
    [soundEnabled, reducedMotion, voiceProvider],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useLanguageQuestPreferences(): LanguageQuestPreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('useLanguageQuestPreferences must be used inside LanguageQuestPreferencesProvider');
  return value;
}
