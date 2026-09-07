import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
const fixturePath = '/tmp/mrlc-finance-fixtures.json';
test.skip(!fs.existsSync(fixturePath), 'Create disposable fixtures using scripts/finance-test-fixtures.ts');
const fixtures = fs.existsSync(fixturePath) ? JSON.parse(fs.readFileSync(fixturePath, 'utf8')) : {};
const headers = { Authorization: `Bearer ${fixtures.token}` };

test('cash reports exclude in-kind and foreign currency, and recognize receipt dates', async ({ request }) => {
  const summary = await request.get('/api/financial-reports/summary?fiscalYear=2026', { headers });
  expect(summary.ok()).toBeTruthy(); expect((await summary.json()).income.donations).toBe(18000);
  const report = await request.get('/api/financial-reports/income-expense?startDate=2026-08-01&endDate=2026-08-31', { headers });
  const body = await report.json(); expect(report.ok()).toBeTruthy();
  expect(body.income.total).toBe(18000); expect(body.income.detail).toHaveLength(1);
  const cash = await request.get('/api/financial-reports/cash-flow?startDate=2026-01-01&endDate=2027-12-31', { headers });
  const data = await cash.json(); expect(data.monthlyCashFlow).toHaveLength(24);
  expect(data.monthlyCashFlow[6].inflow.total).toBe(0); expect(data.monthlyCashFlow[7].inflow.total).toBe(18000);
  expect(data.summary.endingBalance).toBe(data.summary.netCashFlow);
});
test('API denies students and rejects invalid periods', async ({ request }) => {
  expect((await request.get('/api/financial-reports/summary', { headers: { Authorization: `Bearer ${fixtures.studentToken}` } })).status()).toBe(403);
  expect((await request.get('/api/financial-reports/summary?startDate=2026-02-31&endDate=2026-03-01', { headers })).status()).toBe(400);
});
test('new donation is a non-deductible pledge by default', async ({ request }) => {
  const response = await request.post('/api/donations', { headers, data: { donorId: fixtures.donor, amount: 10, donationDate: '2026-09-01' } });
  expect(response.status()).toBe(201); const gift = await response.json();
  expect(gift.isTaxDeductible).toBe(false); expect(gift.status).toBe('PENDING');
  expect((await request.delete(`/api/donations/${gift.id}`, { headers })).ok()).toBeTruthy();
});
for (const viewport of [{ name: 'desktop', width: 1440, height: 1050 }, { name: 'mobile', width: 390, height: 844 }]) {
  test(`finance overview and instalment form work on ${viewport.name}`, async ({ page, request }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(token => { sessionStorage.setItem('auth_token', token); const user = JSON.parse(atob(token.split('.')[1])); localStorage.setItem('mrlc:release-seen:' + user.userId, '2026-09-06-language-quest-course-path'); }, fixtures.token);
    await page.goto('/financial');
    await expect(page.getByRole('heading', { name: 'Finance overview' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Financial position' })).toContainText('18,000');
    await expect(page.getByText('Classroom learning supplies', { exact: true })).toBeVisible();
    await page.screenshot({ path: `/tmp/finance-${viewport.name}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
    const violations = (await new AxeBuilder({ page }).include('.finance-workspace').withTags(['wcag2a','wcag2aa']).analyze()).violations.filter(v => ['serious','critical'].includes(v.impact || ''));
    expect(violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
    const before = await (await request.get(`/api/expenses/${fixtures.payable}`, { headers })).json();
    const expectedBalance = before.amount + (before.taxAmount || 0) - before.payments.reduce((sum: number, p: any) => sum + p.amount, 0) - 100;
    if (viewport.name === 'desktop') {
      await page.getByRole('button', { name: 'Toggle theme between light and dark mode' }).click();
      await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
      await expect(page.locator('html')).toHaveClass(/dark/);
      await page.screenshot({ path: '/tmp/finance-dark.png' });
      const darkViolations = (await new AxeBuilder({ page }).include('.finance-workspace').withTags(['wcag2a','wcag2aa']).analyze()).violations.filter(v => ['serious','critical'].includes(v.impact || ''));
      expect(darkViolations.map(v => v.id)).toEqual([]);
      await page.getByRole('button', { name: 'Toggle theme between light and dark mode' }).click();
      await page.getByRole('menuitem', { name: 'Light', exact: true }).click();
    }
    await page.goto(`/expenses/${fixtures.payable}`);
    await page.getByRole('button', { name: 'Record Payment', exact: true }).click();
    await expect(page.getByRole('form', { name: 'Record expense payment' })).toBeVisible();
    await page.getByLabel('Amount (MYR)', { exact: true }).fill('100');
    await page.getByLabel('Bank or receipt reference').fill(`TEST-${viewport.name}-${Date.now()}`);
    await page.getByLabel('Paying account or cash box').fill('School operating account');
    await page.screenshot({ path: `/tmp/finance-payment-${viewport.name}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Confirm payment record' }).click();
    await expect(page.getByRole('form', { name: 'Record expense payment' })).not.toBeVisible();
    await expect(page.getByRole('region', { name: 'Expense payment position' })).toContainText(expectedBalance.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  });
}
