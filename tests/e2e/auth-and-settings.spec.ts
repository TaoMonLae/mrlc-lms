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
