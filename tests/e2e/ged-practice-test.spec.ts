import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
import { languageQuestGedExamProfile } from '../../shared/languageQuestGedExam';

const user = { id: 'student', firstName: 'Sample', lastName: 'Student', role: 'STUDENT', isActive: true, email: 'student@example.test', mfaEnabled: true, cursorEffect: 'NONE' };

function options(challenge: string, texts: string[]) {
  return texts.map((text, index) => ({ id: `${challenge}-o${index}`, text, emoji: null, audioText: null }));
}

async function fixture(page: Page, subject: 'math' | 'social') {
  const course = subject === 'math'
    ? { id: 'ged-math', title: 'GED Mathematical Reasoning Preparation & Practice', language: 'GED Mathematical Reasoning', category: 'GED Preparation', accentColor: '#2563eb' }
    : { id: 'ged-social', title: 'GED Social Studies Preparation & Practice', language: 'GED Social Studies', category: 'GED Preparation', accentColor: '#2563eb' };
  const format = languageQuestGedExamProfile(course);
  const cards = subject === 'math'
    ? Array.from({ length: 7 }, (_, index) => ({
      challengeId: `q${index + 1}`, type: 'SELECT', question: `What is $${index + 2}\\times3$?`, secureAudio: false, speechText: null, sourceId: null, stimulus: null,
      options: options(`q${index + 1}`, [`$${(index + 2) * 3}$`, `$${(index + 2) * 3 + 1}$`, `$${(index + 2) * 3 - 1}$`, `$${(index + 2) * 4}$`]),
    }))
    : [1, 2, 3].map((number) => ({
      challengeId: `q${number}`, type: 'SELECT', question: number === 1 ? 'Which district has the highest transit share?' : number === 2 ? 'Which district has the lowest transit share?' : 'Which branch can declare a law unconstitutional?', secureAudio: false, speechText: null,
      sourceId: number < 3 ? 'lesson-transit' : 'lesson-branches',
      stimulus: number < 3
        ? { type: 'bar', title: 'Illustrative transit share by district', items: [{ label: 'Central', value: 42, unit: '%' }, { label: 'Rural', value: 7, unit: '%' }] }
        : { type: 'table', title: 'Selected constitutional powers', headers: ['Branch', 'Main power'], rows: [['Judicial', 'Interprets laws']] },
      options: options(`q${number}`, number === 3 ? ['Judicial', 'Executive', 'Legislative', 'Local'] : ['Central', 'Rural', 'North', 'West']),
    }));
  const submissions: any[] = [];
  const finalExam = { available: true, unlocked: true, eligibleQuestionCount: 140, minQuestions: 10, questionCount: cards.length, passPercent: 80, attemptMinutes: format!.minutes, format, passed: false, certificateEligible: false, passedAt: null, bestScorePercent: null, latestAttempt: null, retryAt: null };

  await page.addInitScript(({ user, release }) => {
    sessionStorage.clear(); localStorage.clear();
    sessionStorage.setItem('auth_token', 'ged-fixture');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
    localStorage.setItem('theme', 'light');
  }, { user, release: CURRENT_RELEASE.id });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/settings' || path === '/api/public/branding') return route.fulfill({ json: { name: 'Mon Refugee Learning Centre', cursorEffect: 'NONE' } });
    if (path === `/api/language-quest/courses/${course.id}`) return route.fulfill({ json: { ...course, finalExam } });
    if (path.endsWith('/final-exam/start')) {
      return route.fulfill({ status: 201, json: { attemptId: 'attempt-1', expiresAt: new Date(Date.now() + format!.minutes * 60_000).toISOString(), passPercent: 80, course, format, cards } });
    }
    if (path.endsWith('/final-exam/finish')) {
      const body = route.request().postDataJSON();
      submissions.push(body);
      const correct = body.answers.filter((answer: any) => answer.optionId?.endsWith('-o0')).length;
      return route.fulfill({ json: { results: body.answers.map((answer: any) => ({ challengeId: answer.challengeId, correct: Boolean(answer.optionId?.endsWith('-o0')) })), correctCount: correct, total: cards.length, requiredCorrect: Math.ceil(cards.length * 0.8), scorePercent: Math.round((correct / cards.length) * 100), passed: correct >= Math.ceil(cards.length * 0.8), certificateUnlocked: false, passedAt: null } });
    }
    if (path.endsWith('/final-exam/violation')) return route.fulfill({ json: { terminated: true } });
    return route.fulfill({ json: [] });
  });
  return { course, submissions };
}

