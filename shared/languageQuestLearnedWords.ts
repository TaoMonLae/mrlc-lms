export type LanguageQuestLearnedWordStatus = "LEARNING" | "SECURE" | "REVIEW";

export interface LanguageQuestLearnedWordSignals {
  attempts: number;
  correctAttempts: number;
  wrongAttempts: number;
}

export function normalizeLanguageQuestLearnedWord(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

/** Keeps repeated terms separate by course while collapsing duplicate lesson encounters. */
export function languageQuestLearnedWordKey(courseId: string, value: string): string {
  return `${courseId}:${normalizeLanguageQuestLearnedWord(value)}`;
}

export function languageQuestLearnedWordAccuracy(signals: LanguageQuestLearnedWordSignals): number {
  const attempts = Math.max(0, Math.floor(signals.attempts));
  if (attempts === 0) return 0;
  return Math.round((Math.max(0, signals.correctAttempts) / attempts) * 100);
}

/**
 * A first correct encounter is still "learning". Repeated accurate recall is
 * secure; a term with meaningful mistakes below 70% is surfaced for review.
 */
export function languageQuestLearnedWordStatus(
  signals: LanguageQuestLearnedWordSignals,
): LanguageQuestLearnedWordStatus {
  const accuracy = languageQuestLearnedWordAccuracy(signals);
  if (signals.wrongAttempts > 0 && accuracy < 70) return "REVIEW";
  if (signals.correctAttempts >= 2 && accuracy >= 80) return "SECURE";
  return "LEARNING";
}

export function isLanguageQuestLearnedWordStatus(value: unknown): value is LanguageQuestLearnedWordStatus {
  return value === "LEARNING" || value === "SECURE" || value === "REVIEW";
}
