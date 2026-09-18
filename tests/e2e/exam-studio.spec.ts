import { test, expect, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
test.use({ serviceWorkers: 'block' });
const choice = { id: 'q1', type: 'MCQ', text: 'Which planet is closest to the Sun?', points: 5, options: ['Mercury', 'Earth', 'Mars', 'Venus'], correctAnswer: '0' };
async function setup(page: Page, questions: any[] = [], attempts: any[] = []) {
  const user = { id: 'studio-teacher', role: 'TEACHER', firstName: 'Exam', lastName: 'Teacher', isActive: true, cursorEffect: 'NONE' };
  const writes: { path: string; body: any }[] = [];
  const state = { failLoad: false, failSchedule: false, failAI: true, policy: { releaseMode: 'HIDDEN', showScore: true, showCorrectAnswers: false, showPassFail: false, releaseAt: null } as any };
  await page.addInitScript(({ user, releaseId }) => {
    sessionStorage.setItem('auth_token', 'studio-test'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, releaseId);
    localStorage.setItem('mrlc-lms-theme', 'light');
  }, { user, releaseId: CURRENT_RELEASE.id });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path === '/api/exam-media') return route.fulfill({ json: { url: '/test-question.png' } });
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': test\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (['PUT', 'POST', 'DELETE'].includes(method)) {
      writes.push({ path, body: route.request().postDataJSON() });
      if (path.endsWith('/schedule') && state.failSchedule) return route.fulfill({ status: 500, json: { error: 'Schedule unavailable' } });
      if (path === '/api/ai/chat') return state.failAI ? route.fulfill({ status: 503, json: { error: 'AI unavailable' } }) : route.fulfill({ json: { reply: JSON.stringify([1, 2, 3].map(n => ({ text: `Generated question ${n}`, options: choice.options.map((t, i) => ({ t, c: i === 0 })) }))) } });
      return route.fulfill({ json: { id: 'saved' } });
    }
    if (path.endsWith('/result-policy')) return state.failLoad ? route.fulfill({ status: 500, json: { error: 'Policy unavailable' } }) : route.fulfill({ json: state.policy });
    if (path === '/api/exams/studio-a') return route.fulfill({ json: { id: 'studio-a', title: 'Science — Solar system', status: 'DRAFT', classId: 'class-a', subjectId: 'subject-a', type: 'QUIZ', durationMinutes: 30, attemptLimit: 1, questions, attempts, settings: { customSetting: 'preserve', shuffleChoices: true, antiCheat: { customRule: true } } } });
    if (path === '/api/classes') return route.fulfill({ json: [{ id: 'class-a', name: 'Year 8' }] });
    if (path === '/api/subjects') return route.fulfill({ json: [{ id: 'subject-a', name: 'Science' }] });
    if (path === '/api/students') return route.fulfill({ json: [{ id: 'student-a', classId: 'class-a', user: { firstName: 'Ada', lastName: 'Lee' } }, { id: 'student-b', classId: 'class-a', user: { firstName: 'Ben', lastName: 'Tan' } }] });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  return { state, writes };
}

