function stableOptionIndex(value: string, optionCount: number): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % optionCount;
}

/** Inserts the correct response in a stable, question-specific slot. */
export function orderLanguageQuestOptions(
  correct: string,
  distractors: readonly string[],
  questionKey: string,
): string[] {
  const options = [...distractors];
  options.splice(stableOptionIndex(questionKey, options.length + 1), 0, correct);
  return options;
}
