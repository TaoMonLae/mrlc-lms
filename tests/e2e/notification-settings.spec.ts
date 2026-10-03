import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CURRENT_RELEASE } from '../../src/data/releases';
import { notificationPreferenceDefaults } from '../../shared/notificationPreferences';

test.use({ serviceWorkers: 'block' });
async function fixture(page: Page, role = 'TEACHER') {
  const user = { id: 'notification-test-user', role, firstName: 'Nai', lastName: 'Mon', email: 'nai@example.test', isActive: true, cursorEffect: 'NONE' };
  const state = { preferences: { ...notificationPreferenceDefaults, id: 'database-metadata', userId: user.id }, writes: [] as any[], failLoad: false, failSave: false, notifications: [] as any[] };
  await page.addInitScript(({ user, release }) => {
    sessionStorage.setItem('auth_token', 'isolated-settings'); sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, release); localStorage.setItem('theme', 'light');
  }, { user, release: CURRENT_RELEASE.id });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/notifications/preferences') {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON(); state.writes.push(body);
        if (state.failSave) return route.fulfill({ status: 503, json: { error: 'Settings service unavailable. Please try again.' } });
        Object.assign(state.preferences, body);
        return route.fulfill({ json: state.preferences });
      }
      if (state.failLoad) return route.fulfill({ status: 503, json: { error: 'Settings service unavailable. Please try again.' } });
      return route.fulfill({ json: state.preferences });
    }
    if (path === '/api/notifications') return route.fulfill({ json: { notifications: state.notifications, unreadCount: state.notifications.length, preferences: state.preferences } });
    if (path === '/api/announcements') return route.fulfill({ json: [{ id: 'news', title: 'School announcement', body: 'Assembly', status: 'ACTIVE', createdAt: new Date().toISOString() }] });
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  return state;
}

test('teacher preferences save only known fields, survive reload, and stop bell announcements', async ({ page }, info) => {
  const state = await fixture(page); await page.goto('/notifications/settings');
  await expect(page.getByRole('heading', { name: 'Notification settings', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Payroll', exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  await page.getByRole('switch', { name: 'Email notifications' }).click();
  await page.getByRole('switch', { name: 'In-app notifications' }).click();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  expect(state.writes).toHaveLength(1); expect(Object.keys(state.writes[0])).toHaveLength(8);
  expect(state.writes[0].id).toBeUndefined(); expect(state.writes[0].emailEnabled).toBe(true);
  await page.reload(); await expect(page.getByRole('switch', { name: 'Email notifications' })).toBeChecked();
  await page.getByRole('button', { name: /View .*unread notifications/ }).click();
  await expect(page.getByText('School announcement', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: /Notification settings/ }).last().click();
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('notification-settings-light.png'), animations: 'disabled' });
  const light = await new AxeBuilder({ page }).include('#notifications').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(light.violations).toEqual([]);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: info.outputPath('notification-settings-dark.png'), animations: 'disabled' });
  const dark = await new AxeBuilder({ page }).include('#notifications').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(dark.violations).toEqual([]);
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.locator('#notifications').evaluate(el => el.scrollWidth <= el.clientWidth)).toBeTruthy();
});

test('load errors offer retry without editable defaults; failed saves preserve the draft', async ({ page }) => {
  const state = await fixture(page); state.failLoad = true; await page.goto('/notifications/settings');
  await expect(page.getByRole('alert')).toContainText('Settings service unavailable');
  await expect(page.getByRole('switch')).toHaveCount(0); expect(state.writes).toHaveLength(0);
  state.failLoad = false; await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByRole('switch', { name: 'Payroll', exact: true }).click(); state.failSave = true;
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('alert')).toContainText('Settings service unavailable');
  await expect(page.getByRole('switch', { name: 'Payroll', exact: true })).not.toBeChecked();
  state.failSave = false; await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  await page.getByRole('switch', { name: 'Payroll', exact: true }).click();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Payroll', exact: true })).not.toBeChecked();
});

test('student settings expose learning topics and keyboard-operable switches', async ({ page }) => {
  await fixture(page, 'STUDENT'); await page.goto('/notifications/settings');
  const homework = page.getByRole('switch', { name: 'Homework reminders', exact: true });
  await expect(homework).toBeChecked(); await homework.focus(); await page.keyboard.press('Space');
  await expect(homework).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Results and feedback', exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Payroll', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toHaveCount(0);
});
