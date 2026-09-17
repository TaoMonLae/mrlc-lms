import { expect, test } from '@playwright/test';

// Service-worker fetches bypass Playwright's page routes; use only fixture data.
test.use({ serviceWorkers: 'block' });

test('student profile tabs remain readable and scrollable at every width', async ({ page }, testInfo) => {
  const user = { id: 'profile-tabs-admin', email: 'tabs@example.test', role: 'ADMIN', firstName: 'Profile', lastName: 'Tester', isActive: true };
  await page.addInitScript((user) => {
    sessionStorage.setItem('auth_token', 'profile-tabs-test');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, '2026-09-06-language-quest-course-path');
  }, user);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/students/profile-tabs-student') return route.fulfill({ json: {
      id: 'profile-tabs-student', studentCode: 'ST-TEST', preferredName: 'Student', gender: 'MALE',
      status: 'ACTIVE', boardingType: 'BOARDING', enrollmentDate: '2026-01-01', dateOfBirth: '2010-01-01',
      user: { firstName: 'Student', lastName: 'Tester' },
    } });
    if (path.includes('profile-data')) return route.fulfill({ json: { exams: null, fees: null } });
    if (path.includes('settings') || path.includes('profile')) return route.fulfill({ json: {} });
    return route.fulfill({ json: [] });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/students/profile-tabs-student');
  const list = page.getByRole('tablist', { name: 'Student profile sections' });
  const first = list.getByRole('tab', { name: 'Overview', exact: true });
  await expect(first).toBeVisible();
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await first.focus();
    await first.press('Home');
    await first.press('Enter');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    const geometry = await first.evaluate(tab => {
      const tabRect = tab.getBoundingClientRect();
      const listRect = tab.closest('[role="tablist"]')!.getBoundingClientRect();
      return { tabTop: tabRect.top, tabBottom: tabRect.bottom, listTop: listRect.top, listBottom: listRect.bottom, background: getComputedStyle(tab).backgroundColor };
    });
    expect(geometry.tabTop).toBeGreaterThanOrEqual(geometry.listTop);
    expect(geometry.tabBottom).toBeLessThanOrEqual(geometry.listBottom + 1);
    expect(geometry.background).toBe('rgba(0, 0, 0, 0)');
    const viewport = list.locator('..');
    if (width < 1440) {
      const right = page.getByRole('button', { name: 'Scroll profile tabs right' });
      await expect(right).toBeEnabled();
      await right.click();
      await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Scroll profile tabs left' }).click();
    } else await expect(page.getByRole('button', { name: 'Scroll profile tabs right' })).toHaveCount(0);
    await first.focus();
    await first.press('End');
    const last = list.getByRole('tab', { name: 'Cases', exact: true });
    await expect(last).toBeFocused();
    await last.press('Enter');
    await expect(last).toHaveAttribute('aria-selected', 'true');
    const visible = await last.evaluate(tab => {
      const rect = tab.getBoundingClientRect();
      const viewport = tab.closest('[role="tablist"]')!.parentElement!.getBoundingClientRect();
      return rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1;
    });
    expect(visible).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await first.focus();
    await first.press('Home');
    await first.press('Enter');
    await page.screenshot({ path: testInfo.outputPath(`profile-tabs-${width}.png`), fullPage: true });
  }
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expect.poll(() => first.evaluate(tab => getComputedStyle(tab).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(errors).toEqual([]);
});
