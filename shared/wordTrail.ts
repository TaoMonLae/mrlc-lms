export const WORD_TRAIL_LAST_POSITION = 24;
export const WORD_TRAIL_STARTING_HEARTS = 4;
export const WORD_TRAIL_QUESTION_COUNT = 24;

export type WordTrailEffectKind = "BOOST" | "SLIDE" | "BONUS";

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

export function resolveWordTrailMovement(position: number, roll: number): WordTrailMovement {
  const safePosition = Math.max(0, Math.min(WORD_TRAIL_LAST_POSITION, Math.floor(position)));
  const safeRoll = Math.max(1, Math.min(6, Math.floor(roll)));
  const rolledTo = Math.min(WORD_TRAIL_LAST_POSITION, safePosition + safeRoll);
  const effect = rolledTo === WORD_TRAIL_LAST_POSITION
    ? null
    : WORD_TRAIL_SPECIAL_TILES[rolledTo] ?? null;
  const to = effect
    ? Math.max(0, Math.min(WORD_TRAIL_LAST_POSITION, rolledTo + effect.moveBy))
    : rolledTo;
  return { from: safePosition, rolledTo, to, effect };
}

export function wordTrailCorrectAnswerPoints(input: {
  roll: number;
  streak: number;
  effect?: WordTrailTileEffect | null;
  won?: boolean;
}): number {
  const rollPoints = Math.max(1, Math.min(6, Math.floor(input.roll))) * 2;
  const streakPoints = Math.max(0, Math.min(5, Math.floor(input.streak))) * 2;
  return 10
    + rollPoints
    + streakPoints
    + (input.effect?.bonusPoints ?? 0)
    + (input.won ? 50 : 0);
}
