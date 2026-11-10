import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
import { languageQuestRewardProgress } from '../../shared/languageQuestRewards';
import { gedScienceCourse } from '../../languageQuestGedScienceCourse';
import { gedSocialStudiesCourse } from '../../languageQuestGedSocialStudiesCourse';
import type { OfficialLanguageQuestCourse } from '../../languageQuestImportedCourses';

const user = { id: 'student', firstName: 'Sample', lastName: 'Student', role: 'STUDENT', isActive: true, email: 'student@example.test', mfaEnabled: true, cursorEffect: 'NONE' };

/** Serves one real GED lesson from the course definitions through a mocked lesson API. */
async function openLesson(page: Page, course: OfficialLanguageQuestCourse, lessonTitle: string) {
  const lesson = course.units.flatMap((unit) => unit.lessons).find((entry) => entry.title === lessonTitle)!;
  const payload = {
    id: 'lesson-1',
    title: lesson.title,
    description: lesson.description,
    conceptIntro: lesson.conceptIntro ?? null,
    course: { id: 'course-1', title: course.title, language: course.language, accentColor: course.accentColor },
    profile: { hearts: 5, maxHearts: 5, points: 0, currentStreak: 0, bestStreak: 0, activeCourseId: 'course-1', rewards: languageQuestRewardProgress(0) },
    challenges: lesson.challenges.map((challenge, index) => ({
      id: `challenge-${index}`, type: challenge.type, question: challenge.question, explanation: challenge.explanation ?? null, hint: challenge.hint ?? null, completed: false,
      options: challenge.options.map((option, optionIndex) => ({ id: `challenge-${index}-o${optionIndex}`, text: option.text, emoji: null, audioText: null })),
    })),
    cards: [],
  };
  await page.addInitScript(({ user, release }) => {
    sessionStorage.clear(); localStorage.clear();
    sessionStorage.setItem('auth_token', 'lesson-fixture');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
    localStorage.setItem('theme', 'light');
  }, { user, release: CURRENT_RELEASE.id });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/settings' || path === '/api/public/branding') return route.fulfill({ json: { name: 'Mon Refugee Learning Centre', cursorEffect: 'NONE' } });
    if (path === '/api/language-quest/lessons/lesson-1') return route.fulfill({ json: payload });
    return route.fulfill({ json: [] });
  });
  await page.goto('/games/language-quest/lessons/lesson-1');
  await page.getByRole('button', { name: 'Start practice' }).click();
  return lesson;
}

test('GED Social Studies practice keeps the lesson table on screen', async ({ page }, testInfo) => {
  const lesson = await openLesson(page, gedSocialStudiesCourse, 'Practice Set: Civics and Government');
  const source = page.locator('details', { hasText: 'Source' });
  await expect(source).toHaveAttribute('open', '');
  await expect(source).toContainText('Selected constitutional powers and checks');
  await expect(source).toContainText('Can override a veto with a two-thirds vote in each house');
  await expect(page.getByText(lesson.challenges[0].question)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('social-studies-source.png'), fullPage: true });

  // Learners can collapse the source to focus on the question.
  await source.locator('summary').click();
  await expect(source).not.toHaveAttribute('open', '');
  await expect(source.getByText('Show')).toBeVisible();
});

test('GED Science practice keeps the Punnett square on screen', async ({ page }, testInfo) => {
  await openLesson(page, gedScienceCourse, 'Practice Set: Life Science');
  const source = page.locator('details', { hasText: 'Source' });
  await expect(source).toContainText('Punnett square: Tt × Tt');
  await expect(source.getByRole('cell', { name: 'tt', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('science-source.png'), fullPage: true });
});

test('GED RLA and Math lessons do not add a separate source panel', async ({ page }) => {
  const { gedMathCourse } = await import('../../languageQuestGedMathCourse');
  await openLesson(page, gedMathCourse, 'Practice Set: Money, Percents, and Interest');
  await expect(page.locator('details', { hasText: 'Source' })).toHaveCount(0);
});
