export const DUTY_EXPENSE_CATEGORIES = [
  'FOOD_CATERING',
  'ACADEMIC',
  'OPERATIONAL',
  'OTHER',
] as const;

export type DutyExpenseCategory = typeof DUTY_EXPENSE_CATEGORIES[number];

export function dutyExpenseToday(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dutyExpenseRosterEligible(status: string): boolean {
  return ['PUBLISHED', 'ACTIVE', 'COMPLETED'].includes(status);
}

export function dutyExpenseAssignmentEligible(status: string): boolean {
  return ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED'].includes(status);
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
  // Duty dates are stored as UTC calendar dates, not server-local timestamps.
  return validDateKey(expenseDate) && parsed.toISOString().slice(0, 10) === expenseDate;
}

export function dutyExpenseIsNotFuture(
  expenseDate: string,
  now: Date = new Date(),
): boolean {
  return validDateKey(expenseDate) && expenseDate <= dutyExpenseToday(now);
}
