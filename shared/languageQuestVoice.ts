export type LanguageQuestVoiceProvider = "voxcpm" | "browser";

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
};

// VoxCPM2's published language list includes these Language Quest languages.
// Mon is deliberately omitted and continues to use an installed browser voice.
const VOXCPM_LANGUAGE_KEYS = new Set([
  "english",
  "spanish",
  "chinese",
  "mandarin",
  "mandarin chinese",
  "burmese",
  "myanmar",
  "french",
  "italian",
  "japanese",
]);

export const LANGUAGE_QUEST_VOICE_MAX_TEXT_LENGTH = 500;

export function normalizeLanguageQuestLanguage(language: unknown): string {
  return typeof language === "string" ? language.trim().toLowerCase() : "";
}

export function languageQuestSpeechLocale(language: string): string {
  const normalized = normalizeLanguageQuestLanguage(language);
  return SPEECH_LOCALES[normalized] || language;
}

export function voxCpmSupportsLanguage(language: unknown): boolean {
  return VOXCPM_LANGUAGE_KEYS.has(normalizeLanguageQuestLanguage(language));
}

export function normalizeLanguageQuestSpeechText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text.length > LANGUAGE_QUEST_VOICE_MAX_TEXT_LENGTH) return null;
  return text;
}
