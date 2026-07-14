import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@mrlc.edu';
const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';

function seriousViolations(results: Awaited<ReturnType<AxeBuilder['analyze']>>) {
  return results.violations
    .filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))
    .map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({ target: node.target.join(' '), summary: node.failureSummary })),
    }));
}

test('login has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
  await page.waitForTimeout(600); // scan the settled UI, not a translucent animation frame
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(seriousViolations(results)).toEqual([]);
});

test('authenticated dashboard has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email or username').fill(adminEmail);
  await page.getByLabel('Password', { exact: true }).fill(adminPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
  await page.goto('/dashboard');
  await expect(page.locator('#main-content')).toBeVisible();
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(seriousViolations(results)).toEqual([]);
});

test('password recovery has no serious or critical accessibility violations', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(seriousViolations(results)).toEqual([]);
});
