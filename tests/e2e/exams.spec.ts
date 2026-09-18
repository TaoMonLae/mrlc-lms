import { CURRENT_RELEASE } from '../../src/data/releases';
import { expect, test, type Page } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
const available = { id: 'exam-a', title: 'Science checkpoint', durationMinutes: 30, openNow: true, requiresAccessCode: true, attemptLimit: 2, attemptsUsed: 0, activeAttemptId: null, availableFrom: null, availableUntil: null };
async function fixture(page: Page, role = 'STUDENT', seconds = 0) {
  const user = { id: `exam-${role}`, role, firstName: 'Exam', lastName: 'Tester', isActive: true, cursorEffect: 'NONE' };
  const writes: { path: string; body: any }[] = [];
  const flags = { failSave: false, failState: false, failResult: false, failTeacher: false };
  await page.addInitScript(({ user, releaseId }) => {
    localStorage.setItem('mrlc-lms-theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    sessionStorage.setItem('auth_token', 'exam-test'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    sessionStorage.setItem('exam_attempt_session_attempt-a', 'session-a');
    localStorage.setItem(`mrlc:release-seen:${user.id}`, releaseId);
  }, { user, releaseId: CURRENT_RELEASE.id });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (route.request().method() === 'POST') writes.push({ path, body: route.request().postDataJSON() });
    if (path === '/api/exam2/available') return route.fulfill({ json: [available] });
    if (path === '/api/exam2/exam-a/start') {
      if (route.request().postDataJSON().accessCode !== 'READY') return route.fulfill({ status: 403, json: { error: 'Invalid access code' } });
      return route.fulfill({ json: { attempt: { id: 'attempt-a', sessionToken: 'session-a' } } });
    }
    if (path.endsWith('/state')) {
      if (flags.failState) { return route.abort('failed'); }
      return route.fulfill({ json: { attempt: { state: 'IN_PROGRESS', sessionToken: 'session-a', remainingSeconds: seconds, canPause: true }, exam: { title: 'Science checkpoint', settings: {} }, questions: [{ id: 'q1', text: 'Explain evaporation.', type: 'ESSAY', points: 5 }, { id: 'q2', text: 'Explain condensation.', type: 'ESSAY', points: 5 }], answers: [] } });
    }
    if (path.endsWith('/save')) {
      if (flags.failSave) { flags.failSave = false; return route.abort('failed'); }
      return route.fulfill({ json: { ok: true, lastSavedAt: new Date().toISOString(), remainingSeconds: seconds } });
    }
    if (path.endsWith('/submit')) return route.fulfill({ json: { ok: true, state: 'PENDING_GRADING' } });
    if (path.endsWith('/result')) {
      if (flags.failResult) { return route.fulfill({ status: 500, json: { error: 'Unavailable' } }); }
      return route.fulfill({ json: { released: false, state: 'PENDING_GRADING', message: 'Your teacher is marking this exam.' } });
    }
    if (path === '/api/teacher/exams') {
      if (flags.failTeacher) { return route.fulfill({ status: 500, json: { error: 'Unavailable' } }); }
      return route.fulfill({ json: [
        { id: 'draft-a', title: 'Draft algebra', status: 'DRAFT' },
        { id: 'exam-a', title: 'Science checkpoint', status: 'NEEDS_GRADING' },
        { id: 'graded-a', title: 'Graded geography', status: 'GRADED' },
      ].map(e => ({ ...e, class: 'Year 1', date: 'Sep 18', duration: '30m', type: 'Assessment', submissions: 1, total: 5 })) });
    }
    if (path === '/api/student/exams') return route.fulfill({ json: { available: [{ id: 'exam-a', title: 'Science checkpoint', subject: 'Science', duration: '30 mins', questions: 2, deadline: null, type: 'QUIZ', activeAttemptId: 'attempt-a' }], submitted: [{ id: 'exam-a', attemptId: 'older-a', title: 'Science checkpoint', subject: 'Science', status: 'Graded', score: '0/10', submittedAt: 'Sep 17' }, { id: 'exam-a', attemptId: 'older-b', title: 'Science checkpoint', subject: 'Science', status: 'Grading', score: null, submittedAt: 'Sep 18' }] } });
    return route.fulfill({ json: path.includes('settings') ? { lockdownBrowserEnabled: false } : [] });
  });
  return { writes, flags };
}

