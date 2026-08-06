export const GRADE_CATEGORIES = ['ASSIGNMENT', 'QUIZ', 'MIDTERM', 'FINAL', 'MOCK_GED'] as const;

export type GradeCategory = (typeof GRADE_CATEGORIES)[number];

export const MAX_GRADE_ITEM_MARKS = 10_000;
export const MAX_GRADE_ITEM_TITLE_LENGTH = 120;

export function isGradeCategory(value: unknown): value is GradeCategory {
  return typeof value === 'string' && (GRADE_CATEGORIES as readonly string[]).includes(value);
}

export function normalizeGradeItemTitle(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const title = value.trim();
  if (!title || title.length > MAX_GRADE_ITEM_TITLE_LENGTH) return null;
  return title;
}

export function parseGradeItemMaxMarks(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const marks = Number(value);
  if (!Number.isFinite(marks) || marks <= 0 || marks > MAX_GRADE_ITEM_MARKS) return null;
  return marks;
}

export function parseCategoryWeight(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const weight = Number(value);
  if (!Number.isInteger(weight) || weight < 0 || weight > 100) return null;
  return weight;
}

export function parseGradeMarks(value: unknown, maxMarks: number): number | null | undefined {
  if (value === '' || value == null) return null;
  const marks = Number(value);
  if (!Number.isFinite(marks) || marks < 0 || marks > maxMarks) return undefined;
  return marks;
}

export function parseGradeItemDate(value: unknown): Date | null {
  if (value == null || value === '') return new Date();
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
