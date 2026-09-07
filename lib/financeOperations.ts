import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient, PaymentMethod } from '@prisma/client';
import { assertIndependentReviewer, FinanceControlError, moneyMinor, paymentPosition, validateMoney } from '../shared/financeControls';
import { getExpenseGrossAmount, sumExpenseGrossAmounts } from '../shared/financialReports';

type Actor = { userId: string; email: string };
// Retry only a rolled-back serializable transaction, never an uncertain external payment.
export async function financeTransaction<T>(db: PrismaClient, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: 'Serializable' }); }
    catch (error: any) {
      if (error?.code === 'P2034' && attempt < 3) continue;
      if (error?.code === 'P2034') throw new FinanceControlError('Another finance officer changed this record. Refresh and try again.');
      throw error;
    }
  }
}
async function audit(tx: Prisma.TransactionClient, actor: Actor, action: string, entityId: string, description: string) {
  await tx.auditLog.create({ data: { userId: actor.userId, userName: actor.email, action, entityType: 'EXPENSE', entityId, description } });
}
export async function reviewExpense(db: PrismaClient, id: string, actor: Actor, decision: 'APPROVED' | 'REJECTED', note?: string) {
  return financeTransaction(db, async tx => {
    const expense = await tx.expense.findUnique({ where: { id }, include: { budget: true } });
    if (!expense) throw new FinanceControlError('Expense not found', 404);
    if (expense.status !== 'PENDING_APPROVAL') throw new FinanceControlError('Only pending expenses can be reviewed');
    const creator = await tx.auditLog.findFirst({ where: { entityId: id, entityType: 'EXPENSE', action: 'CREATE' }, orderBy: { createdAt: 'asc' } });
    assertIndependentReviewer(actor.userId, expense.submittedById, creator?.userId);
    if (decision === 'APPROVED' && expense.budget) {
      const budget = expense.budget;
      if (budget.status === 'ARCHIVED') throw new FinanceControlError('Cannot approve against an archived budget');
      if (budget.currency !== expense.currency) throw new FinanceControlError('Expense and budget currencies must match');
      const end = new Date(budget.endDate); end.setUTCHours(23, 59, 59, 999);
      if (expense.expenseDate < budget.startDate || expense.expenseDate > end) throw new FinanceControlError('Expense date must fall within the budget period');
      const committed = await tx.expense.findMany({ where: { budgetId: budget.id, status: { in: ['APPROVED', 'PARTIAL', 'PAID'] } } });
      const spentAmount = (moneyMinor(sumExpenseGrossAmounts(committed)) + moneyMinor(getExpenseGrossAmount(expense))) / 100;
      if (budget.strictLimit && moneyMinor(spentAmount) > moneyMinor(budget.allocatedAmount)) throw new FinanceControlError('This approval would exceed the strict budget limit');
      await tx.budget.update({ where: { id: budget.id }, data: { spentAmount, remainingAmount: (moneyMinor(budget.allocatedAmount) - moneyMinor(spentAmount)) / 100, status: spentAmount > budget.allocatedAmount ? 'EXCEEDED' : spentAmount === budget.allocatedAmount ? 'EXHAUSTED' : 'ACTIVE' } });
    }
    const result = await tx.expense.update({ where: { id }, data: { status: decision, approvedAt: new Date(), approvedById: actor.userId, approvedByName: actor.email, ...(decision === 'REJECTED' ? { rejectionReason: note } : { notes: note || undefined }) }, include: { vendor: true, budget: true, payments: true } });
    await audit(tx, actor, `EXPENSE_${decision}`, id, `${decision}: ${expense.title}${note ? `. ${note}` : ''}`);
    return result;
  });
}
export async function recordExpensePayment(db: PrismaClient, id: string, actor: Actor, input: {
  amount?: number; paymentMethod: PaymentMethod; paymentReference?: string | null; bankAccount?: string | null;
  paymentDate?: string; receiptUrl?: string | null; notes?: string | null;
}) {
  return financeTransaction(db, async tx => {
    const expense = await tx.expense.findUnique({ where: { id }, include: { payments: true } });
    if (!expense) throw new FinanceControlError('Expense not found', 404);
    if (!['APPROVED', 'PARTIAL'].includes(expense.status)) throw new FinanceControlError('Expense must be approved and have an unpaid balance');
    const position = paymentPosition(expense, expense.payments, input.amount === undefined ? undefined : Number(input.amount));
    validateMoney(position.amount);
    const date = input.paymentDate ? new Date(input.paymentDate) : new Date();
    if (Number.isNaN(date.getTime()) || date > new Date()) throw new FinanceControlError('Payment date must be valid and cannot be in the future', 400);
    if (date < expense.expenseDate) throw new FinanceControlError('Payment date cannot precede the expense date', 400);
    const reference = input.paymentReference?.trim() || null;
    if (reference && await tx.billPayment.findFirst({ where: { expenseId: id, referenceNumber: reference } })) throw new FinanceControlError('This payment reference has already been recorded for this expense');
    const payment = await tx.billPayment.create({ data: { expenseId: id, paymentNumber: `PAY-${date.getUTCFullYear()}-${randomUUID()}`, amount: position.amount, currency: expense.currency, paymentMethod: input.paymentMethod, paymentDate: date, referenceNumber: reference, bankAccount: input.bankAccount, receiptUrl: input.receiptUrl, notes: input.notes } });
    const result = await tx.expense.update({ where: { id }, data: { status: position.status, paidDate: position.status === 'PAID' ? new Date(Math.max(date.getTime(), ...expense.payments.map(p => p.paymentDate.getTime()))) : null }, include: { vendor: true, budget: true, payments: true } });
    await audit(tx, actor, 'EXPENSE_PAID', id, `Recorded ${payment.paymentNumber}: ${payment.amount} ${payment.currency}; method ${payment.paymentMethod}; reference ${reference || 'not supplied'}`);
    return { payment, expense: result };
  });
}