test('teacher tabs filter real content and Grade Now reaches the grading queue', async ({ page }, info) => {
  await fixture(page, 'TEACHER');
  await page.goto('/teacher/exams');
  await page.getByRole('tab', { name: 'Drafts', exact: true }).click();
  await expect(page.getByText('Draft algebra', { exact: true })).toBeVisible();
  await expect(page.getByText('Science checkpoint', { exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Active / Grading' }).click();
  await expect(page.getByText('Science checkpoint', { exact: true })).toBeVisible();
  await expect(page.getByText('Graded geography', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('teacher-exams.png') });
  await page.getByRole('button', { name: 'Grade Now' }).click();
  await expect(page).toHaveURL(/exam2\/grading\?examId=exam-a/);
  await expect(page.getByRole('heading', { name: 'Manual Grading Queue' })).toBeVisible();
});

test('teacher request failures show retry rather than an empty list', async ({ page }) => {
  const { flags } = await fixture(page, 'TEACHER'); flags.failTeacher = true;
  await page.goto('/teacher/exams');
  await expect(page.getByRole('alert')).toContainText('Could not load assessments');
  await expect(page.getByText('No exams found')).toHaveCount(0);
  flags.failTeacher = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('Draft algebra', { exact: true })).toBeVisible();
});

test('legacy exam links retain context and do not start the timer until confirmed', async ({ page }, info) => {
  const { writes } = await fixture(page);
  await page.goto('/exams/exam-a/take');
  await expect(page).toHaveURL(/exam2\/resume\?exam=exam-a/);
  await expect(page.getByLabel('Access code')).toBeVisible();
  expect(writes.filter(w => w.path.endsWith('/start'))).toHaveLength(0);
  await page.getByLabel('Access code').fill('WRONG');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid access code');
  await page.screenshot({ path: info.outputPath('exam-readiness.png') });
  await page.getByLabel('Access code').fill('READY');
  await page.getByRole('button', { name: 'Start exam', exact: true }).click();
  await expect(page).toHaveURL(/attempt-a\/play/);
  await expect(page.getByText('Untimed', { exact: true })).toBeVisible();
});

test('student history preserves repeated attempts and zero marks; resume is reachable', async ({ page }, info) => {
  await fixture(page);
  await page.goto('/student/exams');
  await expect(page.getByRole('button', { name: 'Resume exam' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('student-exams.png') });
  await page.getByRole('tab', { name: 'Submitted (2)' }).click();
  await expect(page.getByText('0/10', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Details' })).toHaveCount(2);
  await page.getByRole('button', { name: 'View Details' }).first().click();
  await expect(page).toHaveURL(/older-a\/result/);
});

test('player recovers a network load failure and retries unsaved answers', async ({ page }, info) => {
  const { flags, writes } = await fixture(page); flags.failState = true;
  await page.goto('/exam2/attempts/attempt-a/play');
  await expect(page.getByRole('alert')).toContainText('Could not load your exam');
  flags.failState = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await page.getByRole('textbox').fill('Liquid changes into water vapour.');
  flags.failSave = true;
  await page.getByRole('button', { name: 'Save answers' }).click();
  await expect(page.getByRole('alert')).toContainText('Connection lost');
  await expect(page.getByRole('textbox')).toHaveValue('Liquid changes into water vapour.');
  await expect(page.getByRole('button', { name: 'Save answers' })).toBeEnabled();
  await page.screenshot({ path: info.outputPath('exam-recovery.png') });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(writes.filter(w => w.path.endsWith('/save')).at(-1)?.body.answers[0].answerText).toBe('Liquid changes into water vapour.');
  await page.getByRole('button', { name: 'Next question', exact: true }).click();
  await expect(page.getByText('Explain condensation.', { exact: true })).toBeVisible();
});

test('expiry submits the final unsaved answer without an intervening state check or save', async ({ page }) => {
  const { writes } = await fixture(page, 'STUDENT', 5);
  await page.goto('/exam2/attempts/attempt-a/play');
  await page.getByRole('textbox').fill('My final answer');
  await expect(page).toHaveURL(/attempt-a\/result/, { timeout: 12000 });
  expect(writes.filter(w => w.path.endsWith('/save'))).toHaveLength(0);
  expect(writes.find(w => w.path.endsWith('/submit'))?.body.answers[0].answerText).toBe('My final answer');
});

test('failed result requests do not claim successful submission and can be retried', async ({ page }) => {
  const { flags } = await fixture(page); flags.failResult = true;
  await page.goto('/exam2/attempts/attempt-a/result');
  await expect(page.getByRole('heading', { name: 'Result unavailable' })).toBeVisible();
  await expect(page.getByText(/Your answers are safely submitted/)).toHaveCount(0);
  flags.failResult = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Results not available yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to my exams' }).click();
  await expect(page).toHaveURL(/student\/exams/);
});


test('exam actions remain unobstructed in dark mode and respect server time extensions', async ({ page }, info) => {
  const { writes } = await fixture(page, 'STUDENT', 2);
  await page.route('**/api/attempts/attempt-a/submit', route => {
    writes.push({ path: '/api/attempts/attempt-a/submit', body: route.request().postDataJSON() });
    return route.fulfill({ json: { ok: false, timed: true, remainingSeconds: 60 } });
  });
  await page.goto('/exam2/attempts/attempt-a/play');
  await page.getByRole('textbox').fill('Answer kept through a time extension');
  await expect(page.getByText('01:00', { exact: true })).toBeVisible({ timeout: 6000 });
  await expect(page.getByRole('textbox')).toBeEnabled();
  await expect(page.getByRole('textbox')).toHaveValue('Answer kept through a time extension');
  await expect(page.getByRole('button', { name: 'Open chat', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'AI School Assistant', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Toggle theme between light and dark mode' }).click();
  await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  const submit = page.getByRole('button', { name: 'Submit exam', exact: true });
  await expect(submit).toBeVisible();
  expect(await submit.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  await page.screenshot({ path: info.outputPath('exam-player-dark.png') });
  expect(writes.find(w => w.path.endsWith('/submit'))?.body.autoSubmit).toBe(true);
});

test('schedule load failure cannot expose empty settings for saving', async ({ page }) => {
  await fixture(page, 'TEACHER');
  let failed = true;
  await page.route('**/api/exams/exam-a/schedule', route => failed
    ? route.fulfill({ status: 500, json: { error: 'Unavailable' } })
    : route.fulfill({ json: { durationMinutes: 30, attemptLimit: 2, totalMarks: 10 } }));
  await page.route('**/api/exams/exam-a/result-policy', route => route.fulfill({ json: { releaseMode: 'AFTER_GRADING' } }));
  await page.goto('/exam2/exam-a/schedule');
  await expect(page.getByRole('alert')).toContainText('Could not load exam settings');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0);
  failed = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByLabel('Duration (minutes)')).toHaveValue('30');
  await expect(page.getByLabel('Release mode')).toHaveValue('AFTER_GRADING');
});
