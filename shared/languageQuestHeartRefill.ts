export const LANGUAGE_QUEST_HEART_REFILL_MIN_QUESTIONS = 3;
export const LANGUAGE_QUEST_HEART_REFILL_MAX_QUESTIONS = 5;
export const LANGUAGE_QUEST_HEART_REFILL_PASS_RATIO = 0.7;
export const LANGUAGE_QUEST_HEART_REFILL_ATTEMPT_MINUTES = 20;

export const LANGUAGE_QUEST_HEART_REFILL_TYPES = [
  "SELECT",
  "ASSIST",
  "CLOZE",
  "ODD_ONE_OUT",
  "GRAMMAR_TRANSFORM",
] as const;

export type LanguageQuestSurpriseCardRarity = "Bright" | "Rare" | "Epic" | "Legend";

export interface LanguageQuestSurpriseCard {
  id: string;
  name: string;
  epithet: string;
  emoji: string;
  rarity: LanguageQuestSurpriseCardRarity;
  power: string;
  story: string;
  colors: [string, string, string];
}

export interface LanguageQuestSurpriseCardCollection {
  unlockedIds: string[];
  unlockedCount: number;
  totalCount: number;
  complete: boolean;
}

/** Original, refill-only companions. Ownership is saved separately from XP cards. */
export const LANGUAGE_QUEST_SURPRISE_CARDS: readonly LanguageQuestSurpriseCard[] = [
  { id: "mendimoth", name: "Mendimoth", epithet: "The Gentle Mender", emoji: "🦋", rarity: "Bright", power: "Heart Stitch", story: "Repairs courage with one careful word at a time.", colors: ["#4c1d95", "#a855f7", "#f0abfc"] },
  { id: "quizquokka", name: "Quizquokka", epithet: "The Cheerful Thinker", emoji: "🦘", rarity: "Bright", power: "Bright Guess", story: "Turns a difficult choice into a reason to smile.", colors: ["#9a3412", "#f97316", "#fde047"] },
  { id: "vocabee", name: "Vocabee", epithet: "The Word Gatherer", emoji: "🐝", rarity: "Bright", power: "Honey Hint", story: "Collects useful words and shares them when friends feel stuck.", colors: ["#713f12", "#eab308", "#fef08a"] },
  { id: "calmipup", name: "Calmipup", epithet: "The Steady Friend", emoji: "🐶", rarity: "Rare", power: "Courage Curl", story: "Reminds every learner that a mistake is only a next step.", colors: ["#164e63", "#0891b2", "#67e8f9"] },
  { id: "riddlefin", name: "Riddlefin", epithet: "The Clue Swimmer", emoji: "🐬", rarity: "Rare", power: "Meaning Splash", story: "Finds the smallest clue hiding inside the biggest question.", colors: ["#1e3a8a", "#2563eb", "#7dd3fc"] },
  { id: "syntaxsage", name: "Syntaxsage", epithet: "The Pattern Fox", emoji: "🦊", rarity: "Rare", power: "Pattern Pounce", story: "Spots the shape of a sentence before anyone else.", colors: ["#7f1d1d", "#ef4444", "#fdba74"] },
  { id: "echoot", name: "Echoot", epithet: "The Listening Owl", emoji: "🦉", rarity: "Epic", power: "Echo Focus", story: "Hears quiet differences and keeps them safe for later.", colors: ["#312e81", "#6366f1", "#c4b5fd"] },
  { id: "braveling", name: "Braveling", epithet: "The Comeback Cub", emoji: "🐯", rarity: "Epic", power: "Second Spark", story: "Gets back up with a stronger heart after every challenge.", colors: ["#831843", "#db2777", "#f9a8d4"] },
  { id: "wordwhale", name: "Wordwhale", epithet: "The Memory Voyager", emoji: "🐋", rarity: "Epic", power: "Recall Song", story: "Carries forgotten words home across a sea of memory.", colors: ["#134e4a", "#0f766e", "#5eead4"] },
  { id: "prismara", name: "Prismara", epithet: "The Many-Meaning Star", emoji: "🌠", rarity: "Legend", power: "Prism Recall", story: "Reveals a new meaning whenever learning changes direction.", colors: ["#581c87", "#7c3aed", "#22d3ee"] },
  { id: "heartforge", name: "Heartforge", epithet: "The Courage Smith", emoji: "❤️‍🔥", rarity: "Legend", power: "Flame Refill", story: "Forges every careful answer into fresh courage.", colors: ["#7f1d1d", "#dc2626", "#f59e0b"] },
  { id: "novanote", name: "Novanote", epithet: "The Secret Scholar", emoji: "✨", rarity: "Legend", power: "Surprise Shine", story: "Appears only when curiosity and persistence meet.", colors: ["#1e1b4b", "#8b5cf6", "#f472b6"] },
] as const;

export function languageQuestSurpriseCardById(id: string | null | undefined): LanguageQuestSurpriseCard | null {
  return LANGUAGE_QUEST_SURPRISE_CARDS.find((card) => card.id === id) ?? null;
}

/** Picks only from cards the learner does not own; randomValue is injectable for tests. */
export function nextLanguageQuestSurpriseCard(
  unlockedIds: ReadonlySet<string>,
  randomValue = Math.random(),
): LanguageQuestSurpriseCard | null {
  const locked = LANGUAGE_QUEST_SURPRISE_CARDS.filter((card) => !unlockedIds.has(card.id));
  if (locked.length === 0) return null;
  const safeRandom = Number.isFinite(randomValue) ? Math.min(Math.max(randomValue, 0), 0.999999999) : 0;
  return locked[Math.floor(safeRandom * locked.length)] ?? locked[0];
}

export function languageQuestHeartRefillRequiredCorrect(total: number): number {
  const safeTotal = Math.max(0, Math.floor(total));
  return Math.ceil(safeTotal * LANGUAGE_QUEST_HEART_REFILL_PASS_RATIO);
}

export function languageQuestHeartRefillPassed(correctCount: number, total: number): boolean {
  const safeTotal = Math.max(0, Math.floor(total));
  return safeTotal >= LANGUAGE_QUEST_HEART_REFILL_MIN_QUESTIONS
    && Math.max(0, Math.floor(correctCount)) >= languageQuestHeartRefillRequiredCorrect(safeTotal);
}

/** Refill answers must preserve the exact one-time deck and order issued by the server. */
export function languageQuestHeartRefillSubmissionMatchesDeck(
  challengeIds: readonly string[],
  submittedChallengeIds: readonly string[],
): boolean {
  if (challengeIds.length !== submittedChallengeIds.length) return false;
  if (new Set(challengeIds).size !== challengeIds.length) return false;
  return challengeIds.every((id, index) => id === submittedChallengeIds[index]);
}
