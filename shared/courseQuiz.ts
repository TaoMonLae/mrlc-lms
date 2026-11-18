import type { CourseItem, CourseQuestion } from './courses';

export function gradeCourseQuiz(item: CourseItem, answers: Record<string, string>) {
  const questions = item.questions ?? [];
  const feedback = questions.map(question => {
    const response = (answers[question.id] ?? '').trim();
    const correct = question.kind === 'NUMERIC'
      ? response !== '' && Number.isFinite(Number(response)) && Math.abs(Number(response) - Number(question.answer)) < 1e-6
      : response === question.answer;
    return { questionId: question.id, response, correct, answer: question.answer, explanation: question.explanation };
  });
  const score = feedback.filter(result => result.correct).length;
  const total = questions.length;
  return { score, total, passed: total > 0 && score / total * 100 >= (item.passingPercent ?? 70), feedback };
}

export function courseQuizQuestionView(question: CourseQuestion) {
  const { answer: _answer, explanation: _explanation, ...publicQuestion } = question;
  return publicQuestion;
}