test('empty Studio exposes question types, saves a question, and preserves hidden policy and settings', async ({ page }, info) => {
  const { writes } = await setup(page);
  await page.goto('/exams/studio-a/studio');
  await expect(page.getByRole('heading', { name: 'Build your first question' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('studio-empty-light.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Multiple choice Choose one correct answer' }).click();
  await page.getByPlaceholder('Type the question.').fill(choice.text);
  for (let i = 0; i < 4; i++) await page.getByRole('textbox', { name: `Option ${i + 1}`, exact: true }).fill(choice.options[i]);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All changes saved' })).toBeVisible();
  const saved = writes.find(w => w.path === '/api/exams/studio-a')!.body;
  expect(saved.questions[0].correctAnswer).toBe('0'); expect(saved.settings.customSetting).toBe('preserve'); expect(saved.settings.shuffleChoices).toBe(true);
  expect(writes.find(w => w.path.endsWith('/result-policy'))?.body.releaseMode).toBe('HIDDEN');
  await page.getByRole('button', { name: 'Preview as student', exact: true }).click();
  const preview = page.getByRole('dialog', { name: 'Student preview' });
  await preview.getByRole('button', { name: /Mercury/ }).click();
  await expect(preview.getByRole('button', { name: /Mercury/ })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape'); await expect(preview).not.toBeVisible();
  await page.screenshot({ path: info.outputPath('studio-editor-light.png'), fullPage: true });
});

test('load failures block editing and retry restores the Studio', async ({ page }) => {
  const { state, writes } = await setup(page, [choice]); state.failLoad = true;
  await page.goto('/exams/studio-a/studio');
  await expect(page.getByRole('alert')).toContainText('Could not load Exam Studio');
  expect(writes.filter(w => w.path.startsWith('/api/exams/'))).toHaveLength(0);
  state.failLoad = false; await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByLabel('Exam title')).toHaveValue('Science — Solar system');
});

test('publish waits for settings and retries partial saves without false success', async ({ page }) => {
  const { state, writes } = await setup(page, [choice]); state.failSchedule = true;
  await page.goto('/exams/studio-a/studio');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Save incomplete' })).toBeVisible();
  expect(writes.filter(w => w.body?.status === 'PUBLISHED')).toHaveLength(0);
  state.failSchedule = false;
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByText('Exam published', { exact: true })).toBeVisible();
  expect(writes.filter(w => w.body?.status === 'PUBLISHED')).toHaveLength(1);
});

test('question navigation, duplicate, reorder, deletion and AI failure preserve real content', async ({ page }) => {
  const { writes } = await setup(page, [choice]);
  await page.goto('/exams/studio-a/studio');
  await page.getByRole('button', { name: 'Generate 3 similar' }).click();
  await expect(page.getByText('Could not generate valid questions.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Duplicate', exact: true }).click();
  await page.getByPlaceholder('Type the question.').fill('Second question');
  await page.getByRole('button', { name: 'Move question up', exact: true }).click();
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All changes saved' })).toBeVisible();
  expect(writes.find(w => w.path === '/api/exams/studio-a')!.body.questions.map((q: any) => q.questionText)).toEqual(['Second question', choice.text]);
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete question 1', exact: true }).click();
  await expect(page.getByPlaceholder('Type the question.')).toHaveValue(choice.text);
});

test('started exams make question controls read-only', async ({ page }) => {
  await setup(page, [choice], [{ id: 'attempt' }]);
  await page.goto('/exams/studio-a/studio');
  await expect(page.getByPlaceholder('Type the question.')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Add question', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Duplicate', exact: true })).toBeDisabled();
});

