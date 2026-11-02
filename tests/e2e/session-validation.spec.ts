import { expect, test } from '@playwright/test';

test('a stalled session check ends with a retry option and can recover', async ({ page }) => {
  const user = {
    id: 'session-check-admin',
    firstName: 'Test',
    lastName: 'Administrator',
    email: 'session-check@example.invalid',
    role: 'ADMIN',
    isActive: true,
  };

  await page.addInitScript((cachedUser) => {
    sessionStorage.setItem('auth_token', 'session-check-token');
    sessionStorage.setItem('auth_user', JSON.stringify(cachedUser));

    const originalFetch = window.fetch.bind(window);
    let respondToSessionCheck = false;
    Object.defineProperty(window, '__resumeSessionCheck', {
      value: () => { respondToSessionCheck = true; },
    });
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/auth/me')) {
        if (respondToSessionCheck) {
          return Promise.resolve(new Response(JSON.stringify({ user: cachedUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }));
        }
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      }
      return originalFetch(input, init);
    };
  }, user);

  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ json: path === '/api/settings' || path === '/api/public/branding' ? {} : [] });
  });
  await page.goto('/settings/roles');
  await expect(page.getByText('Verifying session…')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Session verification unavailable' })).toBeVisible({ timeout: 15_000 });

  await page.evaluate(() => (window as unknown as { __resumeSessionCheck: () => void }).__resumeSessionCheck());
  await page.getByRole('button', { name: 'Retry verification' }).click();
  await expect(page.getByRole('heading', { name: 'Session verification unavailable' })).not.toBeVisible();
  await expect(page).toHaveURL(/\/settings\/roles$/);
});
