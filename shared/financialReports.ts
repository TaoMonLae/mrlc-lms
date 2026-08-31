export interface ExpenseAmountInput {
  amount: number;
  taxAmount?: number | null;
}

export interface OutstandingFeeInput {
  amount: number;
  paidAmount?: number | null;
}

export class ReportRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportRangeError';
  }
}

export function getExpenseGrossAmount(expense: ExpenseAmountInput): number {
  return expense.amount + (expense.taxAmount ?? 0);
}

export function sumExpenseGrossAmounts(expenses: ExpenseAmountInput[]): number {
  return expenses.reduce((sum, expense) => sum + getExpenseGrossAmount(expense), 0);
}

export function sumOutstandingFeeBalance(fees: OutstandingFeeInput[]): number {
  return fees.reduce(
    (sum, fee) => sum + Math.max(0, fee.amount - (fee.paidAmount ?? 0)),
    0,
  );
}

function parseUtcCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ReportRangeError('Report dates must use YYYY-MM-DD');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ReportRangeError('Invalid report date range');
  }
  return parsed;
}

export function resolveUtcReportRange(
  startDate?: string,
  endDate?: string,
  fiscalYear?: string,
): { gte: Date; lte: Date } {
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new ReportRangeError('startDate and endDate must be provided together');
  }

  if (startDate && endDate) {
    const gte = parseUtcCalendarDate(startDate);
    const lte = parseUtcCalendarDate(endDate);
    lte.setUTCHours(23, 59, 59, 999);
    if (gte > lte) throw new ReportRangeError('startDate must be on or before endDate');
    return { gte, lte };
  }

  const yearText = fiscalYear ?? String(new Date().getUTCFullYear());
  if (!/^\d{4}$/.test(yearText)) {
    throw new ReportRangeError('fiscalYear must be a whole year between 2000 and 2100');
  }
  const year = Number(yearText);
  if (year < 2000 || year > 2100) {
    throw new ReportRangeError('fiscalYear must be a whole year between 2000 and 2100');
  }

  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lte: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}
