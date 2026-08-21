export interface DragBlank { id: string; answer: string }
export interface DragBankItem { key: string; label: string }

export interface ExamScoreResult {
  score: number;
  correct: boolean | null;
  manual: boolean;
}

// Canonical (pre-shuffle) bank order. The numeric keys remain stable even when
// the player shuffles the tiles for delivery.
export function dragDropBank(options: any): DragBankItem[] {
  const blanks: DragBlank[] = Array.isArray(options?.blanks) ? options.blanks : [];
  const distractors: string[] = Array.isArray(options?.distractors) ? options.distractors : [];
  const labels = [...blanks.map((blank) => String(blank?.answer ?? "")), ...distractors.map((word) => String(word ?? ""))]
    .filter(Boolean);
  return labels.map((label, index) => ({ key: String(index), label }));
}

export function scoreExamObjective(question: any, answer: any): ExamScoreResult {
  const maximum = Number.isFinite(Number(question.points)) ? Math.max(0, Number(question.points)) : 0;
  const configuredFloor = question.minScore == null ? null : Number(question.minScore);
  const lowerBound = configuredFloor != null && Number.isFinite(configuredFloor)
    ? Math.min(maximum, configuredFloor)
    : (question.negativePoints ? -Math.abs(Number(question.negativePoints)) : 0);
  const clamp = (score: number) => Math.min(maximum, Math.max(lowerBound, Number.isFinite(score) ? score : 0));
  const wrongScore = () => clamp(question.negativePoints ? -Math.abs(Number(question.negativePoints)) : 0);

  if (["SHORT_ANSWER", "ESSAY", "WRITTEN", "EXTENDED"].includes(question.type) || question.requiresManualGrading) {
    return { score: 0, correct: null, manual: true };
  }

  const accepted: string[] = Array.isArray(question.correctAnswers) && question.correctAnswers.length
    ? question.correctAnswers.map(String)
    : (question.correctAnswer != null ? [String(question.correctAnswer)] : []);
  const normalize = (value: unknown) => question.caseSensitive
    ? String(value ?? "").trim()
    : String(value ?? "").trim().toLocaleLowerCase();

  if (question.type === "DRAG_DROP") {
    const blanks: DragBlank[] = question.options && !Array.isArray(question.options) && Array.isArray(question.options.blanks)
      ? question.options.blanks : [];
    const bank = dragDropBank(question.options);
    const bankLabels = Object.fromEntries(bank.map((item) => [item.key, item.label]));
    const placements = answer?.selectedOptions && !Array.isArray(answer.selectedOptions) && typeof answer.selectedOptions === "object"
      ? answer.selectedOptions as Record<string, unknown> : {};
    const blankIds = new Set(blanks.map((blank) => String(blank.id)));
    const placedKeys = Object.values(placements).map(String);
    const validPlacement = Object.keys(placements).every((blankId) => blankIds.has(blankId))
      && placedKeys.every((bankKey) => Object.hasOwn(bankLabels, bankKey))
      && new Set(placedKeys).size === placedKeys.length;
    if (!validPlacement) return { score: 0, correct: false, manual: false };

    const correctCount = blanks.filter((blank) => normalize(bankLabels[String(placements[blank.id])]) === normalize(blank.answer)).length;
    const correct = blanks.length > 0 && correctCount === blanks.length;
    const score = question.partialCredit && blanks.length ? (maximum * correctCount) / blanks.length : (correct ? maximum : 0);
    return { score: clamp(score), correct, manual: false };
  }

  if (Array.isArray(answer?.selectedOptions)) {
    // Choice controls represent a set. De-duplicating here prevents crafted
    // payloads from counting one weighted option multiple times.
    const selectedValues: string[] = (answer.selectedOptions as unknown[]).map((value) => String(value));
    const chosen: string[] = [...new Set<string>(selectedValues)];
    const acceptedSet = new Set(accepted.map(normalize));
    const chosenSet = new Set(chosen.map(normalize));
    const correctChosen = [...acceptedSet].filter((value) => chosenSet.has(value)).length;
    const wrongChosen = [...chosenSet].filter((value) => !acceptedSet.has(value)).length;
    const exact = acceptedSet.size > 0 && correctChosen === acceptedSet.size && wrongChosen === 0;

    if (question.optionWeights && typeof question.optionWeights === "object") {
      const weights = question.optionWeights as Record<string, unknown>;
      const raw = chosen.reduce<number>((sum, option) => {
        const weight = Number(weights[option]);
        return sum + (Number.isFinite(weight) ? weight : 0);
      }, 0);
      const score = question.partialCredit ? raw * maximum : (exact ? maximum : 0);
      const correct = acceptedSet.size ? exact : clamp(score) >= maximum;
      return { score: clamp(score), correct, manual: false };
    }

    if (acceptedSet.size) {
      const score = question.partialCredit
        ? maximum * Math.max(0, (correctChosen - wrongChosen) / acceptedSet.size)
        : (exact ? maximum : 0);
      return { score: clamp(score), correct: exact, manual: false };
    }
    return { score: 0, correct: false, manual: false };
  }

  const given = String(answer?.answerText ?? "");
  if (!given.trim()) return { score: 0, correct: false, manual: false };

  if (question.numericTolerance != null && Number(question.numericTolerance) >= 0 && accepted.length && Number.isFinite(Number(given))) {
    const numericAnswer = Number(given);
    const hit = accepted.some((candidate) => Number.isFinite(Number(candidate))
      && Math.abs(numericAnswer - Number(candidate)) <= Number(question.numericTolerance));
    return hit
      ? { score: clamp(maximum), correct: true, manual: false }
      : { score: wrongScore(), correct: false, manual: false };
  }

  const hit = accepted.some((candidate) => normalize(candidate) === normalize(given));
  return hit
    ? { score: clamp(maximum), correct: true, manual: false }
    : { score: wrongScore(), correct: false, manual: false };
}
