import type { AnswerSummary } from '../../../shared/examReview';

export default function AttemptAnswerSummary({ summary }: { summary: AnswerSummary | null | undefined }) {
  if (!summary) return null;
  return (
    <div aria-label="Answer summary" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <span className="font-medium text-emerald-700 dark:text-emerald-300">{summary.correct} correct</span>
      <span className="font-medium text-rose-700 dark:text-rose-300">{summary.incorrect} incorrect</span>
      <span className="font-medium text-orange-700 dark:text-orange-300">{summary.partial} partial</span>
      <span className="font-medium text-amber-700 dark:text-amber-300">{summary.pending} to grade</span>
    </div>
  );
}
