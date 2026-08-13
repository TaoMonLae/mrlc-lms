export const LANGUAGE_QUEST_MAX_HEARTS = 5;
export const LANGUAGE_QUEST_FIRST_CLEAR_POINTS = 10;
export const LANGUAGE_QUEST_PRACTICE_POINTS = 2;
// One-time bonus for beating a completed course's Boss Battle (a timed
// gauntlet of the learner's own toughest questions from that course).
export const LANGUAGE_QUEST_BOSS_BATTLE_POINTS = 40;
// A Boss Battle is "won" once a learner clears this share of the gauntlet,
// and only counts as an attempt once enough questions were actually answered.
export const LANGUAGE_QUEST_BOSS_BATTLE_PASS_RATIO = 0.7;
export const LANGUAGE_QUEST_BOSS_BATTLE_MIN_QUESTIONS = 4;
export const LANGUAGE_QUEST_BOSS_BATTLE_MAX_QUESTIONS = 8;
export const LANGUAGE_QUEST_BOSS_BATTLE_ATTEMPT_MINUTES = 20;
export const LANGUAGE_QUEST_BOSS_BATTLE_INELIGIBLE_TYPES = new Set([
  "REORDER",
  "MATCHING",
  "DICTATION",
  // The current battle renderer has no audio playback or hidden listening
  // prompt. Showing these as ordinary visible choices turns a listening test
  // into a text-recognition question, so keep them in lessons/mastery only.
  "MINIMAL_PAIR_LISTENING",
]);
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

/**
 * REORDER questions sometimes include the canonical sentence in quotes as
 * authoring context (for example, "Put the characters of ‘再见’ in order").
 * That is useful on a study card but gives the quiz answer away. Redact the
 * ordered option text anywhere an assessment prompt is returned.
 */
export function languageQuestAssessmentPrompt(
  value: string,
  type?: string,
  orderedOptionTexts: readonly string[] = [],
): string {
  let prompt = languageQuestPracticePrompt(value);
  if (type !== "REORDER" || orderedOptionTexts.length === 0) return prompt;

  const spacedAnswer = orderedOptionTexts.join(" ").replace(/\s+/g, " ").trim();
  const compactAnswer = orderedOptionTexts.join("").trim();
  const answers = [...new Set([spacedAnswer, compactAnswer])]
    .filter((answer) => answer.length > 1)
    .sort((left, right) => right.length - left.length);
  for (const answer of answers) {
    prompt = prompt.split(answer).join("_____");
  }
  return prompt || "Put the tiles in the correct order.";
}

/**
 * Structural review challenges do not have one vocabulary answer to study.
 * REORDER and MATCHING mark every tile correct, while ODD_ONE_OUT's correct
 * option is deliberately the unrelated distractor. Feeding any of those into
 * Learn/Pick/Spell creates misleading cards, so they go straight to their
 * purpose-built quiz interaction instead.
 */
const LANGUAGE_QUEST_STUDY_CARD_TYPES = new Set([
  "SELECT",
  "ASSIST",
  "CLOZE",
  "MINIMAL_PAIR_LISTENING",
  "DICTATION",
  "GRAMMAR_TRANSFORM",
]);

export function languageQuestChallengeSupportsStudyCard(type: string): boolean {
  return LANGUAGE_QUEST_STUDY_CARD_TYPES.has(type);
}

/**
 * Language courses use Listen/Pick/Spell study cards before scored practice.
 * Subject courses should instead open directly on their problem-solving
 * interaction; turning a numeric, scientific, or social-studies answer into a vocabulary,
 * listening, or spelling card is both misleading and needlessly repetitive.
 */
export function languageQuestCourseUsesStudyCards(language: string): boolean {
  const normalized = language.trim().toLocaleLowerCase();
  return !normalized.includes("math") && !normalized.includes("science") && !normalized.includes("social studies");
}

export interface LanguageQuestBossBattleStatus {
  available: boolean;
  unlocked: boolean;
  eligibleQuestionCount: number;
  minQuestions: number;
  remainingChallenges: number;
}

