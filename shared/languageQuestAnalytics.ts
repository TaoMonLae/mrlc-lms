import type { LanguageQuestChallengeType } from './languageQuestAuthoring';

export const LANGUAGE_QUEST_SKILL_LABELS: Record<LanguageQuestChallengeType, string> = {
  SELECT: 'Meaning recall',
  ASSIST: 'Translation',
  CLOZE: 'Fill in the blank',
  ODD_ONE_OUT: 'Word relationships',
  REORDER: 'Sentence building',
  MATCHING: 'Matching',
  MINIMAL_PAIR_LISTENING: 'Listening contrast',
  DICTATION: 'Dictation',
  GRAMMAR_TRANSFORM: 'Grammar and usage',
};

export type LanguageQuestAnalyticsStatus = 'NO_DATA' | 'NEEDS_REVIEW' | 'DEVELOPING' | 'SECURE';

export function languageQuestAnalyticsAccuracyPercent(correctAttempts: number, attempts: number): number | null {
  if (!Number.isFinite(attempts) || attempts <= 0) return null;
  const correct = Number.isFinite(correctAttempts) ? Math.max(0, correctAttempts) : 0;
  return Math.max(0, Math.min(100, Math.round((correct / attempts) * 100)));
}

export function languageQuestAnalyticsStatus(
  attempts: number,
  correctAttempts: number,
): LanguageQuestAnalyticsStatus {
  const accuracy = languageQuestAnalyticsAccuracyPercent(correctAttempts, attempts);
  if (accuracy === null) return 'NO_DATA';
  if (attempts >= 3 && accuracy < 70) return 'NEEDS_REVIEW';
  if (accuracy < 85) return 'DEVELOPING';
  return 'SECURE';
}

export function languageQuestAnalyticsStatusLabel(status: LanguageQuestAnalyticsStatus): string {
  if (status === 'NEEDS_REVIEW') return 'Needs review';
  if (status === 'DEVELOPING') return 'Developing';
  if (status === 'SECURE') return 'Secure';
  return 'No attempts';
}
