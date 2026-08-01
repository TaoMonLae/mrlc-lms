export const LANGUAGE_QUEST_CHALLENGE_TYPES = [
  'SELECT',
  'ASSIST',
  'CLOZE',
  'ODD_ONE_OUT',
  'REORDER',
  'MATCHING',
  'MINIMAL_PAIR_LISTENING',
  'DICTATION',
  'GRAMMAR_TRANSFORM',
] as const;

export type LanguageQuestChallengeType = typeof LANGUAGE_QUEST_CHALLENGE_TYPES[number];

/**
 * Converts an editor option bank to the invariants expected by the existing
 * learner UI and server grader. IDs and editor-only fields are preserved.
 */
export function normalizeLanguageQuestAuthoringOptions<T extends { correct: boolean }>(
  type: LanguageQuestChallengeType,
  source: readonly T[],
  createOption: (correct?: boolean) => T,
): T[] {
  const options = source.map((option) => ({ ...option }));
  if (type === 'DICTATION') {
    return [{ ...(options[0] ?? createOption()), correct: true }];
  }

  while (options.length < 2) options.push(createOption());
  if (type === 'MATCHING' && options.length % 2 !== 0) options.push(createOption());
  const bounded = type === 'REORDER' ? options : options.slice(0, type === 'MATCHING' ? 12 : 6);

  if (type === 'REORDER' || type === 'MATCHING') {
    return bounded.map((option) => ({ ...option, correct: true }));
  }

  const preferredCorrectIndex = Math.max(0, bounded.findIndex((option) => option.correct));
  return bounded.map((option, index) => ({ ...option, correct: index === preferredCorrectIndex }));
}
