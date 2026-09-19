/** Validate marks without turning an unmarked response into a zero. */
export function manualGradeScores(input: any, maxPoints: number, criteria: { id: string; maxScore: number }[] = []) {
  const mark = (value: unknown, max: number): number | null => {
    if (value == null || value === '') return null;
    if ((typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > max) {
      throw new Error(`Score must be between 0 and ${max}`);
    }
    return Number(value);
  };
  let score = mark(input.score, maxPoints);
  const scoreOverride = mark(input.scoreOverride, maxPoints);
  const secondMarkerScore = mark(input.secondMarkerScore, maxPoints);
  let criterionScores: Record<string, number> | null = null;
  if (criteria.length) {
    const raw = input.criterionScores ?? {};
    if (typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(id => !criteria.some(c => c.id === id))) throw new Error('Rubric criteria have changed. Reload before marking.');
    criterionScores = {};
    for (const criterion of criteria) {
      const value = mark(raw[criterion.id], criterion.maxScore);
      if (value !== null) criterionScores[criterion.id] = value;
    }
    score = Object.keys(criterionScores).length === criteria.length ? Object.values(criterionScores).reduce((sum, value) => sum + value, 0) : null;
    if (score !== null) mark(score, maxPoints);
  }
  if (['GRADED', 'MODERATED'].includes(input.status) && score === null && scoreOverride === null) throw new Error(criteria.length ? 'Mark every rubric criterion before saving a grade.' : 'Enter a score before saving a grade.');
  if (scoreOverride !== null && !String(input.overrideReason ?? '').trim()) throw new Error('Add a reason for the score override.');
  return { score, scoreOverride, secondMarkerScore, criterionScores };
}
