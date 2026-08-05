export const LANGUAGE_QUEST_FINAL_EXAM_MAX_QUESTIONS = 25;
export const LANGUAGE_QUEST_FINAL_EXAM_MIN_QUESTIONS = 10;
export const LANGUAGE_QUEST_FINAL_EXAM_PASS_RATIO = 0.8;
export const LANGUAGE_QUEST_FINAL_EXAM_ATTEMPT_MINUTES = 30;
export const LANGUAGE_QUEST_FINAL_EXAM_RETRY_MINUTES = 15;

/**
 * Final exams use server-gradable choice questions plus typed dictation.
 * Structural interactions still remain in lessons rather than being reduced
 * to misleading answer buttons.
 */
export const LANGUAGE_QUEST_FINAL_EXAM_TYPES = new Set([
  "SELECT",
  "ASSIST",
  "CLOZE",
  "ODD_ONE_OUT",
  "GRAMMAR_TRANSFORM",
  "DICTATION",
]);

export type LanguageQuestFinalExamStatus =
  | "IN_PROGRESS"
  | "PASSED"
  | "FAILED"
  | "TERMINATED"
  | "EXPIRED";

export interface LanguageQuestFinalExamAnswer {
  challengeId: string;
  optionId: string | null;
  typedAnswer?: string | null;
}

export interface LanguageQuestFinalExamAnswerKey {
  challengeId: string;
  correctOptionId: string;
  type?: string;
  correctText?: string;
}

export function languageQuestFinalExamRequiredCorrect(total: number): number {
  return Math.ceil(Math.max(0, total) * LANGUAGE_QUEST_FINAL_EXAM_PASS_RATIO);
}

export function languageQuestFinalExamSubmissionMatchesDeck(
  deckChallengeIds: readonly string[],
  submittedChallengeIds: readonly string[],
): boolean {
  if (deckChallengeIds.length === 0 || deckChallengeIds.length !== submittedChallengeIds.length) return false;
  return deckChallengeIds.every((challengeId, index) => submittedChallengeIds[index] === challengeId)
    && new Set(submittedChallengeIds).size === submittedChallengeIds.length;
}

export function languageQuestFinalExamResult(
  answers: readonly LanguageQuestFinalExamAnswer[],
  answerKey: readonly LanguageQuestFinalExamAnswerKey[],
) {
  const answerByChallenge = new Map(answers.map((answer) => [answer.challengeId, answer]));
  const results = answerKey.map((entry) => {
    const answer = answerByChallenge.get(entry.challengeId);
    return {
      challengeId: entry.challengeId,
      correct: entry.type === "DICTATION"
        ? languageQuestAnswerMatches(answer?.typedAnswer ?? "", entry.correctText ?? "")
        : answer?.optionId === entry.correctOptionId,
    };
  });
  const correctCount = results.filter((result) => result.correct).length;
  const total = results.length;
  const requiredCorrect = languageQuestFinalExamRequiredCorrect(total);
  return {
    results,
    correctCount,
    total,
    requiredCorrect,
    scorePercent: total ? Math.round((correctCount / total) * 100) : 0,
    passed: total > 0 && correctCount >= requiredCorrect,
  };
}

export function languageQuestFinalExamRetryAt(
  latestAttempt: { status: string; submittedAt?: Date | string | null; updatedAt?: Date | string | null } | null | undefined,
): Date | null {
  if (!latestAttempt || latestAttempt.status === "PASSED" || latestAttempt.status === "IN_PROGRESS") return null;
  const finishedAt = latestAttempt.submittedAt || latestAttempt.updatedAt;
  if (!finishedAt) return null;
  return new Date(new Date(finishedAt).getTime() + LANGUAGE_QUEST_FINAL_EXAM_RETRY_MINUTES * 60_000);
}
import { languageQuestAnswerMatches } from "./languageQuestPinyin";