test('preview supports multiple selections and tap-to-place words', async ({ page }, info) => {
  await setup(page, [{ ...choice, type: 'HOTSPOT', correctAnswers: ['Mercury', 'Earth'] }, { id: 'q2', type: 'DRAG_DROP', text: 'Fill', points: 5, options: { text: 'The planet {{a}}.', blanks: [{ id: 'a', answer: 'Earth' }], distractors: ['Sun'] } }]);
  await page.goto('/exams/studio-a/studio');
  await page.getByRole('button', { name: 'Preview as student' }).click();
  const preview = page.getByRole('dialog', { name: 'Student preview' });
  await preview.getByRole('button', { name: /Mercury/ }).click(); await preview.getByRole('button', { name: /Earth/ }).click();
  await expect(preview.getByRole('button', { name: /Mercury/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(preview.getByRole('button', { name: /Earth/ })).toHaveAttribute('aria-pressed', 'true');
  await preview.getByRole('button', { name: 'Next →' }).click();
  await preview.getByRole('button', { name: 'Earth', exact: true }).click(); await preview.getByRole('button', { name: 'Blank 1' }).click();
  await expect(preview.getByRole('button', { name: 'Blank 1' })).toContainText('Earth');
  await page.screenshot({ path: info.outputPath('studio-preview.png') });
});

test('schedule, release time and real student accommodations save the selected values', async ({ page }, info) => {
  const { writes } = await setup(page, [choice]);
  await page.goto('/exams/studio-a/studio');
  await page.getByRole('button', { name: 'Schedule', exact: true }).click();
  await page.getByLabel('Opens', { exact: true }).fill('2026-10-01T09:00'); await page.getByLabel('Closes', { exact: true }).fill('2026-10-01T12:00');
  await page.getByRole('button', { name: 'Unlimited', exact: true }).click();
  await page.getByRole('switch', { name: 'Honor accommodations' }).click();
  await page.getByRole('button', { name: 'Add student override' }).click();
  await page.getByLabel('Student receiving accommodation').selectOption('student-b');
  await page.getByRole('button', { name: 'Extra breaks' }).click();
  await page.getByRole('button', { name: 'Grading & release', exact: true }).click();
  await page.getByRole('button', { name: 'At a scheduled time' }).click();
  await page.getByLabel('Release date and time').fill('2026-10-02T12:00');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All changes saved' })).toBeVisible();
  expect(writes.find(w => w.path.endsWith('/schedule'))?.body.attemptLimit).toBe(9999);
  expect(writes.find(w => w.path === '/api/accommodations')?.body).toMatchObject({ studentId: 'student-b', additionalBreaks: true, extraTimePercent: 50 });
  expect(writes.find(w => w.path.endsWith('/result-policy'))?.body).toMatchObject({ releaseMode: 'SCHEDULED', showScore: true, showPassFail: false });
  await page.screenshot({ path: info.outputPath('studio-grading.png'), fullPage: true });
});

test('all eight question types remain reachable and serialize correctly', async ({ page }) => {
  const { writes } = await setup(page);
  await page.goto('/exams/studio-a/studio');
  const types = ['Multiple choice', 'True/False', 'Short answer', 'Essay', 'Fill in the blanks', 'Drop-down', 'Multi-select', 'Extended response'];
  for (const label of types) {
    await page.getByRole('button', { name: 'Add question', exact: true }).click();
    await page.getByRole('dialog', { name: 'Add a question' }).getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByLabel('Question type', { exact: true })).toHaveValue(({ 'Multiple choice': 'MCQ', 'True/False': 'TF', 'Short answer': 'SHORT', Essay: 'ESSAY', 'Fill in the blanks': 'DRAG', 'Drop-down': 'DROPDOWN', 'Multi-select': 'HOTSPOT', 'Extended response': 'EXTENDED' } as any)[label]);
    await page.getByPlaceholder('Type the question.').fill(`${label} question`);
  }
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All changes saved' })).toBeVisible();
  expect(writes.find(w => w.path === '/api/exams/studio-a')!.body.questions.map((q: any) => q.type)).toEqual(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'DRAG_DROP', 'DROPDOWN', 'HOTSPOT', 'EXTENDED']);
});

test('dark theme, media, math, details and valid AI generation work together', async ({ page }, info) => {
  const { state, writes } = await setup(page, [choice]); state.failAI = false;
  await page.route('**/test-question.png', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jD1cAAAAASUVORK5CYII=', 'base64') }));
  await page.goto('/exams/studio-a/studio');
  await page.getByRole('button', { name: 'Toggle theme between light and dark mode' }).click();
  await page.getByRole('menuitem', { name: 'Dark', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByPlaceholder('Type the question.').fill('Evaluate $2^2$.');
  await page.getByRole('button', { name: 'ƒx Math', exact: true }).click();
  await expect(page.getByRole('button', { name: 'x²', exact: true })).toBeVisible();
  await page.locator('.gs-editor input[type=file]').setInputFiles({ name: 'question.png', mimeType: 'image/png', buffer: Buffer.from('test-image') });
  await expect(page.getByAltText('Question media', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Paste a reading passage,').fill('Use this source passage.');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All changes saved' })).toBeVisible();
  expect(writes.find(w => w.path === '/api/exams/studio-a')!.body.questions[0]).toMatchObject({ questionText: 'Evaluate $2^2$.', imageUrl: '/test-question.png', passageText: 'Use this source passage.' });
  await page.getByPlaceholder('Type the question.').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('studio-dark-editor.png') });
  await page.getByRole('button', { name: 'Generate 3 similar' }).click();
  await expect(page.getByRole('button', { name: 'Questions (4)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await page.getByLabel('Instructions', { exact: true }).fill('Read all questions carefully.');
  await page.getByLabel('Time limit (minutes)', { exact: true }).fill('45');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'All changes saved' })).toBeVisible();
  expect(writes.filter(w => w.path === '/api/exams/studio-a').at(-1)!.body.duration).toBe(45);
});
