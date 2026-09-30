import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
import { LEVELS } from '../../src/pages/games/word-connect/content';

test.use({ serviceWorkers: 'block' });
const storageKey = 'mrlc:word-connect:v1:word-connect-fixture';
async function fixture(page: Page, role = 'TEACHER', blocked = false) {
  const user = { id: 'word-connect-fixture', role, firstName: 'Word', lastName: 'Explorer', name: 'Word Explorer', isActive: true, cursorEffect: 'NONE' };
  const requests: { path: string; body: any }[] = [];
  await page.addInitScript(({ user, release }) => {
    sessionStorage.setItem('auth_token', 'word-connect-test');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
  }, { user, release: CURRENT_RELEASE.id });
  const access = { allowed: !blocked, code: blocked ? 'BLOCKED' : 'ALLOWED', reason: blocked ? 'Teacher paused this game.' : null, exempt: false, managed: true, remainingSeconds: 600, remainingDailySeconds: 600, dailyLimitMinutes: 10, sessionLimitMinutes: 10, cooldownMinutes: 0, dailyUsedSeconds: 0, sessionUsedSeconds: 0, nextAllowedAt: null };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path.startsWith('/api/game-controls')) {
      requests.push({ path: route.request().url(), body: route.request().postData() ? route.request().postDataJSON() : null });
      return route.fulfill({ json: path.endsWith('/access') ? access : { sessionId: 'word-session', access } });
    }
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  await page.goto('/games/word-connect');
  return requests;
}
async function enterWord(page: Page, word: string) {
  await page.getByRole('group', { name: /^Letter wheel/ }).focus();
  await page.keyboard.type(word);
  await page.keyboard.press('Enter');
}

