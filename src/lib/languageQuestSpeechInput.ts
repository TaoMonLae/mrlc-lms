// Thin wrapper around the browser's Web Speech API (SpeechRecognition), used
// to let a learner speak their answer instead of typing it. This is entirely
// client-side and optional -- browsers without support (older Safari,
// Firefox) simply never see the microphone button, and nothing else about
// the lesson flow depends on it. The recognized transcript is fed straight
// into the same text input the learner would have typed into, so it's
// checked by the exact same `languageQuestAnswerMatches` logic (Hanzi or
// pinyin) with no separate scoring path to keep in sync.

export function languageQuestSpeechInputSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/**
 * Maps a Learning Quest course language to a BCP-47 speech recognition
 * locale. Originally written for Chinese only; now covers every language
 * with a Learning Quest course so the spoken-answer option (spelling and
 * sentence practice) can be offered broadly rather than gated to one
 * language. Anything not explicitly listed falls back to en-US, which still
 * lets the browser attempt recognition (imperfectly) rather than hiding the
 * mic entirely.
 */
export function languageQuestSpeechLocale(language: string): string {
  const normalized = language.trim().toLowerCase();
  if (normalized.includes("chinese") || normalized.includes("mandarin")) return "zh-CN";
  if (normalized.includes("spanish")) return "es-ES";
  if (normalized.includes("burmese") || normalized.includes("myanmar")) return "my-MM";
  if (normalized.includes("malay") || normalized.includes("bahasa")) return "ms-MY";
  return "en-US";
}

export interface LanguageQuestSpeechSession {
  stop: () => void;
}

/**
 * Starts listening once and resolves with the recognized transcript (or an
 * error message). Returns null immediately if the browser has no speech
 * recognition support at all, so callers can feature-detect before offering
 * the microphone button in the first place.
 */
export function listenForLanguageQuestSpeech(
  locale: string,
  callbacks: { onResult: (transcript: string) => void; onEnd: () => void; onError: (message: string) => void },
): LanguageQuestSpeechSession | null {
  const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = locale;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const transcript = event.results?.[0]?.[0]?.transcript ?? "";
    callbacks.onResult(transcript);
  };
  recognition.onerror = (event: any) => {
    const message = event?.error === "not-allowed" || event?.error === "service-not-allowed"
      ? "Microphone access was blocked"
      : "Could not hear that clearly -- try again";
    callbacks.onError(message);
  };
  recognition.onend = () => callbacks.onEnd();

  try {
    recognition.start();
  } catch {
    return null;
  }
  return { stop: () => recognition.stop() };
}
