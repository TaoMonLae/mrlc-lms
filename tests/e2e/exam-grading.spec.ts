import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
test.use({ serviceWorkers: 'block' });
async function fixture(page: Page, rubric = false) {
  const user = { id: 'grading-teacher', role: 'TEACHER', firstName: 'Teacher', lastName: 'Test', isActive: true, cursorEffect: 'NONE' };
  const flags = { failed: false, missing: false };
  const writes: any[] = [];
  const row: any = { id: 'g1', attemptId: 'a1', questionId: 'q1', status: 'IN_REVIEW', score: null, isFinalized: false, question: { text: 'Explain evaporation.', points: 10 }, answer: { answerText: 'Liquid water changes to vapour when heated.', maxPoints: 5 }, attempt: { exam: { title: 'Science checkpoint' }, student: { user: { firstName: 'Ada', lastName: 'Lee' } } }, rubric: rubric ? { id: 'r1', title: 'Explanation rubric', criteria: [{ id: 'c1', label: 'Understanding', maxScore: 3 }, { id: 'c2', label: 'Clarity', maxScore: 2 }] } : null };
  await page.addInitScript(({ user, release }) => { sessionStorage.setItem('auth_token', 'test'); sessionStorage.setItem('auth_user', JSON.stringify(user)); localStorage.setItem(`mrlc:release-seen:${user.id}`, release); }, { user, release: CURRENT_RELEASE.id });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/grading/queue') return route.fulfill(flags.failed ? { status: 503, json: { error: 'Grading temporarily unavailable' } } : { json: flags.missing ? [] : [row] });
    if (path === '/api/grading/a1/q1') { const body = route.request().postDataJSON(); writes.push(body); Object.assign(row, body); return route.fulfill({ json: row }); }
    if (path === '/api/grading/g1/finalize') { row.isFinalized = true; return route.fulfill({ json: { gradeId: 'g1', attemptFinalized: true } }); }
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  return { flags, writes };
}
test('teacher sees answer context, saves zero and returns to the same queue filter', async ({ page }, info) => {
  const { writes } = await fixture(page);
  await page.goto('/exam2/grading?examId=e1&status=IN_REVIEW');
  await page.getByRole('link').filter({ hasText: 'Ada Lee' }).click();
  await expect(page.getByText('Explain evaporation.', { exact: true })).toBeVisible();
  await expect(page.getByText('Ada Lee · 5 points available')).toBeVisible();
  await page.getByLabel('Score (out of 5)').fill('0');
  await page.getByLabel('Feedback for the student').fill('Please explain how heat changes water.');
  await page.getByRole('button', { name: 'Save grade', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Grade saved.' })).toBeVisible();
  expect(writes[0].score).toBe(0);
  await page.screenshot({ path: info.outputPath('grading.png') });
  await page.getByRole('button', { name: 'Back to grading queue' }).click();
  await expect(page.getByLabel('Grading status')).toHaveValue('IN_REVIEW');
  await expect(page).toHaveURL(/examId=e1&status=IN_REVIEW/);
});
test('failed or missing response cannot open a blank editable grade', async ({ page }) => {
  const { flags } = await fixture(page); flags.failed = true;
  await page.goto('/exam2/grade/a1/q1');
  await expect(page.getByRole('alert')).toContainText('unavailable');
  await expect(page.getByRole('button', { name: 'Save grade', exact: true })).toHaveCount(0);
  flags.failed = false; flags.missing = true;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('no longer have access');
  flags.missing = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByLabel('Score (out of 5)')).toBeVisible();
});
test('unfinished rubric saves as draft and finalization requires complete marks', async ({ page }) => {
  const { writes } = await fixture(page, true);
  await page.goto('/exam2/grade/a1/q1?examId=e1&status=IN_REVIEW');
  await page.getByLabel('Understanding · 3 points').fill('0');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  expect(writes[0].score).toBeNull();
  await page.getByRole('button', { name: 'Finalize', exact: true }).click();
  await expect(page.getByText('Mark every rubric criterion before saving a grade.')).toBeVisible();
  expect(writes).toHaveLength(1);
  await page.getByLabel('Clarity · 2 points').fill('1.5');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Finalize', exact: true }).click();
  await expect(page.getByText('This grade is finalized and locked.')).toBeVisible();
  expect(writes[1].score).toBe(1.5);
  await expect(page.getByRole('button', { name: 'Save grade', exact: true })).toBeDisabled();
});
