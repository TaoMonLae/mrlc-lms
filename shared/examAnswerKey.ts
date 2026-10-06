import { dragDropBank, scoreExamObjective } from './examScoring';

export type AnswerKeyCorrection = {
  questionId: string;
  correctAnswers?: string[];
  modelAnswer?: string;
  blankAnswers?: string[];
};

const MANUAL_TYPES = new Set(['SHORT_ANSWER', 'ESSAY', 'WRITTEN', 'EXTENDED']);
const MULTI_TYPES = new Set(['HOTSPOT']);
const CHOICE_TYPES = new Set([
  'MCQ', 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'DROPDOWN', 'HOTSPOT',
  'GED_RLA_PASSAGE', 'GED_MATH', 'GED_SCIENCE', 'GED_SOCIAL_STUDIES',
]);

/** Only answer-key fields are returned; the question's student-facing content stays fixed. */
export function correctionData(question: any, correction: AnswerKeyCorrection): Record<string, unknown> {
  if (MANUAL_TYPES.has(question.type)) {
    if (typeof correction.modelAnswer !== 'string' || correction.modelAnswer.length > 10000 || correction.correctAnswers !== undefined || correction.blankAnswers !== undefined) {
      throw new Error('Provide only a model answer for this question.');
    }
    return { correctAnswer: correction.modelAnswer || null };
  }
  if (question.type === 'DRAG_DROP') {
    const options = question.options;
    const blanks = Array.isArray(options?.blanks) ? options.blanks : [];
    const requested = correction.blankAnswers;
    if (!Array.isArray(requested) || requested.length !== blanks.length || !blanks.length || correction.correctAnswers !== undefined || correction.modelAnswer !== undefined) {
      throw new Error('Provide one answer for each blank.');
    }
    const bank = dragDropBank(options).map(item => item.label);
    const remaining = [...bank];
    for (const answer of requested) {
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('Every blank needs an answer.');
      const index = remaining.indexOf(answer);
      if (index < 0) throw new Error('Blank answers must come from the existing word bank.');
      remaining.splice(index, 1);
    }
    return { options: { ...options, blanks: blanks.map((blank: any, index: number) => ({ ...blank, answer: requested[index] })), distractors: remaining } };
  }
  if (!CHOICE_TYPES.has(question.type)) throw new Error('This question type does not support answer-key correction.');
  const options = Array.isArray(question.options) ? question.options : Array.isArray(question.options?.choices) ? question.options.choices : question.type === 'TRUE_FALSE' ? ['True', 'False'] : [];
  const answers = correction.correctAnswers;
  if (!Array.isArray(answers) || !answers.length || correction.modelAnswer !== undefined || correction.blankAnswers !== undefined) {
    throw new Error('Select at least one correct option.');
  }
  const multi = MULTI_TYPES.has(question.type) || question.options?.ui === 'HOTSPOT' || (Array.isArray(question.correctAnswers) && question.correctAnswers.length > 1);
  if (!multi && answers.length !== 1) throw new Error('Select exactly one correct option.');
  if (new Set(answers).size !== answers.length || answers.some(value => typeof value !== 'string' || !/^(0|[1-9]\d*)$/.test(value) || Number(value) >= options.length)) {
    throw new Error('Correct options must belong to this question.');
  }
  if (question.options?.ui) {
    return { correctAnswer: answers[0], correctAnswers: multi ? answers : null, options: { ...question.options, correct: answers.map(Number) } };
  }
  return { correctAnswer: answers[0], correctAnswers: multi ? answers : null };
}

/** Grade against the corrected key while honoring the option order shown in an older attempt. */
export function scoreWithCorrectedKey(question: any, answer: any, frozen?: any) {
  const source = { ...question, points: frozen?.points ?? question.points };
  if (question.type === 'DRAG_DROP' && frozen?.scoringOptions) {
    source.options = { ...frozen.scoringOptions, blanks: (question.options?.blanks || []).map((blank: any) => ({ ...blank })) };
  } else if (Array.isArray(question.options) || Array.isArray(question.options?.choices) || question.type === 'TRUE_FALSE') {
    const options = Array.isArray(question.options) ? question.options : Array.isArray(question.options?.choices) ? question.options.choices : ['True', 'False'];
    const accepted = Array.isArray(question.correctAnswers) && question.correctAnswers.length
      ? question.correctAnswers.map(String) : question.correctAnswer == null ? [] : [String(question.correctAnswer)];
    source.correctAnswers = accepted.flatMap((value: string) => {
      const index = Number(value);
      if (!Number.isInteger(index) || options[index] == null) return [value];
      const option = options[index];
      const label = String(typeof option === 'object' ? option.key ?? option.value ?? option.text ?? value : option);
      // The current player submits the option key/text. Retain the index only
      // for older answerText submissions that did not freeze the option set.
      return frozen || Array.isArray(answer?.selectedOptions) ? [label] : [value, label];
    });
  }
  return scoreExamObjective(source, answer);
}
