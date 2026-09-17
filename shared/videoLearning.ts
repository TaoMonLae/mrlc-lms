import { z } from 'zod';
export const videoLearningSchema = z.object({
  examId: z.string().min(1).nullable().default(null),
  homeworkId: z.string().min(1).nullable().default(null),
  requireQuiz: z.boolean().default(false),
  chapters: z.array(z.object({ title: z.string().trim().min(1).max(100), seconds: z.number().int().min(0).max(86400) })).max(100).default([]),
}).superRefine((value, ctx) => {
  if (value.requireQuiz && !value.examId) ctx.addIssue({ code: 'custom', path: ['examId'], message: 'Choose a quiz before requiring it.' });
  if (value.chapters.some((c, i) => i > 0 && c.seconds <= value.chapters[i - 1].seconds)) ctx.addIssue({ code: 'custom', path: ['chapters'], message: 'Chapter timestamps must be in increasing order.' });
});
export type VideoLearningConfig = z.infer<typeof videoLearningSchema>;
export function quizPassed(attempt: { score: number | null; isCompleted: boolean; invalidatedAt?: unknown; gradingStatus?: string | null } | undefined, passMark: number | null) {
  return !!attempt && !attempt.invalidatedAt && attempt.isCompleted && attempt.score != null
    && attempt.gradingStatus !== 'PENDING' && attempt.gradingStatus !== 'IN_REVIEW'
    && passMark != null && attempt.score >= passMark;
}
