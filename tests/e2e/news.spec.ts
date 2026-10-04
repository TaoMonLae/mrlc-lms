import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { CURRENT_RELEASE } from '../../src/data/releases';

const source = { id: 'ged-source', name: 'Essential Education — GED & HiSET Student Blog', category: 'GED' };
const stories = Array.from({ length: 26 }, (_,i) => ({
  id: `story-${i}`, title: `GED learning story ${i + 1}: Building confidence through study`,
  summary: 'Explore practical ideas for learning, understand the evidence, and build the skills to take your next step.',
  content: '<p style="font-size:10px;color:#fff">Learning starts with curiosity. Read carefully, ask questions, and consider the evidence.</p>'.repeat(8),
  imageUrl: null, link: 'https://example.com/learning', author: 'Education team',
  publishedAt: '2026-10-01T08:00:00Z', fetchedAt: '2026-10-04T08:00:00Z', hasFullContent: true, source,
}));

async function setup(page: Page, failures: { pageTwo?: boolean; article?: boolean; topics?: boolean } = {}) {
  const user = { id: 'news-test', firstName: 'News', lastName: 'Reader', role: 'ADMIN', isActive: true, mfaEnabled: true, cursorEffect: 'NONE' };
  const requests: string[] = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ user, release }) => {
    sessionStorage.setItem('auth_token', 'fixture');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
    localStorage.setItem('mrlc-lms-theme', 'light');
  }, { user, release: CURRENT_RELEASE.id });
  await page.route('**/api/**', route => {
    const u = new URL(route.request().url());
    requests.push(u.pathname + u.search);
    const send = (json: unknown) => route.fulfill({ json });
    const fail = () => route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } });
    if (u.pathname === '/api/auth/me') return send({ user });
    if (u.pathname === '/api/news/categories') {
      if (failures.topics) return fail();
      return send(['World', 'GED', 'Education', 'STEM', 'Myanmar', 'Malaysia', 'Global Affairs']);
    }
    if (u.pathname === '/api/news') {
      const pageNum = Number(u.searchParams.get('page') || 1);
      if (pageNum === 2 && failures.pageTwo) { failures.pageTwo = false; return fail(); }
      return send({ items: stories.slice((pageNum - 1) * 24, pageNum * 24), total: stories.length });
    }
    if (u.pathname.startsWith('/api/news/')) {
      if (failures.article) return fail();
      return send(stories.find(s => u.pathname.endsWith(s.id)) || stories[0]);
    }
    if (u.pathname === '/api/news-sources') return send([{ ...source, feedUrl: 'https://example.com/feed', enabled: false, lastError: 'Old fetch error', lastFetchedAt: null, _count: { articles: 5 } }]);
    if (u.pathname === '/api/dictionary/lookup') return send({ word: 'Learning', entries: [{ posLabel: 'noun', definition: 'Gaining knowledge through study.', examples: [] }], translations: [], monMatches: [] });
    if (/settings|branding/.test(u.pathname)) return send({ name: 'Mon Refugee Learning Centre', logoUrl: '/icon-192.png' });
    return send([]);
  });
  return requests;
}

async function checkLayout(page: Page) {
  expect(await page.locator('.news-page').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('news typography, topics, pagination retry and reader return preserve filters', async ({ page }, info) => {
  const failures = { pageTwo: true, topics: true };
  const requests = await setup(page, failures);
  await page.goto('/news');
  await expect(page.getByRole('button', { name: 'Retry topics' })).toBeVisible();
  failures.topics = false;
  await page.getByRole('button', { name: 'Retry topics' }).click();
  await page.getByRole('button', { name: 'GED', exact: true }).click();
  const search = page.getByRole('textbox', { name: 'Search news articles' });
  await search.fill('study');
  await page.locator('.news-search-submit').click();
  await page.getByRole('button', { name: 'Compact list' }).click();
  await expect(page.locator('.news-story')).toHaveCount(24);
  await expect(search).toHaveCSS('font-size', '16px');
  await expect(page.locator('.news-story-meta').first()).toHaveCSS('font-size', '14px');
  await checkLayout(page);
  await page.screenshot({ path: info.outputPath('news-list.png') });
  await page.getByRole('button', { name: 'Load more stories' }).click();
  await expect(page.getByRole('button', { name: 'Retry loading stories' })).toBeVisible();
  await expect(page.locator('.news-story')).toHaveCount(24);
  await page.getByRole('button', { name: 'Retry loading stories' }).click();
  await expect(page.locator('.news-story')).toHaveCount(26);
  expect(requests.filter(url => url.startsWith('/api/news?') && url.includes('page=2'))).toHaveLength(2);
  await page.locator('.news-story-link').first().click();
  await expect(page.locator('.news-prose')).toBeVisible();
  await page.getByRole('link', { name: 'Back to news', exact: true }).click();
  await expect(search).toHaveValue('study');
  await expect(page.getByRole('button', { name: 'GED', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Compact list' })).toHaveAttribute('aria-pressed', 'true');
});

test('reader retry, text sizing, mobile dictionary and theme accessibility', async ({ page }, info) => {
  const failures = { article: true };
  await setup(page, failures);
  await page.goto('/news/story-0');
  await expect(page.getByRole('heading', { name: 'Article unavailable' })).toBeVisible();
  await expect(page).toHaveURL(/\/news\/story-0$/);
  failures.article = false;
  await page.getByRole('button', { name: 'Retry article' }).click();
  await expect(page.locator('.news-prose p').first()).toHaveCSS('font-size', '19px');
  await expect(page.locator('.news-study-desk').getByRole('link', { name: 'Open dictionary' })).toBeVisible();
  const increase = page.getByRole('button', { name: 'Increase article text size' });
  for (let n = 0; n < 3; n++) await increase.click();
  await expect(increase).toBeDisabled();
  await expect(page.locator('.news-prose p').first()).toHaveCSS('font-size', '25px');
  await page.reload();
  await expect(page.locator('.news-prose p').first()).toHaveCSS('font-size', '25px');
  await checkLayout(page);
  const box = await increase.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.locator('.news-prose p').first().evaluate(el => {
    const range = document.createRange();
    range.setStart(el.firstChild!, 0); range.setEnd(el.firstChild!, 8);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
  });
  await page.getByRole('button', { name: 'Define', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Gaining knowledge through study.');
  await page.getByRole('button', { name: 'Close', exact: true }).first().click();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await checkLayout(page);
    const results = await new AxeBuilder({ page }).include('.news-page').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.locator('.news-reader-header').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`news-reader-${theme}.png`) });
  }
});

test('news grid stays readable in light, dark and narrow layouts', async ({ page }, info) => {
  await setup(page);
  await page.goto('/news');
  await expect(page.locator('.news-lead')).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme);
    await checkLayout(page);
    const results = await new AxeBuilder({ page }).include('.news-page').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({ path: info.outputPath(`news-grid-${theme}.png`) });
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await page.evaluate(() => document.documentElement.style.fontSize = '200%');
  await checkLayout(page);
});

test('source management labels its controls and prioritizes disabled status', async ({ page }) => {
  await setup(page);
  await page.goto('/settings/news-sources');
  await expect(page.getByRole('button', { name: 'Add source', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: `Refresh ${source.name}`, exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: `Remove ${source.name}`, exact: true })).toBeAttached();
  await expect(page.getByRole('cell', { name: 'Disabled', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Error', exact: true })).toHaveCount(0);
});