export async function collectSchoolFee(db: PrismaClient, id: string, actor: Actor, input: { amount: number; paymentDate?: string; paymentMethod?: string; notes?: string }) {
  return financeTransaction(db, async tx => {
    const fee = await tx.feePayment.findUnique({ where: { id } });
    if (!fee) throw new FinanceControlError('Fee record not found', 404);
    if (['PAID', 'WAIVED'].includes(fee.status)) throw new FinanceControlError('This fee is already paid or waived');
    const amount = validateMoney(Number(input.amount));
    const balance = moneyMinor(fee.amount) - moneyMinor(fee.paidAmount);
    if (moneyMinor(amount) > balance) throw new FinanceControlError(`Payment exceeds the remaining fee balance of ${(balance / 100).toFixed(2)}`, 400);
    const date = input.paymentDate ? new Date(input.paymentDate) : new Date();
    if (Number.isNaN(date.getTime()) || date > new Date()) throw new FinanceControlError('Payment date cannot be in the future', 400);
    await tx.feeCollection.create({ data: { feePaymentId: id, amount, currency: fee.currency, paymentDate: date, paymentMethod: input.paymentMethod || fee.paymentMethod, notes: input.notes } });
    const paidAmount = (moneyMinor(fee.paidAmount) + moneyMinor(amount)) / 100;
    const result = await tx.feePayment.update({ where: { id }, data: { paidAmount, status: moneyMinor(amount) === balance ? 'PAID' : 'PARTIAL', paidDate: fee.paidDate && fee.paidDate > date ? fee.paidDate : date, paymentMethod: input.paymentMethod || fee.paymentMethod }, include: { student: { include: { user: true, class: true } } } });
    await tx.auditLog.create({ data: { userId: actor.userId, userName: actor.email, action: 'PAY', entityType: 'PAYMENT', entityId: id, description: `Fee receipt: ${amount} ${fee.currency}. ${input.notes || ''}` } });
    return result;
  });
}

export async function syncDonationCampaign(tx: Prisma.TransactionClient, id?: string | null) {
  if (!id) return;
  const donations = await tx.donation.findMany({ where: { campaignId: id, status: { in: ['RECEIVED', 'PROCESSED'] }, donationType: { not: 'IN_KIND' } } });
  await tx.donationCampaign.update({ where: { id }, data: { raisedAmount: donations.reduce((total, gift) => total + moneyMinor(gift.amount), 0) / 100, donorCount: new Set(donations.map(gift => gift.donorId)).size } });
}