/** Builds the course-page Boss Battle state from the same rules as the API. */
export function languageQuestBossBattleStatus(
  challenges: readonly { id: string; type: string }[],
  completedChallengeIds: ReadonlySet<string>,
): LanguageQuestBossBattleStatus {
  const eligibleQuestionCount = challenges.filter(
    (challenge) => !LANGUAGE_QUEST_BOSS_BATTLE_INELIGIBLE_TYPES.has(challenge.type),
  ).length;
  const remainingChallenges = challenges.filter(
    (challenge) => !completedChallengeIds.has(challenge.id),
  ).length;
  const available = eligibleQuestionCount >= LANGUAGE_QUEST_BOSS_BATTLE_MIN_QUESTIONS;
  return {
    available,
    unlocked: available && challenges.length > 0 && remainingChallenges === 0,
    eligibleQuestionCount,
    minQuestions: LANGUAGE_QUEST_BOSS_BATTLE_MIN_QUESTIONS,
    remainingChallenges,
  };
}

/**
 * Adds a missed quiz item back into the queue after a short interleaving gap.
 * The answered occurrence stays behind the cursor as session history, while
 * the returned copy becomes a future attempt. The input array is never
 * mutated so React state updates remain predictable.
 */
export function requeueMissedLanguageQuestChallenge<T>(
  queue: readonly T[],
  currentIndex: number,
  interveningChallenges = 2,
): T[] {
  const missed = queue[currentIndex];
  if (missed === undefined) return [...queue];
  const gap = Math.max(0, Math.floor(interveningChallenges));
  const insertionIndex = Math.min(queue.length, currentIndex + gap + 1);
  return [
    ...queue.slice(0, insertionIndex),
    missed,
    ...queue.slice(insertionIndex),
  ];
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

export interface BossBattleAnswer {
  challengeId: string;
  optionId: string | null;
}

export interface BossBattleAnswerKeyEntry {
  challengeId: string;
  correctOptionId: string;
  correctAnswer: string;
}

export interface BossBattleQuestionResult {
  challengeId: string;
  correct: boolean;
  correctOptionId: string;
  correctAnswer: string;
}

export interface BossBattleOutcome {
  results: BossBattleQuestionResult[];
  correctCount: number;
  total: number;
  won: boolean;
}

// Server-side scoring for a Boss Battle submission. Takes the learner's
// submitted answers plus the *real* answer key for the course (fetched fresh
// from the database by the caller, never trusted from the client) and grades
// them independently. Only answers whose challengeId is actually present in
// the answer key count toward the total, which is what stops a crafted
// request from padding the pass ratio with challenge ids from other courses;
// duplicate challengeIds in the submission are also collapsed to one attempt
// each so repeating an easy question can't inflate the ratio either.
export function bossBattleResult(
  answers: readonly BossBattleAnswer[],
  answerKey: readonly BossBattleAnswerKeyEntry[],
  options: { minQuestions: number; passRatio: number },
): BossBattleOutcome {
  const keyById = new Map(answerKey.map((entry) => [entry.challengeId, entry]));
  const seen = new Set<string>();
  const results: BossBattleQuestionResult[] = [];
  for (const answer of answers) {
    const key = keyById.get(answer.challengeId);
    if (!key || seen.has(answer.challengeId)) continue;
    seen.add(answer.challengeId);
    results.push({
      challengeId: answer.challengeId,
      correct: answer.optionId != null && answer.optionId === key.correctOptionId,
      correctOptionId: key.correctOptionId,
      correctAnswer: key.correctAnswer,
    });
  }
  const correctCount = results.filter((entry) => entry.correct).length;
  const total = results.length;
  const won = total >= options.minQuestions && correctCount / total >= options.passRatio;
  return { results, correctCount, total, won };
}

/** A battle submission must answer exactly the one-time deck issued by the server. */
export function bossBattleSubmissionMatchesDeck(
  challengeIds: readonly string[],
  submittedChallengeIds: readonly string[],
): boolean {
  if (challengeIds.length !== submittedChallengeIds.length) return false;
  if (new Set(challengeIds).size !== challengeIds.length) return false;
  return challengeIds.every((id, index) => id === submittedChallengeIds[index]);
}

// REORDER challenges store their tokens/words in canonical (correct) order as
// the option array itself -- there's no single "correct option" the way
// SELECT/ASSIST/CLOZE/ODD_ONE_OUT have one. The learner instead submits the
// sequence of option ids they built, and this checks it against the
// canonical order (already sorted by the caller, e.g. by each option's
// stored `order` column).
export function reorderChallengeIsCorrect(
  canonicalOptionIds: readonly string[],
  submittedOptionIds: readonly string[] | null | undefined,
): boolean {
  if (!submittedOptionIds || submittedOptionIds.length !== canonicalOptionIds.length) return false;
  return canonicalOptionIds.every((id, index) => id === submittedOptionIds[index]);
}

// A REORDER submission is well-formed only if it's a genuine permutation of
// every option belonging to the challenge -- same ids, same count, no
// duplicates -- regardless of whether the order itself turns out correct.
export function isValidReorderSubmission(
  canonicalOptionIds: readonly string[],
  submittedOptionIds: readonly string[] | null | undefined,
): boolean {
  if (!Array.isArray(submittedOptionIds) || submittedOptionIds.length !== canonicalOptionIds.length) return false;
  const canonicalSet = new Set(canonicalOptionIds);
  const submittedSet = new Set(submittedOptionIds);
  if (submittedSet.size !== submittedOptionIds.length) return false;
  if (submittedSet.size !== canonicalSet.size) return false;
  for (const id of submittedSet) {
    if (!canonicalSet.has(id)) return false;
  }
  return true;
}

// MATCHING challenges group their options into left/right pairs purely by
// position -- for N pairs there are 2N options, and (mirroring REORDER)
// every option is stored `correct: true` since there's no single correct
// option. Canonical option index 2k is the "left" tile of pair k and index
// 2k+1 is its paired "right" tile, so a tile's pair number is just
// floor(index / 2). The learner submits the set of tile-id pairs they
// connected on the board; grading checks every submitted pair actually
// shares a pair number in the canonical layout.
function matchingPairIndex(canonicalOptionIds: readonly string[], optionId: string): number | null {
  const index = canonicalOptionIds.indexOf(optionId);
  return index < 0 ? null : Math.floor(index / 2);
}

export function matchingChallengeIsCorrect(
  canonicalOptionIds: readonly string[],
  submittedPairs: readonly (readonly [string, string])[] | null | undefined,
): boolean {
  if (!submittedPairs || submittedPairs.length === 0) return false;
  return submittedPairs.every(([left, right]) => {
    const leftPair = matchingPairIndex(canonicalOptionIds, left);
    const rightPair = matchingPairIndex(canonicalOptionIds, right);
    return leftPair !== null && leftPair === rightPair;
  });
}

// A MATCHING submission is well-formed only if it pairs up every tile on the
// board exactly once -- the right count of pairs, every id belongs to this
// challenge, no tile paired with itself, and no tile reused across pairs --
// regardless of whether the pairing itself turns out correct.
// Builds a human-readable "left → right" summary of the canonical pairing,
// used as the `correctAnswer` shown in the feedback footer once a MATCHING
// challenge has been answered (right or wrong).
export function pairedMatchAnswerSummary(options: readonly { text: string }[]): string {
  const pairs: string[] = [];
  for (let index = 0; index + 1 < options.length; index += 2) {
    pairs.push(`${options[index].text} → ${options[index + 1].text}`);
  }
  return pairs.join("; ");
}

export function isValidMatchingSubmission(
  canonicalOptionIds: readonly string[],
  submittedPairs: readonly (readonly [string, string])[] | null | undefined,
): boolean {
  if (!Array.isArray(submittedPairs) || submittedPairs.length * 2 !== canonicalOptionIds.length) return false;
  const canonicalSet = new Set(canonicalOptionIds);
  const used = new Set<string>();
  for (const pair of submittedPairs) {
    if (!Array.isArray(pair) || pair.length !== 2) return false;
    const [left, right] = pair;
    if (typeof left !== "string" || typeof right !== "string") return false;
    if (left === right) return false;
    if (!canonicalSet.has(left) || !canonicalSet.has(right)) return false;
    if (used.has(left) || used.has(right)) return false;
    used.add(left);
    used.add(right);
  }
  return true;
}
