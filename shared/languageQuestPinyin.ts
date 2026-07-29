import { convert, pinyin } from "pinyin-pro";

const HAN_CHARACTER_RE = /\p{Script=Han}/u;

/** True if the string contains at least one Chinese (Han) character. */
export function containsHanCharacters(value: string): boolean {
  return HAN_CHARACTER_RE.test(value);
}

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

/**
 * Convert CC-CEDICT-style numbered pinyin (e.g. "ni3 hao3", tone 5 = neutral,
 * "u:" for u-umlaut) into tone-mark display form (e.g. "nǐ hǎo"). CEDICT's
 * "u:" spelling isn't recognised by pinyin-pro's own numbered-tone parser, and
 * neutral tone (5) is left untouched by it rather than dropped, so both are
 * normalized here before handing each syllable to pinyin-pro's converter.
 */
export function formatCedictPinyin(rawPinyin: string): string {
  return rawPinyin
    .split(" ")
    .map((syllable) => {
      const withUmlaut = syllable.replace(/u:/gi, (match) => (match[0] === "U" ? "V" : "v"));
      if (/5$/.test(withUmlaut)) return withUmlaut.replace(/5$/, "");
      return convert(withUmlaut, { format: "numToSymbol" });
    })
    .join(" ");
}
