import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { dutyExpenseToday } from '../../shared/dutyExpenses';
import { chromium, type Browser } from '@playwright/test';

const url = process.env.FINANCE_TEST_DATABASE_URL;
const base = process.env.DUTY_TEST_BASE_URL;
const secret = process.env.DUTY_TEST_SESSION_SECRET;
const enabled = Boolean(url && new URL(url).hostname === '127.0.0.1' && new URL(url).port === '55439'
  && base && new URL(base).hostname === '127.0.0.1' && secret);

// Opt-in HTTP integration suite. Never connects to the school's DATABASE_URL.
test('boarding student entry is connected to Finance review', { skip: !enabled }, async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  const suffix = randomUUID();
  const users: string[] = []; const students: string[] = []; const expenses: string[] = [];
  let rosterId: string | undefined; let dutyId: string | undefined;
  let browser: Browser | undefined;
  const request = async (role: string, userId: string, path: string, body?: unknown) => {
    const token = jwt.sign({ role, userId, email: `${userId}@example.test` }, secret!, { expiresIn: '5m' });
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    for (const [index, boardingType] of ['BOARDING', 'DAY', 'BOARDING'].entries()) {
      const user = await db.user.create({ data: { email: `${boardingType}-${index}-${suffix}@example.test`, firstName: 'Expense', lastName: 'Test', role: 'STUDENT' } });
      users.push(user.id);
      const student = await db.student.create({ data: { userId: user.id, studentCode: `${boardingType}-${index}-${suffix}`, boardingType, preferredName: 'Duty tester' } });
      students.push(student.id);
    }
    const today = dutyExpenseToday();
    const date = new Date(`${today}T00:00:00Z`);
    const roster = await db.dutyRoster.create({ data: { name: `Expense test ${suffix}`, startDate: date, endDate: date, status: 'ACTIVE' } }); rosterId = roster.id;
    const duty = await db.dutyDefinition.create({ data: { name: 'Cooking test', code: suffix, type: 'COOKING' } }); dutyId = duty.id;
    const assignment = await db.dutyAssignment.create({ data: { studentId: students[0], rosterId, dutyDefinitionId: dutyId, scheduledDate: date } });
    const input = { dutyAssignmentId: assignment.id, title: `Groceries ${suffix}`, description: 'Vegetables for school dinner', category: 'FOOD_CATERING', amount: 32.5, expenseDate: today, merchantName: 'Test market', receiptReference: suffix };
    assert.equal((await request('STUDENT', users[1], '/api/student-duty-expenses', input)).status, 403);
    assert.equal((await request('STUDENT', users[2], '/api/student-duty-expenses', input)).status, 403);
    assert.equal((await request('STUDENT', users[0], '/api/student-duty-expenses', { ...input, amount: 0 })).status, 400);
    assert.equal((await request('STUDENT', users[0], '/api/student-duty-expenses', { ...input, expenseDate: '2026-02-30' })).status, 400);
    let submitted;
    let studentPage;
    if (process.env.DUTY_TEST_BROWSER_PATH) {
      browser = await chromium.launch({ headless: true, executablePath: process.env.DUTY_TEST_BROWSER_PATH });
      studentPage = await browser.newPage();
      const token = jwt.sign({ role: 'STUDENT', userId: users[0], email: `BOARDING-${suffix}@example.test` }, secret!, { expiresIn: '5m' });
      await studentPage.addInitScript(({ token, userId }) => {
        sessionStorage.setItem('auth_token', token);
        sessionStorage.setItem('auth_user', JSON.stringify({ id: userId, role: 'STUDENT', firstName: 'Expense', lastName: 'Test', boardingType: 'BOARDING', isActive: true }));
        localStorage.setItem(`mrlc:release-seen:${userId}`, '2026-09-06-language-quest-course-path');
      }, { token, userId: users[0] });
      await studentPage.goto(`${base}/student/duty-expenses`);
      await studentPage.getByRole('button', { name: 'Add expense', exact: true }).click();
      await studentPage.getByRole('combobox').first().click();
      await studentPage.getByRole('option').filter({ hasText: 'Cooking test' }).click();
      await studentPage.locator('#expense-title').fill(input.title);
      await studentPage.locator('#expense-amount').fill(String(input.amount));
      await studentPage.locator('#expense-description').fill(input.description);
      await studentPage.locator('#merchant-name').fill(input.merchantName);
      await studentPage.locator('#receipt-reference').fill(input.receiptReference);
      const responsePromise = studentPage.waitForResponse(response => response.url().endsWith('/api/student-duty-expenses') && response.request().method() === 'POST');
      await studentPage.getByRole('button', { name: 'Submit for approval', exact: true }).click();
      const response = await responsePromise;
      submitted = { status: response.status(), body: await response.json() };
      await studentPage.getByRole('heading', { name: input.title, exact: true }).waitFor();
    } else submitted = await request('STUDENT', users[0], '/api/student-duty-expenses', input);
    assert.equal(submitted.status, 201, JSON.stringify(submitted.body)); expenses.push(submitted.body.id);
    assert.equal(submitted.body.source, 'STUDENT_DUTY');
    assert.equal(submitted.body.status, 'PENDING_APPROVAL');
    assert.equal(submitted.body.studentId, students[0]);
    assert.equal((await request('STUDENT', users[1], '/api/student-duty-expenses')).body.expenses.length, 0);
    assert.equal((await request('STUDENT', users[0], '/api/expenses')).status, 403);
    const list = await request('ACCOUNTANT', 'independent-finance', `/api/expenses?source=STUDENT_DUTY&search=${encodeURIComponent(`BOARDING-0-${suffix}`)}`);
    assert.equal(list.status, 200, JSON.stringify(list.body));
    assert.ok(list.body.data.some((expense: any) => expense.id === submitted.body.id));
    const approved = await request('ACCOUNTANT', 'independent-finance', `/api/expenses/${submitted.body.id}/approve`, {});
    assert.equal(approved.status, 200, JSON.stringify(approved.body));
    const history = await request('STUDENT', users[0], '/api/student-duty-expenses');
    assert.equal(history.body.expenses.find((expense: any) => expense.id === submitted.body.id).status, 'APPROVED');
    if (studentPage) {
      await studentPage.getByRole('button', { name: 'Refresh status', exact: true }).click();
      await studentPage.getByRole('heading', { name: input.title, exact: true }).waitFor();
      assert.match(await studentPage.locator('article').innerText(), /Approved/);
    }
    await db.dutyRoster.update({ where: { id: rosterId }, data: { status: 'COMPLETED' } });
    const second = await request('STUDENT', users[0], '/api/student-duty-expenses', { ...input, title: `Supplies ${suffix}` });
    assert.equal(second.status, 201, JSON.stringify(second.body)); expenses.push(second.body.id);
    const rejected = await request('ACCOUNTANT', 'independent-finance', `/api/expenses/${second.body.id}/reject`, { reason: 'Please clarify the purchased items' });
    assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
    const rejectedHistory = (await request('STUDENT', users[0], '/api/student-duty-expenses')).body.expenses.find((expense: any) => expense.id === second.body.id);
    assert.equal(rejectedHistory.status, 'REJECTED');
    assert.equal(rejectedHistory.rejectionReason, 'Please clarify the purchased items');
    await db.dutyRoster.update({ where: { id: rosterId }, data: { status: 'DRAFT' } });
    assert.equal((await request('STUDENT', users[0], '/api/student-duty-expenses', input)).status, 400);
  } finally {
    await browser?.close();
    await db.auditLog.deleteMany({ where: { entityId: { in: expenses } } });
    await db.expense.deleteMany({ where: { studentId: { in: students } } });
    if (rosterId) await db.dutyRoster.delete({ where: { id: rosterId } });
    if (dutyId) await db.dutyDefinition.delete({ where: { id: dutyId } });
    await db.student.deleteMany({ where: { id: { in: students } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
});
