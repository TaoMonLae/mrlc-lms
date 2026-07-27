export const WORD_TRAIL_LAST_POSITION = 24;
export const WORD_TRAIL_STARTING_HEARTS = 4;
export const WORD_TRAIL_QUESTION_COUNT = 24;

export type WordTrailEffectKind = "BOOST" | "SLIDE" | "BONUS";
export type WordTrailGameStatus = "ACTIVE" | "WON" | "LOST" | "ABANDONED";

export interface WordTrailTileEffect {
  kind: WordTrailEffectKind;
  label: string;
  emoji: string;
  moveBy: number;
  bonusPoints: number;
}

export const WORD_TRAIL_SPECIAL_TILES: Record<number, WordTrailTileEffect> = {
  3: { kind: "BONUS", label: "Word Star", emoji: "⭐", moveBy: 0, bonusPoints: 15 },
  5: { kind: "BOOST", label: "Book Bridge", emoji: "📚", moveBy: 2, bonusPoints: 5 },
  8: { kind: "SLIDE", label: "Muddy Meaning", emoji: "🫠", moveBy: -2, bonusPoints: 0 },
  10: { kind: "BONUS", label: "Word Star", emoji: "⭐", moveBy: 0, bonusPoints: 20 },
  12: { kind: "BOOST", label: "Rocket Rhyme", emoji: "🚀", moveBy: 3, bonusPoints: 5 },
  15: { kind: "SLIDE", label: "Spelling Slip", emoji: "🌀", moveBy: -3, bonusPoints: 0 },
  17: { kind: "BONUS", label: "Word Star", emoji: "⭐", moveBy: 0, bonusPoints: 25 },
  19: { kind: "BOOST", label: "Book Bridge", emoji: "📚", moveBy: 2, bonusPoints: 5 },
  22: { kind: "SLIDE", label: "Muddy Meaning", emoji: "🫠", moveBy: -2, bonusPoints: 0 },
};

export interface WordTrailMovement {
  from: number;
  rolledTo: number;
  to: number;
  effect: WordTrailTileEffect | null;
}

export function canUseWordTrail(role: string): boolean {
  return role === "STUDENT" || role === "TEACHER";
}

function finiteInteger(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

export function resolveWordTrailMovement(position: number, roll: number): WordTrailMovement {
  const safePosition = Math.max(
    0,
    Math.min(WORD_TRAIL_LAST_POSITION, finiteInteger(position, 0)),
  );
  const safeRoll = Math.max(1, Math.min(6, finiteInteger(roll, 1)));
  const rolledTo = Math.min(WORD_TRAIL_LAST_POSITION, safePosition + safeRoll);
  const effect = rolledTo === WORD_TRAIL_LAST_POSITION
    ? null
    : WORD_TRAIL_SPECIAL_TILES[rolledTo] ?? null;
  const to = effect
    ? Math.max(0, Math.min(WORD_TRAIL_LAST_POSITION, rolledTo + effect.moveBy))
    : rolledTo;
  return { from: safePosition, rolledTo, to, effect };
}

/**
 * Prefer questions the player has not answered yet so previously revealed
 * answers are not immediately recycled. Falls back to the full deck when every
 * card has been seen, but still avoids the most recent question when possible.
 */
export function pickWordTrailQuestion<T extends { id: string }>(
  deck: T[],
  answeredQuestionIds: Iterable<string>,
  turnCount: number,
): T | null {
  if (!Array.isArray(deck) || deck.length === 0) return null;
  const answeredList = [...answeredQuestionIds].filter(
    (id) => typeof id === "string" && id.length > 0,
  );
  const answered = new Set(answeredList);
  const unanswered = deck.filter((question) => !answered.has(question.id));
  let pool = unanswered.length > 0 ? unanswered : deck;

  if (pool.length > 1 && answeredList.length > 0) {
    const lastAnsweredId = answeredList[answeredList.length - 1];
    const withoutLast = pool.filter((question) => question.id !== lastAnsweredId);
    if (withoutLast.length > 0) pool = withoutLast;
  }

  const index = Math.abs(finiteInteger(turnCount, 0)) % pool.length;
  return pool[index] ?? null;
}

export function describeWordTrailMovement(movement: WordTrailMovement): string {
  const fromSpace = movement.from + 1;
  const rolledSpace = movement.rolledTo + 1;
  const toSpace = movement.to + 1;
  if (!movement.effect || movement.effect.moveBy === 0) {
    if (movement.from === movement.to) {
      return `Stayed on space ${toSpace}.`;
    }
    return `Moved from space ${fromSpace} to space ${toSpace}.`;
  }
  const effectVerb = movement.effect.moveBy > 0 ? "boosted" : "slid";
  return `Rolled to space ${rolledSpace}, then ${effectVerb} to space ${toSpace}.`;
}

export function wordTrailCorrectAnswerPoints(input: {
  spacesMoved: number;
  streak: number;
  effect?: WordTrailTileEffect | null;
  won?: boolean;
}): number {
  const movementPoints = Math.max(
    0,
    Math.min(6, finiteInteger(input.spacesMoved, 0)),
  ) * 2;
  const streakPoints = Math.max(
    0,
    Math.min(5, finiteInteger(input.streak, 0)),
  ) * 2;
  const tileBonus = Math.max(
    0,
    finiteInteger(input.effect?.bonusPoints ?? 0, 0),
  );
  return 10
    + movementPoints
    + streakPoints
    + tileBonus
    + (input.won ? 50 : 0);
}
