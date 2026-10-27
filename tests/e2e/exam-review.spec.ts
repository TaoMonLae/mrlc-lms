import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';

test.use({ serviceWorkers: 'block' });
async function fixture(page: Page, role: 'TEACHER' | 'STUDENT') {
  const user = { id: 'review-user', role, firstName: 'Exam', lastName: 'Reviewer', isActive: true, cursorEffect: 'NONE' };
  await page.addInitScript(({ user, release }) => {
    sessionStorage.setItem('auth_token', 'fixture'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
  }, { user, release: CURRENT_RELEASE.id });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
}

test('teacher can isolate pending answers and open the correct marking form', async ({ page }, info) => {
  await fixture(page, 'TEACHER');
  const common = { type: 'ESSAY', passageText: null, imageUrl: null, explanation: null, maxPoints: 5, correctAnswer: 'A model response.', blankRows: [], answerKeyCorrected: false };
  await page.route('**/api/exams/e1/results', route => route.fulfill({ json: {
    exam: { id: 'e1', title: 'Science checkpoint', className: 'GED', subject: 'Science', studentCount: 1 },
    attempts: [{ id: 'a1', studentName: 'Ada Lee', studentCode: 'S1', attemptNumber: 1, score: null, totalMarks: 10, status: 'NEEDS_GRADING', completedAt: null, questions: [
      { ...common, id: 'q1', number: 1, text: 'Explain evaporation.', studentAnswer: 'Water becomes vapour.\nHeat adds energy.', pointsAwarded: null, status: 'PENDING' },
      { ...common, id: 'q2', number: 2, text: 'Explain condensation.', studentAnswer: 'Water vapour cools.', pointsAwarded: 4, status: 'PARTIAL' },
    ] }],
  } }));
  await page.goto('/exams/e1/results');
  await expect(page.getByLabel('Answer summary')).toContainText('1 partial');
  await expect(page.getByText('Model answer', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'Pending grading (1)', exact: true }).click();
  await expect(page.getByText('Explain evaporation.', { exact: true })).toBeVisible();
  await expect(page.getByText('Explain condensation.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Grade this response' })).toHaveAttribute('href', '/exam2/grade/a1/q1?examId=e1&status=ALL');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', await page.locator('body').evaluate(el => el.clientWidth));
  await page.screenshot({ path: info.outputPath('teacher-review.png'), fullPage: true });
});

test('released student review displays paragraphs, model answers and zero marks', async ({ page }, info) => {
  await fixture(page, 'STUDENT');
  await page.route('**/api/attempts/a1/result', route => route.fulfill({ json: {
    released: true, score: 0, totalMarks: 5,
    questions: [{ id: 'q1', type: 'ESSAY', text: 'Explain your reasoning.', yourAnswer: 'First paragraph.\nSecond paragraph.', correctAnswer: 'Model paragraph.', pointsAwarded: 0, maxPoints: 5, feedback: 'Identify the claim.\nThen explain the evidence.' }],
  } }));
  await page.goto('/exam2/attempts/a1/result');
  await expect(page.getByRole('heading', { name: 'Answer review' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Question 1' })).toContainText('0 / 5 pts');
  await expect(page.getByText('Model answer', { exact: true })).toBeVisible();
  await expect(page.getByText('First paragraph.\nSecond paragraph.')).toHaveCSS('white-space', 'pre-wrap');
  await expect(page.getByText('Identify the claim.\nThen explain the evidence.')).toHaveCSS('white-space', 'pre-wrap');
  await page.screenshot({ path: info.outputPath('student-review.png'), fullPage: true });
});
