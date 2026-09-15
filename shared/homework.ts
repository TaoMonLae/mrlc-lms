import {
  MAX_GRADE_ITEM_MARKS,
  parseGradeItemMaxMarks,
} from "./gradebook";

export const HOMEWORK_MAX_MARKS = MAX_GRADE_ITEM_MARKS;

/**
 * Homework may be check-off only, but scored homework must remain compatible
 * with the gradebook it can later be synced into.
 */
export function parseHomeworkMaxMarks(
  value: unknown,
): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return parseGradeItemMaxMarks(value) ?? undefined;
}
