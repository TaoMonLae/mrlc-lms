import { dragDropBank } from './examScoring';

type ReviewOption = { key: string; label: string };

const manualTypes = new Set(['SHORT_ANSWER', 'ESSAY', 'WRITTEN', 'EXTENDED']);

function optionsFor(question: any, frozen: any): ReviewOption[] {
  if (Array.isArray(frozen?.options) && frozen.options.length) {
    return frozen.options.map((option: any, index: number) => ({
      key: String(option.key ?? option.value ?? option.text ?? index),
      label: String(option.text ?? option.value ?? option.key ?? index),
    }));
  }
  if (Array.isArray(question?.optionRows) && question.optionRows.length) {
    return question.optionRows.map((option: any) => ({ key: String(option.id), label: String(option.text) }));
  }
  const raw = Array.isArray(question?.options) ? question.options : Array.isArray(question?.options?.choices) ? question.options.choices : [];
  return raw.map((option: any, index: number) => ({
    key: String(typeof option === 'object' ? option.key ?? option.value ?? option.text ?? index : option),
    label: String(typeof option === 'object' ? option.text ?? option.value ?? option.key ?? index : option),
  }));
}

function labelFor(value: unknown, options: ReviewOption[]): string {
  const raw = String(value ?? '');
  const direct = options.find(option => option.key === raw || option.label === raw);
  if (direct) return direct.label;
  const index = Number(raw);
  return Number.isInteger(index) && options[index] ? options[index].label : raw;
}

/** Staff-only response representation. Never send this result to the student attempt API. */
export function buildExamReviewQuestions(answers: any[], frozenContent: unknown, currentQuestions: any[]) {
  const frozen = Array.isArray(frozenContent) ? frozenContent as any[] : [];
  const answerById = new Map(answers.map(answer => [answer.questionId, answer]));
  const currentById = new Map(currentQuestions.map(question => [question.id, question]));
  const ids = [...new Set([...frozen.map(question => question.id), ...answers.map(answer => answer.questionId)])];

  return ids.map((id, index) => {
    const snapshot = frozen.find(question => question.id === id);
    const current = currentById.get(id);
    const answer = answerById.get(id);
    if (!snapshot && !current) return null;
    const type = snapshot?.type ?? current?.type;
    const options = optionsFor(current, snapshot);
    const corrected = Boolean(current?.answerKeyCorrectedAt);
    const key = corrected || !snapshot ? current : snapshot;
    const answerValues = Array.isArray(answer?.selectedOptions)
      ? answer.selectedOptions.map(String)
      : answer?.answerText == null || String(answer.answerText).trim() === '' ? [] : [String(answer.answerText)];
    let accepted = Array.isArray(key?.correctAnswers) && key.correctAnswers.length
      ? key.correctAnswers.map(String)
      : key?.correctAnswer == null ? [] : [String(key.correctAnswer)];
    if (corrected && Array.isArray(current?.optionRows) && current.optionRows.some((option: any) => option.isCorrect)) {
      accepted = current.optionRows.filter((option: any) => option.isCorrect).map((option: any) => String(option.id));
    }
    const manual = manualTypes.has(type) || Boolean(snapshot?.requiresManualGrading ?? current?.requiresManualGrading);
    const points = Number(snapshot?.points ?? current?.points ?? 0);
    const awarded = answer?.pointsAwarded == null ? null : Number(answer.pointsAwarded);
    const status = !answer
      ? manual ? 'PENDING' : 'INCORRECT'
      : answer?.isCorrect == null && awarded == null ? 'PENDING'
      : manual ? 'GRADED'
      : answer.isCorrect === true ? 'CORRECT'
      : awarded != null && awarded > 0 ? 'PARTIAL' : 'INCORRECT';

    let studentAnswer = answerValues.map(value => labelFor(value, options)).join(', ') || null;
    // Corrected legacy keys use canonical option indexes; the attempt's
    // displayed options may have been shuffled independently.
    const keyOptions = corrected ? optionsFor(current, null) : options;
    const correctedLabel = (value: string) => {
      const index = Number(value);
      if (corrected && !current?.optionRows?.length && Number.isInteger(index) && keyOptions[index]) return keyOptions[index].label;
      return labelFor(value, keyOptions);
    };
    let correctAnswer = accepted.map(correctedLabel).join(', ') || null;
    let blankRows: Array<{ label: string; student: string | null; correct: string; isCorrect: boolean }> = [];
    if (type === 'DRAG_DROP') {
      const scoringOptions = snapshot?.scoringOptions ?? current?.options;
      const bank = Object.fromEntries(dragDropBank(scoringOptions).map(item => [item.key, item.label]));
      const selected = answer?.selectedOptions && !Array.isArray(answer.selectedOptions) && typeof answer.selectedOptions === 'object' ? answer.selectedOptions : {};
      const blanks = Array.isArray(scoringOptions?.blanks) ? scoringOptions.blanks : [];
      const currentBlanks = corrected && Array.isArray(current?.options?.blanks) ? current.options.blanks : blanks;
      blankRows = blanks.map((blank: any, blankIndex: number) => {
        const student = selected[blank.id] == null ? null : bank[String(selected[blank.id])] ?? String(selected[blank.id]);
        const correct = String(currentBlanks[blankIndex]?.answer ?? blank.answer ?? '');
        return { label: `Blank ${blankIndex + 1}`, student, correct, isCorrect: Boolean(student) && student.trim().toLocaleLowerCase() === correct.trim().toLocaleLowerCase() };
      });
      studentAnswer = blankRows.map(row => `${row.label}: ${row.student ?? 'No answer'}`).join(' · ') || null;
      correctAnswer = blankRows.map(row => `${row.label}: ${row.correct}`).join(' · ') || null;
    }

    return {
      id, number: index + 1, text: snapshot?.text ?? current?.text ?? '', type,
      passageText: snapshot?.passageText ?? current?.passageText ?? null,
      imageUrl: snapshot?.imageUrl ?? current?.imageUrl ?? null,
      explanation: snapshot?.explanation ?? current?.explanation ?? null,
      maxPoints: points, pointsAwarded: awarded, status,
      studentAnswer, correctAnswer, blankRows,
      answerKeyCorrected: corrected,
    };
  }).filter(Boolean);
}