async function start(page: Page, courseId: string) {
  await page.goto(`/games/language-quest/courses/${courseId}/final-exam`);
  await expect(page.getByText('How this matches the real test')).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /Start practice test/ }).click();
}

test('GED math practice test follows the computer-based GED format', async ({ page }, testInfo) => {
  const { course, submissions } = await fixture(page, 'math');
  await start(page, course.id);

  await expect(page.getByText('Question 1 of 7 · Part 1 · No calculator')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Calculator' })).toBeDisabled();
  await expect(page.getByRole('radio')).toHaveCount(4);

  // Answer, flag, and move around freely within Part 1.
  await page.getByText('A', { exact: true }).click();
  await page.getByRole('button', { name: 'Flag for review' }).click();
  await expect(page.getByRole('button', { name: 'Flagged' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: /Previous/ }).click();
  await expect(page.getByRole('radio').first()).toBeChecked();
  await page.getByRole('button', { name: 'Formula sheet' }).click();
  await expect(page.getByRole('dialog', { name: 'Formula sheet' })).toContainText('Quadratic formula');
  await page.screenshot({ path: testInfo.outputPath('ged-math-part1.png') });
  await page.getByRole('button', { name: 'Close formula sheet' }).click();

  for (let question = 2; question <= 6; question += 1) {
    await page.getByRole('button', { name: /^Next|Finish Part 1/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Review Screen · Part 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Question 1: answered, flagged for review' })).toBeVisible();
  await expect(page.getByText('4 unanswered')).toBeVisible();
  await page.getByRole('button', { name: 'Finish Part 1' }).click();
  await page.getByRole('button', { name: 'Continue to Part 2' }).click();

  // Part 2: calculator unlocked, Part 1 can no longer be revisited.
  await expect(page.getByText('Question 6 of 7 · Part 2 · Calculator allowed')).toBeVisible();
  await expect(page.getByRole('button', { name: /Previous/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Calculator' }).click();
  const calculator = page.getByRole('dialog', { name: 'Calculator' });
  await calculator.getByLabel('Expression').fill('900×0.06×8÷12');
  await calculator.getByRole('button', { name: 'Equals' }).click();
  await expect(calculator.locator('output')).toHaveText('36');
  await page.screenshot({ path: testInfo.outputPath('ged-math-part2-calculator.png') });
  await page.getByRole('button', { name: 'Close calculator' }).click();

  await page.getByText('A', { exact: true }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: 'Review and submit' }).click();
  await expect(page.getByRole('heading', { name: 'Review Screen · Part 2' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('ged-math-review.png') });
  await page.getByRole('button', { name: 'Submit test' }).click();
  await expect(page.getByText(/questions are unanswered and will be scored as incorrect/)).toBeVisible();
  await page.getByRole('button', { name: 'Submit test' }).click();

  await expect(page.getByText('GED readiness')).toBeVisible();
  expect(submissions).toHaveLength(1);
  expect(submissions[0].answers.map((answer: any) => answer.challengeId)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7']);
  expect(submissions[0].answers.filter((answer: any) => answer.optionId).length).toBe(2);
});

test('GED social studies questions keep their source on screen', async ({ page }, testInfo) => {
  const { course } = await fixture(page, 'social');
  await start(page, course.id);

  await expect(page.getByText('Questions 1–2 refer to this source')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Source' })).toContainText('Illustrative transit share by district');
  await page.screenshot({ path: testInfo.outputPath('ged-social-source.png') });
  await page.getByRole('button', { name: /Next/ }).click();
  await page.getByRole('button', { name: /Next/ }).click();
  await expect(page.getByRole('region', { name: 'Source' })).toContainText('Selected constitutional powers');
  await expect(page.getByText('Source', { exact: true })).toBeVisible();
});
