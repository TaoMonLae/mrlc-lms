export type AnalyticsOption = { value: string; label: string };

const clean = (value: unknown) => String(value ?? '').trim();
const key = (value: unknown) => clean(value).toLocaleLowerCase();

export function hasAnalyticsResponse(answerText: unknown, selectedOptions: unknown): boolean {
  if (clean(answerText)) return true;
  if (Array.isArray(selectedOptions)) return selectedOptions.some((value) => Boolean(clean(value)));
  if (selectedOptions && typeof selectedOptions === 'object') {
    return Object.values(selectedOptions).some((value) => Boolean(clean(value)));
  }
  return false;
}

export function analyticsSelectedValues(answerText: unknown, selectedOptions: unknown): string[] {
  const values = Array.isArray(selectedOptions)
    ? selectedOptions.map(clean).filter(Boolean)
    : clean(answerText) ? [clean(answerText)] : [];
  return [...new Set(values)];
}

export function normalizeAnalyticsOptions(options: unknown): AnalyticsOption[] {
  if (!Array.isArray(options)) return [];
  return options.map((option, index) => {
    if (option && typeof option === 'object') {
      const row = option as Record<string, unknown>;
      const value = clean(row.value ?? row.id ?? row.key ?? row.text ?? row.label ?? index);
      const label = clean(row.text ?? row.label ?? row.value ?? row.id ?? row.key ?? index);
      return { value, label };
    }
    const value = clean(option);
    return { value, label: value };
  }).filter((option) => option.value || option.label);
}

export function analyticsQuestionConfig(question: any): {
  options: unknown;
  correctAnswer: unknown;
  correctAnswers: unknown;
} {
  if (Array.isArray(question?.optionRows) && question.optionRows.length) {
    const correctOptionIds = question.optionRows
      .filter((option: any) => option.isCorrect)
      .map((option: any) => String(option.id));
    return {
      options: question.optionRows.map((option: any) => ({ value: String(option.id), text: String(option.text) })),
      correctAnswer: correctOptionIds[0] ?? null,
      correctAnswers: correctOptionIds,
    };
  }
  return {
    options: question?.options,
    correctAnswer: question?.correctAnswer,
    correctAnswers: question?.correctAnswers,
  };
}

export function analyzeDistractorResponses(input: {
  options: unknown;
  correctAnswer: unknown;
  correctAnswers: unknown;
  incorrectSelections: string[][];
  responseCount: number;
}): { distractorRates: Record<string, number>; hasUnusedDistractor: boolean } {
  const options = normalizeAnalyticsOptions(input.options);
  if (!options.length) return { distractorRates: {}, hasUnusedDistractor: false };

  const accepted = Array.isArray(input.correctAnswers) && input.correctAnswers.length
    ? input.correctAnswers
    : input.correctAnswer == null ? [] : [input.correctAnswer];
  const acceptedKeys = new Set(accepted.map(key).filter(Boolean));
  const optionByAlias = new Map<string, AnalyticsOption>();
  for (const option of options) {
    optionByAlias.set(key(option.value), option);
    optionByAlias.set(key(option.label), option);
  }
  const correctOptions = new Set(options
    .filter((option) => acceptedKeys.has(key(option.value)) || acceptedKeys.has(key(option.label)))
    .map((option) => option.value));
  const distractors = options.filter((option) => !correctOptions.has(option.value));
  const counts = new Map(distractors.map((option) => [option.value, 0]));

  for (const selection of input.incorrectSelections.flat()) {
    const option = optionByAlias.get(key(selection));
    if (!option || correctOptions.has(option.value) || !counts.has(option.value)) continue;
    counts.set(option.value, (counts.get(option.value) || 0) + 1);
  }

  const denominator = Math.max(0, input.responseCount);
  const distractorRates = Object.fromEntries(distractors.map((option) => [
    option.label,
    denominator ? (counts.get(option.value) || 0) / denominator : 0,
  ]));
  return {
    distractorRates,
    hasUnusedDistractor: distractors.length > 0 && distractors.some((option) => (counts.get(option.value) || 0) === 0),
  };
}

export const EXAM_ANALYTICS_FLAG_INFO: Record<string, { label: string; description: string }> = {
  TOO_EASY: { label: 'Very easy', description: 'More than 90% of submitted responses were correct.' },
  TOO_HARD: { label: 'Very difficult', description: 'Fewer than 20% of submitted responses were correct.' },
  POOR_DISCRIMINATION: { label: 'Low separation', description: 'This question does not clearly distinguish stronger and weaker performance.' },
  UNUSED_DISTRACTOR: { label: 'Unused option', description: 'At least one incorrect option was not selected by any learner.' },
  SLOW: { label: 'Slower response', description: 'Learners took substantially longer on this question than the exam average.' },
  ABNORMAL_PATTERN: { label: 'Review pattern', description: 'All analyzed learners answered this question the same way.' },
};

export function analyticsFlagInfo(flag: string) {
  return EXAM_ANALYTICS_FLAG_INFO[flag] || {
    label: flag.toLocaleLowerCase().replaceAll('_', ' ').replace(/^./, (character) => character.toLocaleUpperCase()),
    description: 'Review this question and its response pattern.',
  };
}
