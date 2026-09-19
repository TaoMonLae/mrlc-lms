import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
test.use({ serviceWorkers: 'block' });
test.describe.configure({ mode: 'parallel' });
async function fixture(page: Page) {
  const user = { id: 'module-admin', role: 'ADMIN', status: 'ACTIVE', firstName: 'Module', lastName: 'Admin', isActive: true, cursorEffect: 'NONE' };
  await page.addInitScript(({ user, release }) => { sessionStorage.setItem('auth_token', 'fixture'); sessionStorage.setItem('auth_user', JSON.stringify(user)); localStorage.setItem(`mrlc:release-seen:${user.id}`, release); }, { user, release: CURRENT_RELEASE.id });
  const writes: string[] = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (route.request().method() !== 'GET') writes.push(path);
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  return { writes };
}
for (const [path, api, title] of [
  ['/fee-structures', '/api/fee-structures', 'Fee Structures'], ['/fee-assignments', '/api/fee-assignments', 'Fee Assignments'],
  ['/fee-discounts', '/api/fee-discounts', 'Fee Discounts'], ['/vendors', '/api/vendors', 'Vendors'],
  ['/donations/campaigns', '/api/campaigns', 'Donation Campaigns'], ['/budgets', '/api/budgets', 'Budgets'],
  ['/duties/definitions', '/api/duty-definitions', 'Duty Definitions'], ['/duties/rosters', '/api/duty-rosters', 'Duty Rosters'],
]) test(`${title} distinguishes unavailable data from an empty list and retries`, async ({ page }) => {
  await fixture(page); let failed = true;
  await page.route(`**${api}`, route => route.fulfill(failed ? { status: 503, json: { error: 'Service unavailable' } } : { json: [] }));
  await page.goto(path);
  await expect(page.getByRole('alert')).toContainText('Service unavailable');
  failed = false; await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('#main-content h1')).toBeVisible();
});
for (const path of ['/budgets/missing/edit', '/vendors/missing/edit', '/expenses/missing/edit', '/fee-structures/missing/edit', '/users/missing/edit']) test(`${path} does not open an editable blank record on failure`, async ({ page }) => {
  await fixture(page);
  await page.route('**/api/**/missing', route => route.fulfill({ status: 503, json: { error: 'Unavailable' } }));
  await page.goto(path);
  await expect(page.getByRole('alert')).toContainText('Unable to load');
  await expect(page.locator('#main-content form')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});
test('report labels describe the loaded data until new filters are applied', async ({ page }) => {
  await fixture(page); let failed = false;
  await page.route('**/api/classes', route => route.fulfill({ json: [{ id: 'c1', name: 'Class One' }] }));
  await page.route('**/api/reports/fees**', route => route.fulfill(failed ? { status: 503, json: { error: 'Unavailable' } } : { json: { currency: 'MYR', rows: [{ studentName: 'Ada', className: 'Class One', expected: 100, paid: 50, balance: 50, status: 'PARTIAL' }], totalExpected: 100, totalCollected: 50, outstanding: 50 } }));
  await page.goto('/reports/fees');
  const report = page.locator('.report-params');
  await expect(report).toContainText('All Classes');
  await page.getByRole('combobox').nth(1).click();
  await page.getByRole('option', { name: 'Class One', exact: true }).click();
  await expect(report).toContainText('All Classes');
  await expect(page.getByRole('status').filter({ hasText: 'Filters changed' })).toBeVisible();
  await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(report).toContainText('Class One');
  failed = true; await page.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Print / PDF' })).toBeDisabled();
});
test('a deep-linked attendance session waits for its roster and submits the right class', async ({ page }) => {
  const { writes } = await fixture(page);
  await page.route('**/api/teacher/classes', route => route.fulfill({ json: [{ id: 'other', name: 'Other class' }] }));
  await page.route('**/api/timetable?**', route => route.fulfill({ json: [{ id: 'session1', classId: 'class1', className: 'Class One', subjectId: 'subject1', subjectName: 'Science', status: 'ACTIVE', scheduleType: 'CLASS', startTime: '09:00', endTime: '10:00' }] }));
  await page.route('**/api/teacher/roster?classId=class1', route => route.fulfill({ json: [{ id: 'student1', studentId: 'S001', name: 'Ada Learner' }] }));
  let saved: any;
  await page.route('**/api/attendance', async route => { saved = route.request().postDataJSON(); await route.fulfill({ json: { ok: true } }); });
  await page.goto('/teacher/attendance?sessionId=session1');
  await expect(page.getByText('Ada Learner', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark All Present' }).click();
  await page.getByRole('button', { name: 'Save Attendance', exact: true }).click();
  await expect.poll(() => saved?.classId).toBe('class1');
  expect(saved.timetableEntryId).toBe('session1');
  expect(saved.records).toEqual([{ studentId: 'student1', status: 'PRESENT', remarks: null }]);
});
test('long dialogs remain inside short viewports and the submit action is reachable', async ({ page }, info) => {
  await fixture(page); await page.setViewportSize({ width: 390, height: 430 });
  await page.goto('/leave');
  await page.getByRole('button', { name: 'New request' }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox(); expect(box!.y).toBeGreaterThanOrEqual(12); expect(box!.y + box!.height).toBeLessThanOrEqual(418);
  await dialog.getByRole('button', { name: 'Submit', exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole('button', { name: 'Submit', exact: true })).toBeInViewport();
  await page.screenshot({ path: info.outputPath('short-screen-dialog.png') });
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});
test('departments require confirmation before deleting a named record', async ({ page }) => {
  const { writes } = await fixture(page);
  await page.route('**/api/departments', route => route.fulfill({ json: [{ id: 'd1', name: 'Science' }] }));
  await page.goto('/staff/departments');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete department Science' }).click();
  expect(writes).not.toContain('/api/departments/d1');
  await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
});
test('case notes state their actual visibility and failed case loads can retry', async ({ page }) => {
  await fixture(page); let failed = true;
  await page.route('**/api/cases/case1', route => route.fulfill(failed ? { status: 503, json: { error: 'Case service unavailable' } } : { json: { id: 'case1', title: 'Student support', status: 'OPEN', priority: 'LOW', notes: [] } }));
  await page.goto('/cases/case1');
  await expect(page.getByRole('alert')).toContainText('Case service unavailable');
  failed = false; await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Notes are shared with people who can access this case.')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /private note/i })).toHaveCount(0);
});
test('subject tabs show their selected state and remain keyboard accessible', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/subjects/subject1', route => route.fulfill({ json: { id: 'subject1', name: 'Mathematics', code: 'MATH', status: 'ACTIVE', classes: [], teachers: [], exams: [] } }));
  await page.goto('/subjects/subject1');
  const tab = page.getByRole('tab', { name: 'Classes', exact: true });
  await tab.click(); await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => tab.evaluate(el => getComputedStyle(el).borderBottomColor)).not.toBe('rgba(0, 0, 0, 0)');
  await tab.press('ArrowRight'); await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'Teachers', exact: true })).toHaveAttribute('aria-selected', 'true');
});
test('navigation starts the next module at the top of the workspace', async ({ page }, info) => {
  await fixture(page);
  await page.route('**/api/departments', route => route.fulfill({ json: Array.from({ length: 45 }, (_, i) => ({ id: `dept-${i}`, name: `Department ${i}` })) }));
  await page.goto('/staff/departments');
  await expect(page.getByRole('button', { name: 'Delete department Department 40', exact: true })).toBeAttached();
  const main = page.locator('#main-content');
  await main.evaluate(el => { el.scrollTop = 600; });
  expect(await main.evaluate(el => el.scrollTop)).toBeGreaterThan(300);
  if (info.project.name.includes('mobile')) await page.getByRole('button', { name: 'Toggle sidebar navigation' }).click();
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect.poll(() => main.evaluate(el => el.scrollTop)).toBe(0);
});
