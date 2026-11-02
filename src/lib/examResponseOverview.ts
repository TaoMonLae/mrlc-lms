export type ResponseStatus = 'CORRECT' | 'INCORRECT' | 'PARTIAL' | 'PENDING' | 'GRADED';

export type ResponseQuestion = {
  id: string; number: number; text: string; type: string; correctAnswer: string | null;
  maxPoints: number; status: ResponseStatus; studentAnswer: string | null;
  choiceLabels?: string[];
};

export type ResponseAttempt = {
  id: string; studentName: string; attemptNumber: number; score: number | null;
  totalMarks: number; startedAt: string | null; completedAt: string | null;
  questions: ResponseQuestion[];
};

export type QuestionResponse = {
  attemptId: string; studentName: string; attemptNumber: number;
  answer: string | null; status: ResponseStatus;
};

export type QuestionOverview = {
  id: string; number: number; text: string; type: string; correctAnswer: string | null;
  maxPoints: number; correct: number; incorrect: number; partial: number; pending: number;
  responses: QuestionResponse[];
  distribution: { answer: string; count: number; correct: boolean }[];
  choiceLabels: string[];
};

export function buildResponseOverview(attempts: ResponseAttempt[]) {
  const scores = attempts.filter(attempt => attempt.score != null && attempt.totalMarks > 0)
    .map(attempt => Number(attempt.score) / attempt.totalMarks * 100).sort((a, b) => a - b);
  const durations = attempts.map(attempt => attempt.startedAt && attempt.completedAt
    ? (Date.parse(attempt.completedAt) - Date.parse(attempt.startedAt)) / 1000 : NaN)
    .filter(seconds => Number.isFinite(seconds) && seconds >= 0);
  const byQuestion = new Map<string, QuestionOverview>();

  for (const attempt of attempts) for (const question of attempt.questions) {
    let overview = byQuestion.get(question.id);
    if (!overview) {
      overview = {
        id: question.id, number: question.number, text: question.text, type: question.type,
        correctAnswer: question.correctAnswer, maxPoints: question.maxPoints,
        correct: 0, incorrect: 0, partial: 0, pending: 0, responses: [], distribution: [],
        choiceLabels: question.choiceLabels ?? [],
      };
      byQuestion.set(question.id, overview);
    }
    const status = question.status === 'GRADED' ? 'PENDING' : question.status;
    overview[status.toLowerCase() as 'correct' | 'incorrect' | 'partial' | 'pending']++;
    overview.responses.push({
      attemptId: attempt.id, studentName: attempt.studentName, attemptNumber: attempt.attemptNumber,
      answer: question.studentAnswer, status,
    });
  }

  for (const question of byQuestion.values()) {
    const counts = new Map<string, number>(question.choiceLabels.map(label => [label, 0]));
    for (const response of question.responses) {
      const answer = response.answer?.trim() || '';
      counts.set(answer, (counts.get(answer) || 0) + 1);
    }
    question.distribution = [...counts].map(([answer, count]) => ({
      answer, count, correct: Boolean(answer) && answer === question.correctAnswer,
    })).sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer));
  }

  const questions = [...byQuestion.values()].sort((a, b) => a.number - b.number);
  return {
    attempts: attempts.length,
    gradedScores: scores.length,
    averagePercent: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null,
    medianPercent: scores.length ? (scores[Math.floor((scores.length - 1) / 2)] + scores[Math.floor(scores.length / 2)]) / 2 : null,
    scoreRange: scores.length ? [scores[0], scores[scores.length - 1]] as const : null,
    averageSeconds: durations.length ? durations.reduce((sum, seconds) => sum + seconds, 0) / durations.length : null,
    questions,
    pendingAttempts: attempts.filter(attempt => attempt.questions.some(question => question.status === 'PENDING')).length,
  };
}
