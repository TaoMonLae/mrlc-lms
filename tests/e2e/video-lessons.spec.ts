import { expect, test } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
const video = { id: 'cave-lesson', title: 'Homework for cave', description: 'Watch the lesson before class.\nWrite down the safety advice.', videoUrl: 'https://www.youtube.com/watch?v=-mzqQ_vNiKg DO NOT ENTER CAVES or LAVA TUBES!', thumbnailUrl: null, duration: 540, className: 'GED Year 1', subjectName: 'Science', subjectId: 'science', status: 'PUBLISHED', visibility: 'ALL', isRequired: true, dueDate: '2026-09-30', uploadedById: 'teacher-test', uploadedByName: 'Malay Mon', createdAt: '2026-09-17T06:00:00Z' };

for (const role of ['ADMIN', 'TEACHER', 'STUDENT']) test(`${role}: repaired YouTube links and responsive lesson layout`, async ({ page }, testInfo) => {
  const user = { id: role === 'TEACHER' ? 'teacher-test' : `${role}-video-test`, role, name: 'Video Tester', firstName: 'Video', lastName: 'Tester', email: 'video@example.test', isActive: true };
  let lesson = { ...video };
  await page.addInitScript(user => {
    sessionStorage.setItem('auth_token', 'video-test'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, '2026-09-06-language-quest-course-path');
  }, user);
  const iframeRequests: string[] = [];
  await page.route('https://www.youtube.com/embed/**', route => {
    iframeRequests.push(route.request().url());
    return route.fulfill({ contentType: 'text/html', body: '<html><body>Fixture player</body></html>' });
  });
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url()); const path = url.pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/videos/cave-lesson') {
      if (route.request().method() === 'PUT') lesson = { ...lesson, ...route.request().postDataJSON() };
      return route.fulfill({ json: lesson });
    }
    if (path.endsWith('/analytics')) return route.fulfill({ json: { total: 0, completed: 0, inProgress: 0, notStarted: 0, scope: 'all', roster: [] } });
    if (path === '/api/videos/progress') return route.fulfill({ json: [] });
    if (path.endsWith('/progress')) return route.fulfill({ json: { currentPosition: 0, isCompleted: false } });
    if (path === '/api/videos') return route.fulfill({ json: [lesson] });
    if (path.includes('settings')) return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/videos/cave-lesson');
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  await expect(page.getByRole('heading', { name: video.title, exact: true })).toBeVisible();
  const frame = page.locator('iframe');
  await expect(frame).toHaveAttribute('src', 'https://www.youtube.com/embed/-mzqQ_vNiKg?rel=0&playsinline=1');
  await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  const original = page.getByRole('link', { name: 'Open Original Video', exact: true });
  await expect(original).toHaveAttribute('href', 'https://www.youtube.com/watch?v=-mzqQ_vNiKg');
  await page.getByRole('button', { name: 'Retry Player', exact: true }).click();
  await expect.poll(() => iframeRequests.length).toBeGreaterThanOrEqual(2);
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const dark of [false, true]) {
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if (isDark !== dark) {
        await page.getByRole('button', { name: 'Toggle theme between light and dark mode', exact: true }).click();
        await page.getByRole('menuitem', { name: dark ? 'Dark' : 'Light', exact: true }).click();
      }
      await page.getByRole('heading', { name: video.title, exact: true }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      expect(await frame.evaluate(e => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(198);
      await page.screenshot({ path: testInfo.outputPath(`lesson-${role}-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true });
    }
  }
  const back = role === 'ADMIN' ? '/videos' : role === 'TEACHER' ? '/teacher/videos' : '/student/videos';
  await page.getByRole('button', { name: 'Back to Video Lessons', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${back}$`));
  await expect(page.getByRole('link', { name: `Watch ${video.title}`, exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search video lessons', exact: true }).fill('unmatched lesson');
  await expect(page.getByRole('link', { name: `Watch ${video.title}`, exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Search video lessons', exact: true }).fill('');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: testInfo.outputPath(`library-${role}.png`), fullPage: true });
  expect(errors).toEqual([]);
});
