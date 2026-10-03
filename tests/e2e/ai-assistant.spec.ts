import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CURRENT_RELEASE } from '../../src/data/releases';

test.use({ serviceWorkers: 'block' });
const reply = '## A good place to start\n\nYou have **three submissions** to review.\n\n1. Open your grading queue.\n2. Review the answers and add feedback.\n\n| Class | To review |\n| --- | --- |\n| GED Year 1 | 3 |\n\nYour school records have not been changed.';
async function fixture(page: Page, role = 'TEACHER') {
  const user = { id: 'assistant-test-user', role, firstName: 'Nai', lastName: 'Mon', isActive: true };
  const requests: any[] = [];
  await page.addInitScript(({ user, releaseId }) => {
    sessionStorage.setItem('auth_token', 'assistant-test');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, releaseId);
    localStorage.setItem('theme', 'light');
  }, { user, releaseId: CURRENT_RELEASE.id });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path === '/api/ai/chat') { requests.push(route.request().postDataJSON()); return route.fulfill({ json: { reply } }); }
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], unreadCount: 0 } });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  await page.goto('/about');
  return requests;
}
async function open(page: Page) {
  await page.getByRole('button', { name: 'Open AI assistant' }).click();
  await expect(page.getByRole('dialog', { name: 'AI Assistant' })).toBeVisible();
}

test('task prompts are editable, the panel fits, and light/dark controls are accessible', async ({ page }, info) => {
  const requests = await fixture(page); await open(page);
  await expect(page.getByRole('heading', { name: 'What can I help with today?' })).toBeVisible();
  const panel = page.locator('.ai-panel');
  await page.screenshot({ path: info.outputPath('assistant-welcome-light.png'), animations: 'disabled' });
  await panel.screenshot({ path: info.outputPath('assistant-panel-light.png'), animations: 'disabled' });
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await page.getByRole('button', { name: /Look up a student/ }).click();
  const input = page.getByRole('textbox', { name: 'Message AI assistant' });
  await expect(input).toBeFocused(); await expect(input).toHaveValue(/Look up this student/);
  expect(requests).toHaveLength(0);
  await input.fill('Summarize attendance'); await input.press('Shift+Enter'); await input.press('x');
  await expect(input).toHaveValue('Summarize attendance\nx');
  const light = await new AxeBuilder({ page }).include('.ai-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(light.violations).toEqual([]);
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: info.outputPath('assistant-welcome-dark.png'), animations: 'disabled' });
  const dark = await new AxeBuilder({ page }).include('.ai-panel').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(dark.violations).toEqual([]);
  await input.press('Escape');
  await expect(panel).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toBeFocused();
});

test('send, follow-up context, copying, and new conversation work', async ({ page }, info) => {
  const requests = await fixture(page); await open(page);
  await page.getByRole('button', { name: /What needs my attention/ }).click();
  await page.getByRole('textbox', { name: 'Message AI assistant' }).press('Enter');
  await expect(page.getByRole('heading', { name: 'A good place to start' })).toBeVisible();
  expect(requests).toHaveLength(1); expect(requests[0].pageContext.path).toBe('/about');
  await page.screenshot({ path: info.outputPath('assistant-conversation.png'), animations: 'disabled' });
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__copied = text; } } }); });
  await page.getByRole('button', { name: 'Copy response', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Response copied' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__copied)).toBe(reply);
  await page.getByRole('textbox', { name: 'Message AI assistant' }).fill('What should I do first?');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('heading', { name: 'A good place to start' })).toHaveCount(2);
  expect(requests[1].messages.map((m: any) => m.role)).toEqual(['user', 'assistant']);
  await page.getByRole('button', { name: 'New conversation' }).click();
  await expect(page.getByRole('heading', { name: 'What can I help with today?' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Message AI assistant' })).toBeEmpty();
});

test('failures can be retried without duplicate turns and stop ignores late responses', async ({ page }, info) => {
  await fixture(page);
  let attempts = 0; const bodies: any[] = [];
  await page.route('**/api/ai/chat', async (route) => {
    attempts++; bodies.push(route.request().postDataJSON());
    if (attempts === 1) return route.fulfill({ status: 503, json: { error: 'Assistant is temporarily unavailable. Please try again.' } });
    return route.fulfill({ json: { reply } });
  });
  await open(page);
  const input = page.getByRole('textbox', { name: 'Message AI assistant' });
  await input.fill('Help with my class'); await input.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'Something went wrong' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('assistant-retry.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'A good place to start' })).toBeVisible();
  expect(bodies[1].messages).toEqual([]);
  await expect(page.getByRole('article', { name: 'Your message' })).toHaveCount(1);
  let finish!: () => void;
  const gate = new Promise<void>((resolve) => { finish = resolve; });
  await page.route('**/api/ai/chat', async (route) => { await gate; await route.fulfill({ json: { reply: 'Late response must not appear' } }).catch(() => {}); });
  await input.fill('A slow question'); await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Stop response' })).toBeVisible();
  await input.press('Enter'); // A second Enter must not start another request.
  await page.getByRole('button', { name: 'Stop response' }).click();
  await expect(page.getByText('Paused here', { exact: true })).toBeVisible();
  finish();
  await page.getByRole('button', { name: 'New conversation' }).click();
  await expect(page.getByText('Late response must not appear')).toHaveCount(0);
});

test('students do not see the assistant launcher', async ({ page }) => {
  await fixture(page, 'STUDENT');
  await expect(page.getByRole('heading', { name: /About|Built|school|MRLC/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open AI assistant' })).toHaveCount(0);
});

test('narrow screens and long content keep the composer reachable; desktop can expand', async ({ page }, info) => {
  await fixture(page, 'ADMIN'); await open(page);
  const panel = page.locator('.ai-panel');
  if (info.project.name === 'desktop') {
    const width = (await panel.boundingBox())!.width;
    await page.getByRole('button', { name: 'Expand assistant' }).click();
    expect((await panel.boundingBox())!.width).toBeGreaterThan(width);
    await page.getByRole('button', { name: 'Narrow assistant' }).click();
  }
  await page.setViewportSize({ width: 320, height: 640 });
  await page.getByRole('button', { name: /Translate a text/ }).click();
  const input = page.getByRole('textbox', { name: 'Message AI assistant' });
  await input.fill('A long message\n'.repeat(100));
  await expect(page.getByRole('button', { name: 'Send message' })).toBeInViewport();
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBeTruthy();
  await page.screenshot({ path: info.outputPath('assistant-narrow-long-input.png'), animations: 'disabled' });
});
