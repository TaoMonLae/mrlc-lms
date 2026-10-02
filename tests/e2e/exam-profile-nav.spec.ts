import { test, expect, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
test.use({ serviceWorkers: 'block' });
async function setup(page: Page) {
  const user = { id: 'nav-teacher', role: 'TEACHER', firstName: 'Exam', lastName: 'Teacher', isActive: true, cursorEffect: 'NONE' };
  const writes: string[] = [];
  await page.addInitScript(({ user, releaseId }) => {
    sessionStorage.setItem('auth_token', 'test'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('mrlc-lms-theme', 'dark'); localStorage.setItem(`mrlc:release-seen:${user.id}`, releaseId);
  }, { user, releaseId: CURRENT_RELEASE.id });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': test\n\n' });
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (['POST', 'DELETE'].includes(route.request().method())) { if (path.startsWith('/api/exams/')) writes.push(path); return route.fulfill({ json: { count: 2 } }); }
    if (path === '/api/exams/nav-a') return route.fulfill({ json: { id: 'nav-a', title: 'Mathematical Reasoning — GED Practice Test', status: 'PUBLISHED', type: 'FINAL', class: { name: 'GED Preparation', _count: { students: 20 } }, subject: { name: 'Mathematical Reasoning' }, durationMinutes: 120, totalMarks: 200, attempts: [] } });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  await page.goto('/exams/nav-a');
  return writes;
}

test('grouped exam navigation preserves every destination and keyboard dismissal', async ({ page }, info) => {
  await setup(page);
  const nav = page.getByRole('navigation', { name: 'Exam actions' });
  await expect(page.getByRole('heading', { name: 'Mathematical Reasoning — GED Practice Test' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Open in Studio' })).toHaveAttribute('href', '/exams/nav-a/studio');
  await expect(nav.getByRole('link', { name: 'Preview', exact: true })).toHaveAttribute('href', '/exams/nav-a/preview');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('exam-header-dark.png') });
  const manage = nav.getByRole('button', { name: 'Manage exam' });
  await manage.focus(); await page.keyboard.press('Enter');
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: /^Author content/ })).toHaveAttribute('href', '/exam2/nav-a/author');
  await expect(menu.getByRole('menuitem', { name: /^Schedule/ })).toHaveAttribute('href', '/exam2/nav-a/schedule');
  await expect(menu.getByRole('menuitem', { name: /^Print exam/ })).toHaveAttribute('href', '/exam2/nav-a/print');
  await page.keyboard.press('ArrowDown');
  await expect(menu.locator(':focus')).toHaveCount(1);
  await page.screenshot({ animations: 'disabled', path: info.outputPath('exam-manage-menu.png') });
  await page.keyboard.press('Escape'); await expect(menu).not.toBeVisible(); await expect(manage).toBeFocused();
  await nav.getByRole('button', { name: 'Responses' }).click();
  await expect(menu.getByRole('menuitem', { name: /^Monitor attempts/ })).toHaveAttribute('href', '/exam2/nav-a/invigilator');
  await expect(menu.getByRole('menuitem', { name: /^Grade responses/ })).toHaveAttribute('href', '/exam2/grading?examId=nav-a');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Toggle theme between light and dark mode' }).click();
  await page.getByRole('menuitem', { name: 'Light', exact: true }).click();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await nav.getByRole('button', { name: 'Responses' }).click();
  await page.screenshot({ animations: 'disabled', path: info.outputPath('exam-responses-light.png') });
});

test('grouped actions retain confirmation and existing write handlers', async ({ page }) => {
  const writes = await setup(page);
  await page.getByRole('button', { name: 'Manage exam' }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('menuitem', { name: /^Archive/ }).click();
  expect(writes).toEqual([]);
  await page.getByRole('button', { name: 'Responses' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('menuitem', { name: /^Sync to Gradebook/ }).click();
  await expect(page.getByText('Synced 2 score(s) to gradebook')).toBeVisible();
  expect(writes).toEqual(['/api/exams/nav-a/sync-gradebook']);
  await page.getByRole('button', { name: 'Manage exam' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('menuitem', { name: /^Archive/ }).click();
  await expect(page).toHaveURL(/\/exams$/);
  expect(writes).toContain('/api/exams/nav-a');
});
