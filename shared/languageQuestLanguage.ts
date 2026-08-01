const HAN_CHARACTER_RE = /\p{Script=Han}/u;

/** Lightweight language checks shared with clients that do not need pinyin-pro. */
export function containsHanCharacters(value: string): boolean {
  return HAN_CHARACTER_RE.test(value);
}

export function isChineseLanguage(language: string): boolean {
  const normalized = language.trim().toLocaleLowerCase();
  return normalized.includes('chinese') || normalized.includes('mandarin');
}
