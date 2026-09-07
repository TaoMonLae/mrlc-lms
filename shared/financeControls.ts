import { getExpenseGrossAmount } from './financialReports';

export class FinanceControlError extends Error {
  constructor(message: string, public status = 409) { super(message); this.name = 'FinanceControlError'; }
}

// MYR ledger calculations use integer sen; storage remains compatible with legacy Float columns.
export function moneyMinor(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > 1e12) throw new FinanceControlError('Invalid monetary amount', 400);
  return Math.round((value + Number.EPSILON) * 100);
}
export function validateMoney(value: number, allowZero = false): number {
  const minor = moneyMinor(value);
  if (minor < (allowZero ? 0 : 1) || Math.abs(value * 100 - minor) > 0.00001) {
    throw new FinanceControlError('Enter a positive amount with at most two decimal places', 400);
  }
  return minor / 100;
}
export function paymentPosition(expense: { amount: number; taxAmount?: number | null }, payments: { amount: number }[], requested?: number) {
  const total = moneyMinor(getExpenseGrossAmount(expense));
  const paid = payments.reduce((sum, payment) => sum + moneyMinor(payment.amount), 0);
  const outstanding = total - paid;
  const amount = requested === undefined ? outstanding / 100 : validateMoney(requested);
  if (outstanding <= 0) throw new FinanceControlError('Expense is already fully paid');
  if (moneyMinor(amount) > outstanding) throw new FinanceControlError(`Payment exceeds outstanding amount of ${(outstanding / 100).toFixed(2)}`, 400);
  return { amount, outstanding: outstanding / 100, status: moneyMinor(amount) === outstanding ? 'PAID' as const : 'PARTIAL' as const };
}
export function assertIndependentReviewer(actorId: string, submitterId?: string | null, creatorId?: string | null) {
  if (actorId === submitterId || actorId === creatorId) throw new FinanceControlError('A different finance officer must review this expense. You cannot approve or reject your own submission.', 403);
}
