import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';
import { LEVELS } from '../../src/pages/games/word-connect/content';

test.use({ serviceWorkers: 'block' });
const storageKey = 'mrlc:word-connect:v3:word-connect-fixture';
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

test('game shelf brings every student game into one page', async ({ page }, info) => {
  await fixture(page, 'STUDENT');
  await page.goto('/games');
  await expect(page.getByRole('heading', { name: 'Games for curious minds.' })).toBeVisible();
  for (const title of ['Learning Quest', 'Word Trail', 'Daily Quest', 'Sudoku', 'Chess', 'Checkers', 'Periodic Table', 'Snake', 'Pac-Man']) {
    await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Start Word Connect' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('game-shelf.png'), fullPage: true });
  await page.locator('.gh-shelf').first().screenshot({ path: info.outputPath('word-games.png') });
});

test('map, keyboard play, duplicate/bonus feedback, save, completion, and collection', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await fixture(page);
  await expect(page.getByRole('heading', { name: 'Word Connect Adventure' })).toBeVisible();
  await expect(page.getByLabel('Level 2 locked: In the classroom')).toBeVisible();
  await expect(page.getByRole('button', { name: /C1 Nuance Summit/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('adventure-map.png'), fullPage: true });
  await page.getByRole('link', { name: 'Start adventure', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'AI School Assistant' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Let’s explore' }).click();
  if (info.project.name.includes('mobile')) {
    const pip = page.locator('.wc-pip-mobile');
    await expect(pip).toBeVisible();
    const pipBox = await pip.boundingBox(), boardBox = await page.locator('.wc-play-board').boundingBox();
    expect(pipBox!.y + pipBox!.height <= boardBox!.y).toBe(true);
  }
  await expect(page.getByRole('img', { name: /Pip the pangolin/ })).toBeVisible();
  await enterWord(page, 'student');
  await expect(page.getByRole('status').filter({ hasText: /^STUDENT —/ })).toBeVisible();
  await expect(page.locator('.wc-pip-reaction:visible').getByText('That connection was brilliant!')).toBeVisible();
  await enterWord(page, 'student');
  await expect(page.getByText('You’ve already found STUDENT. Try another word.')).toBeVisible();
  await enterWord(page, LEVELS[0].bonus[0].word);
  await expect(page.getByText(new RegExp(`^Bonus discovery! ${LEVELS[0].bonus[0].word}`))).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 / 2 words', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.wc-play-board').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('play-viewport.png') });
  await page.locator('.wc-game').screenshot({ path: info.outputPath('puzzle-light.png') });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.locator('.wc-game').screenshot({ path: info.outputPath('puzzle-dark.png') });
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await enterWord(page, 'used');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('3 stars')).toBeVisible();
  await page.getByRole('dialog').screenshot({ path: info.outputPath('completion.png') });
  await page.getByRole('link', { name: 'Adventure map', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Play level 2: In the classroom' })).toBeVisible();
  await page.getByRole('button', { name: /Word collection/ }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'STUDENT', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('heading', { name: LEVELS[0].bonus[0].word, exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('tap, swipe, undo and staged hints are playable without a keyboard', async ({ page }) => {
  await fixture(page);
  await page.getByRole('link', { name: 'Start adventure', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s explore' }).click();
  await page.getByRole('button', { name: 'Letter S', exact: true }).click();
  await expect(page.getByLabel('Your word')).toHaveText('S');
  await page.getByRole('button', { name: 'Undo last letter' }).click();
  await expect(page.getByLabel('Your word')).toHaveText('Connect the letters');
  const before = await page.locator('.wc-letter').evaluateAll(nodes => nodes.map(node => `${node.textContent}:${node.getAttribute('style')}`));
  await page.getByRole('button', { name: 'Shuffle letters' }).click();
  const after = await page.locator('.wc-letter').evaluateAll(nodes => nodes.map(node => `${node.textContent}:${node.getAttribute('style')}`));
  expect(after).not.toEqual(before);
  await page.getByRole('button', { name: 'Show meaning' }).click();
  await page.getByRole('button', { name: 'Show a sentence' }).click();
  await expect(page.locator('.wc-meaning blockquote')).toContainText('____');
  await page.getByRole('button', { name: 'Reveal first letter' }).click();
  await expect(page.getByText('Starts with S', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reveal this word' }).click();
  await expect(page.getByText('1 / 2 words', { exact: true })).toBeVisible();
  await enterWord(page, 'used');
  await expect(page.getByRole('dialog').getByLabel('1 stars')).toBeVisible();
});

test('locked URLs, final puzzle, and account isolation', async ({ page }) => {
  await fixture(page);
  await page.goto('/games/word-connect/play/c1-20');
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
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).levels['a1-01'].found, storageKey)).toEqual(LEVELS[0].words.map(item => item.word));
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
  await page.goto('/games/word-connect/play/a1-01');
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
  const centers = await Promise.all('USED'.split('').map(async letter => {
    const box = await page.getByRole('button', { name: `Letter ${letter}`, exact: true }).boundingBox();
    return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2, id: 1 };
  }));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [centers[0]] });
  await expect(page.getByLabel('Your word')).toHaveText('U');
  for (const [i, point] of centers.slice(1).entries()) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [point] });
    await expect(page.getByLabel('Your word')).toHaveText(['US', 'USE', 'USED'][i]);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByText(/^USED —/)).toBeVisible();
  await page.getByRole('button', { name: 'Letter S', exact: true }).click();
  await page.getByRole('button', { name: 'Shuffle letters', exact: true }).click();
  await expect(page.getByLabel('Your word')).toHaveText('Connect the letters');
  await wheel.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('wheel-viewport.png') });
  await enterWord(page, 'student');
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Look how far you’ve come!' })).toBeVisible();
  await page.getByRole('dialog').getByRole('link', { name: 'Adventure map' }).click();
  if (info.project.name.includes('mobile')) {
    await page.setViewportSize({ width: 320, height: 640 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
