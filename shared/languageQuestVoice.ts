export type LanguageQuestVoiceProvider = "kokoro" | "browser";

const SPEECH_LOCALES: Record<string, string> = {
  english: "en-US",
  spanish: "es-ES",
  chinese: "zh-CN",
  mandarin: "zh-CN",
  "mandarin chinese": "zh-CN",
  burmese: "my-MM",
  myanmar: "my-MM",
  mon: "mnw-MM",
  french: "fr-FR",
  italian: "it-IT",
  japanese: "ja-JP",
  malay: "ms-MY",
  "bahasa melayu": "ms-MY",
};

export interface LanguageQuestKokoroVoice {
  // Kokoro-82M groups its voices by a single-letter language code
  // (see https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md).
  langCode: string;
  // The highest "Overall Grade" named voice published for that language code.
  voice: string;
}

// Kokoro-82M's published voice list (VOICES.md) covers these Language Quest
// languages. It has no Burmese/Myanmar voice, so Burmese continues to use an
// installed browser voice, same as Mon already does.
const KOKORO_VOICE_BY_LANGUAGE: Record<string, LanguageQuestKokoroVoice> = {
  english: { langCode: "a", voice: "af_heart" },
  spanish: { langCode: "e", voice: "ef_dora" },
  chinese: { langCode: "z", voice: "zf_xiaoxiao" },
  mandarin: { langCode: "z", voice: "zf_xiaoxiao" },
  "mandarin chinese": { langCode: "z", voice: "zf_xiaoxiao" },
  french: { langCode: "f", voice: "ff_siwis" },
  italian: { langCode: "i", voice: "if_sara" },
  japanese: { langCode: "j", voice: "jf_alpha" },
};

export const LANGUAGE_QUEST_VOICE_MAX_TEXT_LENGTH = 500;

export function normalizeLanguageQuestLanguage(language: unknown): string {
  return typeof language === "string" ? language.trim().toLowerCase() : "";
}

export function languageQuestSpeechLocale(language: string): string {
  const normalized = normalizeLanguageQuestLanguage(language);
  return SPEECH_LOCALES[normalized] || language;
}

export function kokoroSupportsLanguage(language: unknown): boolean {
  return normalizeLanguageQuestLanguage(language) in KOKORO_VOICE_BY_LANGUAGE;
}

export function languageQuestKokoroVoice(language: unknown): LanguageQuestKokoroVoice | null {
  return KOKORO_VOICE_BY_LANGUAGE[normalizeLanguageQuestLanguage(language)] ?? null;
}

export function normalizeLanguageQuestSpeechText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > LANGUAGE_QUEST_VOICE_MAX_TEXT_LENGTH) return null;
  return text;
}
