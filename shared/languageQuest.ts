export const LANGUAGE_QUEST_MAX_HEARTS = 5;
export const LANGUAGE_QUEST_FIRST_CLEAR_POINTS = 10;
export const LANGUAGE_QUEST_PRACTICE_POINTS = 2;
export const LANGUAGE_QUEST_TIME_ZONE = "Asia/Kuala_Lumpur";

export function languageQuestDayKey(
  value: Date,
  timeZone = LANGUAGE_QUEST_TIME_ZONE,
): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function nextLanguageQuestStreak(input: {
  currentStreak: number;
  bestStreak: number;
  lastPlayedDate: Date | null;
  now: Date;
  timeZone?: string;
}): { currentStreak: number; bestStreak: number; countsAsNewDay: boolean } {
  const timeZone = input.timeZone ?? LANGUAGE_QUEST_TIME_ZONE;
  const today = languageQuestDayKey(input.now, timeZone);
  const previous = input.lastPlayedDate
    ? languageQuestDayKey(input.lastPlayedDate, timeZone)
    : null;

  if (previous === today) {
    return {
      currentStreak: input.currentStreak,
      bestStreak: input.bestStreak,
      countsAsNewDay: false,
    };
  }

  const dayDifference = previous
    ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`)) / 86_400_000)
    : Number.POSITIVE_INFINITY;
  const currentStreak = dayDifference === 1 ? input.currentStreak + 1 : 1;
  return {
    currentStreak,
    bestStreak: Math.max(input.bestStreak, currentStreak),
    countsAsNewDay: true,
  };
}

/** Normalise learner-entered sentences without making punctuation a barrier. */
export function normalizeSentenceAnswer(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.,!?;:()[\]{}"…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sentenceAnswerMatches(answer: string, modelSentence: string): boolean {
  return normalizeSentenceAnswer(answer) === normalizeSentenceAnswer(modelSentence);
}

/**
 * Removes study-only clues before a challenge reaches quiz or spelling mode.
 * Imported vocabulary courses may keep pronunciation and example sentences in
 * their source prompt for the learn phase, but those clues can spell out or
 * strongly reveal the correct option during assessment.
 */
export function languageQuestPracticePrompt(value: string): string {
  const prompt = value
    .split(/\s*\b(?:Pronunciation|Example)\s*:/iu, 1)[0]
    .replace(/\s+/g, " ")
    .trim();
  return prompt || "Choose the best answer.";
}

const LANGUAGE_QUEST_MYANMAR_SCRIPT_RE = /[က-႟]/;
const LANGUAGE_QUEST_HAN_SCRIPT_RE = /\p{Script=Han}/u;

/** Extract one dictionary-friendly term from highlighted lesson text. */
export function languageQuestLookupWord(selected: string): string | null {
  const text = selected.normalize('NFC').trim();
  if (!text) return null;
  if (LANGUAGE_QUEST_MYANMAR_SCRIPT_RE.test(text)) return text.slice(0, 60);
  if (LANGUAGE_QUEST_HAN_SCRIPT_RE.test(text)) {
    // Highlighting Hanzi can pick up interspersed Latin punctuation/pinyin
    // from the lesson text; keep only the Han characters themselves so the
    // dictionary is queried with a clean headword.
    const hanOnly = Array.from(text).filter((ch) => LANGUAGE_QUEST_HAN_SCRIPT_RE.test(ch)).join('');
    return hanOnly.slice(0, 20) || null;
  }
  return text.match(/[A-Za-z][A-Za-z'-]*/)?.[0] ?? null;
}
