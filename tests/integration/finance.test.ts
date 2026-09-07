import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { collectSchoolFee, recordExpensePayment, reviewExpense } from '../../lib/financeOperations';

const url = process.env.FINANCE_TEST_DATABASE_URL;
// Opt-in integration suite: never uses DATABASE_URL or school records.
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55439');
test('finance controls against isolated PostgreSQL', { skip: !enabled }, async t => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const ids: string[] = []; const budgets: string[] = [];
  const actor = { userId: 'independent-reviewer', email: 'reviewer@example.test' };
  const invoice = async (amount = 100, status: 'APPROVED' | 'PENDING_APPROVAL' = 'APPROVED', budgetId?: string) => {
    const expense = await db.expense.create({ data: { title: 'Finance integration ' + randomUUID(), amount, taxAmount: 0, category: 'ACADEMIC', expenseDate: new Date('2026-01-01'), status, submittedById: 'preparer', budgetId } });
    ids.push(expense.id); return expense;
  };
  try {
    await t.test('two simultaneous full payments produce exactly one receipt', async () => {
      const expense = await invoice();
      const results = await Promise.allSettled([1, 2].map(() => recordExpensePayment(db, expense.id, actor, { paymentMethod: 'CASH' })));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(await db.billPayment.count({ where: { expenseId: expense.id } }), 1);
      assert.equal((await db.expense.findUniqueOrThrow({ where: { id: expense.id } })).status, 'PAID');
      assert.equal(await db.auditLog.count({ where: { entityId: expense.id, action: 'EXPENSE_PAID' } }), 1);
    });
    await t.test('concurrent instalments cannot exceed the gross invoice', async () => {
      const expense = await invoice();
      const results = await Promise.allSettled([1, 2].map(() => recordExpensePayment(db, expense.id, actor, { paymentMethod: 'BANK_TRANSFER', amount: 60 })));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      const result = await recordExpensePayment(db, expense.id, actor, { paymentMethod: 'BANK_TRANSFER', amount: 40 });
      assert.equal(result.expense.status, 'PAID');
      assert.equal(result.expense.payments.reduce((s, p) => s + p.amount, 0), 100);
    });
    await t.test('self approval fails and independent approval succeeds', async () => {
      const expense = await invoice(100, 'PENDING_APPROVAL');
      await assert.rejects(reviewExpense(db, expense.id, { ...actor, userId: 'preparer' }, 'APPROVED'), /different finance officer/);
      assert.equal((await reviewExpense(db, expense.id, actor, 'APPROVED')).status, 'APPROVED');
    });
    await t.test('concurrent approvals cannot overcommit a strict budget', async () => {
      const budget = await db.budget.create({ data: { name: 'Test strict budget', fiscalYear: 2026, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), allocatedAmount: 100, remainingAmount: 100, strictLimit: true } }); budgets.push(budget.id);
      const a = await invoice(60, 'PENDING_APPROVAL', budget.id); const b = await invoice(60, 'PENDING_APPROVAL', budget.id);
      const results = await Promise.allSettled([a, b].map(e => reviewExpense(db, e.id, actor, 'APPROVED')));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal((await db.budget.findUniqueOrThrow({ where: { id: budget.id } })).spentAmount, 60);
    });
    await t.test('concurrent fee collections cannot overpay a school charge', async () => {
      const student = await db.student.create({ data: { studentCode: 'TEST-' + randomUUID() } });
      const fee = await db.feePayment.create({ data: { studentId: student.id, amount: 100, dueDate: new Date('2026-01-01'), paidAmount: 0, status: 'PENDING' } });
      try {
        const results = await Promise.allSettled([1, 2].map(() => collectSchoolFee(db, fee.id, actor, { amount: 70 })));
        assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
        assert.equal((await db.feePayment.findUniqueOrThrow({ where: { id: fee.id } })).paidAmount, 70);
        await assert.rejects(collectSchoolFee(db, fee.id, actor, { amount: 31 }), /exceeds/);
        assert.equal((await collectSchoolFee(db, fee.id, actor, { amount: 30 })).status, 'PAID');
      } finally {
        await db.auditLog.deleteMany({ where: { entityId: fee.id } }); await db.feeCollection.deleteMany({ where: { feePaymentId: fee.id } }); await db.feePayment.delete({ where: { id: fee.id } }); await db.student.delete({ where: { id: student.id } });
      }
    });
  } finally {
    await db.auditLog.deleteMany({ where: { entityId: { in: ids } } });
    await db.billPayment.deleteMany({ where: { expenseId: { in: ids } } });
    await db.expense.deleteMany({ where: { id: { in: ids } } });
    await db.budget.deleteMany({ where: { id: { in: budgets } } });
    await db.$disconnect();
  }
});
