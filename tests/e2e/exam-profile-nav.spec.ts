import { test, expect, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
test.use({ serviceWorkers: 'block' });
async function setup(page: Page, access: 'owner' | 'editor' | 'viewer' = 'owner') {
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
    if (path === '/api/exams/nav-a/access') return route.fulfill({ json: { access } });
    if (path === '/api/exams/nav-a/preview') return route.fulfill({ json: { exam: { title: 'Read-only algebra exam' }, questions: [] } });
    if (path === '/api/exams/nav-a') return route.fulfill({ json: { id: 'nav-a', access, ownerName: 'Exam Teacher', title: 'Mathematical Reasoning — GED Practice Test', status: 'PUBLISHED', type: 'FINAL', class: { name: 'GED Preparation', _count: { students: 20 } }, subject: { name: 'Mathematical Reasoning' }, durationMinutes: 120, totalMarks: 200, attempts: [] } });
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

test('owners can grant and revoke editing for a named class teacher', async ({ page }, info) => {
  await setup(page);
  let allowed = false;
  const changes: boolean[] = [];
  await page.route('**/api/exams/nav-a/editors', route => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      expect(body.teacherUserId).toBe('second-teacher');
      allowed = body.allowed;
      changes.push(allowed);
      return route.fulfill({ json: { allowed } });
    }
    return route.fulfill({ json: [{ teacherUserId: 'second-teacher', name: 'Other Teacher', allowed }] });
  });
  await page.getByRole('button', { name: 'Editing access', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Manage editing access' });
  await expect(dialog.getByText('View only', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Grant editing access for Other Teacher' }).click();
  await expect(dialog.getByText('Can edit', { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('editing-access.png') });
  await dialog.getByRole('button', { name: 'Revoke editing access for Other Teacher' }).click();
  await expect(dialog.getByText('View only', { exact: true })).toBeVisible();
  expect(changes).toEqual([true, false]);
});

test('shared editors cannot grant editing access to anyone else', async ({ page }) => {
  await setup(page, 'editor');
  await expect(page.getByRole('link', { name: 'Open in Studio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editing access', exact: true })).toHaveCount(0);
});

test('viewers opening management links land in the read-only exam', async ({ page }) => {
  await setup(page, 'viewer');
  await expect(page).toHaveURL(/nav-a\/preview$/);
  await expect(page.getByRole('link', { name: 'Back to exams' })).toHaveAttribute('href', '/exams');
  for (const url of ['/exams/nav-a/studio', '/exam2/nav-a/schedule', '/exams/nav-a/results', '/exam2/nav-a/invigilator']) {
    await page.goto(url);
    await expect(page.getByRole('heading', { name: 'Read-only algebra exam' })).toBeVisible();
    await expect(page).toHaveURL(/nav-a\/preview$/);
  }
});

async function managementPages(page: Page) {
  await page.route('**/api/exams/nav-a/results', route => route.fulfill({ json: { exam: { id: 'nav-a', title: 'Algebra exam', className: 'GED', subject: 'Math', studentCount: 0 }, attempts: [] } }));
  await page.route('**/api/exams/nav-a/invigilator', route => route.fulfill({ json: { summary: { notStarted: 0, inProgress: 0, paused: 0, submitted: 0, disconnected: 0 }, students: [] } }));
  await page.route('**/api/exams/nav-a/result-policy', route => route.fulfill({ json: { releaseMode: 'HIDDEN' } }));
}

test('exam destinations stay visible during navigation even when animation frames are suspended', async ({ page }) => {
  await setup(page); await managementPages(page);
  await expect(page.getByRole('heading', { name: 'Mathematical Reasoning — GED Practice Test' })).toBeVisible();
  await page.evaluate(() => { (window as any).savedRAF = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; });
  await page.getByRole('button', { name: 'Review all answers' }).click({ force: true });
  await expect(page.getByRole('heading', { name: 'Responses overview' })).toBeVisible();
  await expect(page.locator('#main-content > div')).toHaveCSS('opacity', '1');
  await page.evaluate(() => { window.requestAnimationFrame = (window as any).savedRAF; });
  await page.goBack();
  await page.getByRole('button', { name: 'Responses', exact: true }).click();
  await page.getByRole('menuitem', { name: /^Monitor attempts/ }).click();
  await expect(page.getByRole('heading', { name: 'Invigilator Dashboard' })).toBeVisible();
  await expect(page.locator('#main-content > div')).toHaveCSS('opacity', '1');
  await page.goBack();
  await page.getByRole('link', { name: 'Open in Studio' }).click();
  await expect(page.getByRole('heading', { name: 'Build your first question' })).toBeVisible();
  await expect(page.locator('#main-content > div')).toHaveCSS('opacity', '1');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Build your first question' })).toBeVisible();
});

test('empty or failed exam responses show recovery and retry loads the page', async ({ page }) => {
  await setup(page); await managementPages(page);
  let fail = true;
  await page.route('**/api/exams/nav-a/results', route => route.fulfill({ json: fail ? null : { exam: { title: 'Recovered exam', className: 'GED', subject: 'Math', studentCount: 0 }, attempts: [] } }));
  await page.goto('/exams/nav-a/results');
  await expect(page.getByRole('heading', { name: 'Student responses unavailable' })).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Responses overview' })).toBeVisible();
  await page.route('**/api/exams/nav-a/invigilator', route => route.fulfill({ json: { summary: {}, students: [{studentId:'s1',name:'Student',state:null}] } }));
  await page.goto('/exam2/nav-a/invigilator');
  await expect(page.getByRole('alert')).toContainText('Could not refresh the live session');
  await managementPages(page);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Invigilator Dashboard' })).toBeVisible();
});

test('stalled access check times out visibly and can be retried', async ({ page }) => {
  await setup(page); await managementPages(page);
  await page.clock.install();
  let stall = true;
  await page.route('**/api/exams/nav-a/access', async route => {
    if (stall) return;
    return route.fulfill({ json: { access: 'owner' } });
  });
  await page.goto('/exams/nav-a/results');
  await expect(page.getByRole('status')).toHaveText('Checking exam access…');
  await page.clock.fastForward(21000);
  await expect(page.getByRole('alert')).toContainText('Loading took too long');
  stall = false;
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Responses overview' })).toBeVisible();
});

test('Blue and Slate shell supports light and dark modes', async ({ page }, info) => {
  await setup(page);
  await expect(page.getByRole('heading', { name: 'Mathematical Reasoning — GED Practice Test' })).toBeVisible();
  const tokens = () => page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    return { background: css.getPropertyValue('--background').trim(), primary: css.getPropertyValue('--primary').trim() };
  });
  expect(await tokens()).toEqual({ background: '#101722', primary: '#a7c5ff' });
  await page.screenshot({ path: info.outputPath('blue-slate-dark.png'), fullPage: true });
  await page.getByRole('button', { name: 'Toggle theme between light and dark mode' }).click();
  await page.getByRole('menuitem', { name: 'Light', exact: true }).click();
  await expect.poll(tokens).toEqual({ background: '#f4f6fa', primary: '#2457bd' });
  await expect(page.locator('.academic-workspace')).toHaveCSS('background-image', 'none');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('blue-slate-light.png'), fullPage: true, animations: 'disabled' });
});
