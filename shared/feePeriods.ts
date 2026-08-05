export type FeeMonthOption = { value: string; label: string };

const FEE_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function normalizeFeeMonth(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return FEE_MONTH_PATTERN.test(trimmed) ? trimmed : null;
}

export function feeMonthRange(value: unknown): { start: Date; endExclusive: Date } | null {
  const month = normalizeFeeMonth(value);
  if (!month) return null;
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1)),
    endExclusive: new Date(Date.UTC(year, monthNumber, 1)),
  };
}

export function feeYearRange(value: unknown): { start: Date; endExclusive: Date } | null {
  const year = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    endExclusive: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

export function feeMonthLabel(value: string, locale?: string): string {
  const range = feeMonthRange(value);
  if (!range) return value;
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(range.start);
}

export function feeMonthOptions(
  now = new Date(),
  monthsBack = 24,
  monthsForward = 12,
  locale?: string,
): FeeMonthOption[] {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const options: FeeMonthOption[] = [];
  const offsets = [
    0,
    ...Array.from({ length: monthsBack }, (_, index) => -(index + 1)),
    ...Array.from({ length: monthsForward }, (_, index) => index + 1),
  ];
  for (const offset of offsets) {
    const date = new Date(Date.UTC(currentYear, currentMonth + offset, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: feeMonthLabel(value, locale) });
  }
  return options;
}
