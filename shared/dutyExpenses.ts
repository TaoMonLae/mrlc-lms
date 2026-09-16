export const DUTY_EXPENSE_CATEGORIES = [
  'FOOD_CATERING',
  'ACADEMIC',
  'OPERATIONAL',
  'OTHER',
] as const;

export type DutyExpenseCategory = typeof DUTY_EXPENSE_CATEGORIES[number];

function localDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function isBoardingStudent(boardingType: string | null | undefined): boolean {
  return boardingType === 'BOARDING';
}

export function dutyExpenseMatchesAssignmentDate(
  expenseDate: string,
  scheduledDate: Date | string,
): boolean {
  const parsed = scheduledDate instanceof Date ? scheduledDate : new Date(scheduledDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(expenseDate)
    && localDateKey(parsed) === expenseDate;
}

export function dutyExpenseIsNotFuture(
  expenseDate: string,
  now: Date = new Date(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate)) return false;
  return expenseDate <= localDateKey(now);
}
