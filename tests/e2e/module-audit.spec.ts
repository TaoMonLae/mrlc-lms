import { expect, test } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
test.use({ serviceWorkers: 'block' });
test.describe.configure({ mode: 'parallel' });
const modules = [
  '/dashboard', '/students', '/teachers', '/classes', '/subjects', '/users', '/admissions',
  '/attendance/reports', '/timetable', '/exams', '/bank', '/gradebook', '/classwork', '/teacher/homework', '/flashcards',
  '/library', '/elibrary', '/books', '/videos', '/documents', '/news', '/dictionary',
  '/fees', '/fee-structures', '/fee-assignments', '/fee-discounts', '/expenses', '/vendors', '/budgets', '/financial', '/donations', '/donations/campaigns', '/donors',
  '/duties', '/duties/definitions', '/duties/rosters', '/duties/performance', '/cases', '/conduct', '/student-success', '/reports',
  '/staff', '/staff/departments', '/payroll', '/leave', '/chat', '/social', '/announcements', '/operations',
  '/settings/school', '/settings/branding', '/settings/system', '/settings/roles', '/settings/backup', '/settings/health', '/settings/audit-log', '/settings/export',
  '/games/chess', '/games/language-quest',
];
for (const path of modules) test(`module unavailable-service smoke ${path}`, async ({ page }, info) => {
  const user = { id: 'audit-admin', role: 'ADMIN', firstName: 'Audit', lastName: 'Admin', name: 'Audit Admin', status: 'ACTIVE', isActive: true, cursorEffect: 'NONE' };
  await page.addInitScript(({ user, release }) => {
    sessionStorage.setItem('auth_token', 'isolated-audit'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
  }, { user, release: CURRENT_RELEASE.id });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const requests = new Set<string>();
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { user } });
    if (url.pathname.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': audit\n\n' });
    if (url.pathname === '/api/settings' || url.pathname === '/api/settings/public') return route.fulfill({ json: {} });
    requests.add(url.pathname);
    return route.fulfill({ status: 503, json: { error: 'Audit service temporarily unavailable' } });
  });
  await page.goto(path);
  await expect(page.locator(path === '/dictionary' ? 'input[aria-label="Dictionary search"]' : 'h1, h2').first()).toBeVisible({ timeout: 10000 });
  // Let initial effects settle, including pages using debounced requests.
  await page.waitForTimeout(650);
  const text = await page.locator('body').innerText();
  await info.attach('module-audit', { body: JSON.stringify({ path, url: page.url(), requests: [...requests], errors, text }, null, 2), contentType: 'application/json' });
  expect(errors).toEqual([]);
  await expect(page.getByText('Something went wrong', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /404|Page not found|This page wandered off/i })).toHaveCount(0);
});