test('map, keyboard play, duplicate/bonus feedback, save, completion, and collection', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await fixture(page);
  await expect(page.getByRole('heading', { name: 'Word Connect Adventure' })).toBeVisible();
  await expect(page.getByLabel('Level 2 locked: Letters from a friend')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('adventure-map.png'), fullPage: true });
  await page.getByRole('link', { name: 'Start adventure', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'AI School Assistant' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Let’s explore' }).click();
  await enterWord(page, 'read');
  await expect(page.getByRole('status').filter({ hasText: /^READ —/ })).toBeVisible();
  await enterWord(page, 'read');
  await expect(page.getByText('You’ve already found READ. Try another word.')).toBeVisible();
  await enterWord(page, 'red');
  await expect(page.getByText(/^Bonus discovery! RED/)).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 / 4 words', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.wc-play-board').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('play-viewport.png') });
  await page.locator('.wc-game').screenshot({ path: info.outputPath('puzzle-light.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.locator('.wc-game').screenshot({ path: info.outputPath('puzzle-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await enterWord(page, 'dear'); await enterWord(page, 'dare'); await enterWord(page, 'ear');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('3 stars')).toBeVisible();
  await page.getByRole('dialog').screenshot({ path: info.outputPath('completion.png') });
  await page.getByRole('link', { name: 'Adventure map', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Play level 2: Letters from a friend' })).toBeVisible();
  await page.getByRole('button', { name: /Word collection/ }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'READ', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'RED', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('tap, swipe, undo and staged hints are playable without a keyboard', async ({ page }) => {
  await fixture(page);
  await page.getByRole('link', { name: 'Start adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s explore' }).click();
  await page.getByRole('button', { name: 'Letter R', exact: true }).click();
  await page.getByRole('button', { name: 'Letter E', exact: true }).click();
  await page.getByRole('button', { name: 'Undo last letter' }).click();
  await page.getByRole('button', { name: 'Letter E', exact: true }).click();
  await page.getByRole('button', { name: 'Letter A', exact: true }).click();
  await page.getByRole('button', { name: 'Letter D', exact: true }).click();
  await page.getByRole('button', { name: 'Check word' }).click();
  await expect(page.getByText('1 / 4 words', { exact: true })).toBeVisible();
  const wheel = page.getByRole('group', { name: /^Letter wheel/ });
  await wheel.scrollIntoViewIfNeeded();
  const centers = await Promise.all('DEAR'.split('').map(async letter => {
    const box = await page.getByRole('button', { name: `Letter ${letter}`, exact: true }).boundingBox();
    return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
  }));
  await page.mouse.move(centers[0].x, centers[0].y); await page.mouse.down();
  for (const point of centers.slice(1)) await page.mouse.move(point.x, point.y, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText('2 / 4 words', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show meaning' }).click();
  await page.getByRole('button', { name: 'Show a sentence' }).click();
  await expect(page.locator('.wc-meaning blockquote')).toHaveText('Do you ____ to try a new activity?');
  await page.getByRole('button', { name: 'Reveal first letter' }).click();
  await expect(page.getByText('Starts with D', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reveal this word' }).click();
  await expect(page.getByText('3 / 4 words', { exact: true })).toBeVisible();
  await enterWord(page, 'ear');
  await expect(page.getByRole('dialog').getByLabel('1 stars')).toBeVisible();
});

test('locked URLs, final puzzle, and account isolation', async ({ page }) => {
  await fixture(page);
  await page.goto('/games/word-connect/play/forest');
  await expect(page.getByRole('heading', { name: 'This path opens soon' })).toBeVisible();
  await page.evaluate(({ key, levels }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, tutorialSeen: true, sound: false, levels: Object.fromEntries(levels.map(level => [level.id, { found: level.words.map(item => item.word), bonus: [], hints: {} }])) }));
  }, { key: storageKey, levels: LEVELS.slice(0, -1) });
  await page.reload();
  for (const item of LEVELS.at(-1)!.words) await enterWord(page, item.word);
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Adventure complete!' })).toBeVisible();
  await page.evaluate(() => { const user = JSON.parse(sessionStorage.getItem('auth_user')!); user.id = 'other-account'; sessionStorage.setItem('auth_user', JSON.stringify(user)); });
  // Replace the auth response too: the route's old user should not restore the first account.
  await page.route('**/api/auth/me', route => route.fulfill({ json: { user: { id: 'other-account', role: 'TEACHER', name: 'Other Explorer', isActive: true, cursorEffect: 'NONE' } } }));
  await page.goto('/games/word-connect');
  await expect(page.getByRole('link', { name: 'Start adventure', exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).levels.read.found, storageKey)).toEqual(['READ', 'DEAR', 'DARE', 'EAR']);
});

test('student access uses Word Connect policies and starts a timed play session', async ({ page }) => {
  const requests = await fixture(page, 'STUDENT');
  await expect(page.getByRole('link', { name: 'Start adventure', exact: true })).toBeVisible();
  expect(requests.some(request => request.path.includes('access?gameKey=WORD_CONNECT'))).toBe(true);
  expect(requests.some(request => request.path.endsWith('/start'))).toBe(false);
  await page.getByRole('link', { name: 'Start adventure', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(requests.some(request => request.path.endsWith('/start') && request.body.gameKey === 'WORD_CONNECT')).toBe(true);
});

test('blocked student cannot play', async ({ page }) => {
  const requests = await fixture(page, 'STUDENT', true);
  await expect(page.getByRole('heading', { name: 'Word Connect Adventure is blocked' })).toBeVisible();
  await page.goto('/games/word-connect/play/read');
  await expect(page.getByRole('heading', { name: 'Word Connect Adventure is blocked' })).toBeVisible();
  expect(requests.some(request => request.path.endsWith('/start'))).toBe(false);
});

test('touch gestures, backtracking, shuffle, and narrow screens', async ({ page }, info) => {
  await fixture(page);
  await page.getByRole('link', { name: 'Start adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s explore' }).click();
  const wheel = page.getByRole('group', { name: /^Letter wheel/ });
  await wheel.scrollIntoViewIfNeeded();
  await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
  const session = await page.context().newCDPSession(page);
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const centers = await Promise.all('REAED'.split('').map(async letter => {
    const box = await page.getByRole('button', { name: `Letter ${letter}`, exact: true }).boundingBox();
    return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2, id: 1 };
  }));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [centers[0]] });
  await expect(page.getByLabel('Your word')).toHaveText('R');
  for (const [i, point] of centers.slice(1).entries()) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
    await expect(page.getByLabel('Your word')).toHaveText(['RE', 'REA', 'RE', 'RED'][i]);
  }
  // A -> E goes back one step; the resulting word is RED.
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByText(/^Bonus discovery! RED/)).toBeVisible();
  await page.getByRole('button', { name: 'Letter R', exact: true }).click();
  await page.getByRole('button', { name: 'Shuffle letters', exact: true }).click();
  await expect(page.getByLabel('Your word')).toHaveText('Connect the letters');
  await enterWord(page, 'read');
  await expect(page.getByText('1 / 4 words', { exact: true })).toBeVisible();
  await wheel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('wheel-viewport.png') });
  if (info.project.name.includes('mobile')) {
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'Back to adventure map' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
