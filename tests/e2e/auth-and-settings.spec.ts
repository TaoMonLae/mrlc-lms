import { expect, test } from '@playwright/test';

const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@mrlc.edu';
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email or username').fill(adminEmail);
  await page.getByLabel('Password', { exact: true }).fill(adminPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test('public health endpoint verifies the database', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: 'ok', db: 'up' });
});

test('API permission middleware protects administration and accepts the admin capability', async ({ request }) => {
  const login = await request.post('/api/auth/login', {
    data: { identifier: adminEmail, password: adminPassword },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  expect((await request.get('/api/users')).status()).toBe(401);
  expect((await request.get('/api/users', { headers })).status()).toBe(200);
  expect([200, 503]).toContain((await request.get('/api/system/health', { headers })).status());
});

test('new student-success, notification, and session APIs are available', async ({ request }) => {
  const login = await request.post('/api/auth/login', {
    data: { identifier: adminEmail, password: adminPassword },
  });
  expect(login.ok()).toBeTruthy();
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };

  const success = await request.get('/api/student-success', { headers });
  expect(success.ok()).toBeTruthy();
  expect(await success.json()).toMatchObject({ students: expect.any(Array), thresholds: expect.any(Object) });

  const notifications = await request.get('/api/notifications', { headers });
  expect(notifications.ok()).toBeTruthy();
  expect(await notifications.json()).toMatchObject({ notifications: expect.any(Array), preferences: expect.any(Object) });

  const sessions = await request.get('/api/auth/sessions', { headers });
  expect(sessions.ok()).toBeTruthy();
  expect((await sessions.json()).some((session: { current: boolean }) => session.current)).toBeTruthy();

  const mfa = await request.get('/api/auth/mfa', { headers });
  expect(mfa.ok()).toBeTruthy();
  expect(await mfa.json()).toMatchObject({ enabled: expect.any(Boolean), recoveryCodesRemaining: expect.any(Number) });

  const forgot = await request.post('/api/auth/forgot-password', { data: { identifier: 'definitely-not-an-account@mrlc.invalid' } });
  expect(forgot.status()).toBe(202);
  expect(await forgot.json()).toMatchObject({ message: expect.stringContaining('If that account exists') });

  const invalidReset = await request.post('/api/auth/reset-password', { data: { token: 'x'.repeat(43), newPassword: 'NewPassword123!' } });
  expect(invalidReset.status()).toBe(400);

  const invalidEbookUpload = await request.post('/api/ebooks/chunks/complete', {
    headers,
    data: { uploadId: 'not-an-upload-id' },
  });
  expect(invalidEbookUpload.status()).toBe(400);
});

test('administrator can see every role from the shared registry', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/roles');
  for (const role of ['Administrator', 'Teacher', 'Student', 'Staff', 'Accountant', 'Case Worker', 'Librarian']) {
    await expect(page.getByText(role, { exact: true }).first()).toBeVisible();
  }
});

test('system health presents live dependency checks', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings/health');
  await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible();
  await expect(page.getByText('Database', { exact: true })).toBeVisible();
  await expect(page.getByText('Local backup storage', { exact: true })).toBeVisible();
});

test('student-success hub and timetable filters render', async ({ page }) => {
  await signIn(page);
  await page.goto('/student-success');
  await expect(page.getByRole('heading', { name: 'Student Success' })).toBeVisible();
  await expect(page.getByText('Students needing attention')).toBeVisible();

  await page.goto('/teacher/timetable');
  await expect(page.getByRole('heading', { name: 'Teaching Schedule' })).toBeVisible();
  await page.getByRole('button', { name: 'Filters' }).click();
  await expect(page.getByText('Session type')).toBeVisible();
  await expect(page.getByText('Status', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Day' }).click();
  await expect(page.getByLabel('Day')).toBeVisible();
});
