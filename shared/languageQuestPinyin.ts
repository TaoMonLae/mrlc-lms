import { pinyin } from "pinyin-pro";

const HAN_CHARACTER_RE = /\p{Script=Han}/u;

export function isChineseLanguage(language: string): boolean {
  const normalized = language.trim().toLocaleLowerCase();
  return normalized.includes("chinese") || normalized.includes("mandarin");
}

/**
 * Return one display token per Unicode character so the lesson UI can place
 * each pronunciation directly beneath its matching Hanzi.
 */
export function languageQuestPinyin(
  value: string,
  language: string,
): string[] | null {
  if (!isChineseLanguage(language) || !HAN_CHARACTER_RE.test(value)) return null;

  const characters = Array.from(value);
  const tokens = pinyin(value, { toneType: "symbol", type: "array" });
  return tokens.length === characters.length ? tokens : null;
}
