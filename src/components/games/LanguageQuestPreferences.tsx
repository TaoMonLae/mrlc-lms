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

export function LanguageQuestPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [soundEnabled, setSoundEnabledState] = useState(() => storedBoolean('lq-sound-enabled', true));
  const [reducedMotion, setReducedMotionState] = useState(() => storedBoolean(
    'lq-reduced-motion',
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  ));

  const setSoundEnabled = (enabled: boolean) => {
    setSoundEnabledState(enabled);
    window.localStorage.setItem('lq-sound-enabled', String(enabled));
  };
  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    window.localStorage.setItem('lq-reduced-motion', String(enabled));
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

let successAudioContext: AudioContext | null = null;

export function playLanguageQuestSuccessSound() {
  try {
    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = successAudioContext ?? new AudioContextClass();
    successAudioContext = context;
    if (context.state === 'suspended') void context.resume();
    const start = context.currentTime;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.09;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.1, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.25);
    });
  } catch {
    // Visual feedback remains available when Web Audio is unavailable.
  }
}
