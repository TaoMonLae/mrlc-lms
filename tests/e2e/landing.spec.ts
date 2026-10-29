import { expect, test, type Page } from '@playwright/test';
import { CURRENT_RELEASE } from '../../src/data/releases';

test.use({ serviceWorkers: 'block', contextOptions: { reducedMotion: 'reduce' } });

const schoolName = 'Mon Refugee Learning Centre';
const themeKey = 'mrlc-lms-theme';

/** Intercept API calls so the public-page checks do not depend on school records. */
async function fixture(page: Page, options: {
  logoUrl?: string | null;
  loginHeroUrl?: string | null;
  role?: 'ADMIN' | 'GUARDIAN';
  theme?: 'light' | 'dark' | 'system';
  blockThemeStorage?: boolean;
} = {}) {
  const user = options.role ? {
    id: 'landing-fixture-user', role: options.role, firstName: 'Landing', lastName: 'Visitor',
    email: 'landing@example.test', isActive: true, mfaEnabled: true, cursorEffect: 'NONE',
  } : null;
  await page.addInitScript(({ user, release, theme, storageKey, blockThemeStorage }) => {
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem(storageKey, theme);
    if (user) {
      sessionStorage.setItem('auth_token', 'landing-fixture-token');
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
    }
    if (blockThemeStorage) {
      // Isolate theme persistence; auth and locale storage remain available.
      const getItem = Storage.prototype.getItem;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) {
        if (this === localStorage && key === storageKey) throw new DOMException('Storage blocked', 'SecurityError');
        return getItem.call(this, key);
      };
      Storage.prototype.setItem = function (key, value) {
        if (this === localStorage && key === storageKey) throw new DOMException('Storage blocked', 'SecurityError');
        return setItem.call(this, key, value);
      };
    }
  }, {
    user, release: CURRENT_RELEASE.id, theme: options.theme || 'light',
    storageKey: themeKey, blockThemeStorage: Boolean(options.blockThemeStorage),
  });
  const branding = {
    name: schoolName, shortName: 'MRLC', address: 'Malaysia',
    logoUrl: options.logoUrl ?? null, loginHeroUrl: options.loginHeroUrl ?? null,
    primaryColor: '#19324d', cursorEffect: 'NONE', contactEmail: null, contactPhone: null,
  };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/public/branding' || path === '/api/settings') return route.fulfill({ json: branding });
    if (path === '/api/auth/me') return route.fulfill({ status: user ? 200 : 401, json: user ? { user } : { error: 'Not signed in' } });
    if (path === '/api/language-quest/public/catalog') return route.fulfill({ json: { courses: [] } });
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    return route.fulfill({ status: 404, json: { error: 'Not part of the landing fixture' } });
  });
}

async function openLanding(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'One school day. Everyone in step.' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
}

for (const width of [320, 390, 960, 1280]) {
  test(`the complete landing page fits a ${width}px viewport and exposes navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await fixture(page);
    await openLanding(page);
    const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
    const mainNavigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    if (width <= 1100) {
      await expect(menu).toBeVisible();
      await expect(mainNavigation).toBeHidden();
      await menu.click();
      const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
      await expect(mobileNavigation.getByRole('link', { name: 'Sign in to MRLC', exact: true })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.getByRole('button', { name: 'Close navigation', exact: true }).click();
    } else {
      await expect(menu).toBeHidden();
      await expect(mainNavigation).toBeVisible();
      await expect(page.locator('header').getByRole('link', { name: 'Sign in to MRLC', exact: true })).toBeVisible();
    }
    for (const section of ['#main-content', '#platform', '#learning-quest', '#whats-new', '#about', '.landing-footer']) {
      await page.locator(section).scrollIntoViewIfNeeded();
      await expectNoHorizontalOverflow(page);
    }
  });
}

test('public navigation reaches each section, downloads, Learning Quest and sign in', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await fixture(page);
  await openLanding(page);
  const navigation = page.getByRole('navigation', { name: 'Main navigation', exact: true });
  for (const [label, target] of [
    ['The platform', '#platform'], ['Learning Quest', '#learning-quest'],
    ["What's new", '#whats-new'], ['About MRLC', '#about'],
  ]) {
    const link = navigation.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', target);
    await link.click();
    await expect(page.locator(target)).toBeInViewport();
    const headerBottom = await page.locator('header').evaluate(element => element.getBoundingClientRect().bottom);
    const targetTop = await page.locator(target).evaluate(element => element.getBoundingClientRect().top);
    expect(targetTop).toBeGreaterThanOrEqual(headerBottom - 1);
  }
  await navigation.getByRole('link', { name: 'Kiosk downloads', exact: true }).click();
  await expect(page).toHaveURL(/\/kiosk-downloads$/);
  await expect(page.getByRole('heading', { level: 1, name: 'A focused school session, on this computer.' })).toBeVisible();
  await page.getByRole('link', { name: `${schoolName} home`, exact: true }).click();
  await page.getByRole('link', { name: 'Explore Learning Quest', exact: true }).first().click();
  await expect(page).toHaveURL(/\/language-quest$/);
  await expect(page.getByRole('heading', { name: 'Choose your next quest', exact: true })).toBeVisible();
  await openLanding(page);
  await page.locator('.landing-hero').getByRole('link', { name: 'Sign in to MRLC', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Sign in to your school day.', exact: true })).toBeVisible();
});

for (const [role, label, href] of [
  ['ADMIN', 'Open dashboard', '/dashboard'],
  ['GUARDIAN', 'Open Family Portal', '/family'],
] as const) {
  test(`${role} visitors receive the correct workspace link`, async ({ page }) => {
    await fixture(page, { role });
    await openLanding(page);
    const portal = page.locator('.landing-hero').getByRole('link', { name: label, exact: true });
    await expect(portal).toBeVisible();
    await expect(portal).toHaveAttribute('href', href);
  });
}

test('keyboard users can skip the header and dismiss the mobile menu with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await openLanding(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  const toggle = page.getByRole('button', { name: 'Open navigation', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Close navigation', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true }).getByRole('link', { name: 'The platform', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('mobile section links close the menu and focus the destination', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await openLanding(page);
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await page.getByRole('navigation', { name: 'Mobile navigation', exact: true }).getByRole('link', { name: 'The platform', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation', exact: true })).toBeHidden();
  await expect(page.locator('#platform')).toBeFocused();
  await expect(page.locator('#platform')).toBeInViewport();
  await page.keyboard.press('Tab');
  await expect(page.locator('#learning-quest').getByRole('link', { name: 'Explore Learning Quest', exact: true })).toBeFocused();
});

test('mobile navigation closes on outside interaction, focus leaving the header and desktop resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await openLanding(page);
  const toggle = page.getByRole('button', { name: 'Open navigation', exact: true });
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  await toggle.click();
  await page.locator('.landing-hero-foot').click();
  await expect(navigation).toBeHidden();
  await toggle.click();
  await page.locator('.landing-hero').getByRole('link', { name: 'Sign in to MRLC', exact: true }).focus();
  await expect(navigation).toBeHidden();
  await toggle.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(navigation).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(navigation).toBeHidden();
});

test('the menu scrolls in a short viewport and keeps its last control reachable', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 320 });
  await fixture(page);
  await openLanding(page);
  const toggle = page.getByRole('button', { name: 'Open navigation', exact: true });
  await toggle.focus();
  await page.keyboard.press('Enter');
  const navigation = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  await expect.poll(() => navigation.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  expect(await navigation.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThanOrEqual(321);
  for (let index = 0; index < 7; index += 1) await page.keyboard.press('Tab');
  const themeToggle = navigation.getByRole('button', { name: 'Use dark theme', exact: true });
  await expect(themeToggle).toBeFocused();
  await expect(themeToggle).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
});

test('broken configured default logo, hero photo and quest art leave readable branding and content', async ({ page }) => {
  await fixture(page, { logoUrl: '/icon-192.png', loginHeroUrl: '/landing-missing-hero.jpg', theme: 'dark' });
  await page.route('**/icon-192.png', route => route.abort());
  await page.route('**/landing-missing-hero.jpg', route => route.abort());
  await page.route('**/games/word-connect/pip-study-*.webp', route => route.abort());
  const configuredHeroRequested = page.waitForRequest('**/landing-missing-hero.jpg');
  await openLanding(page);
  await configuredHeroRequested;
  await expect(page.locator('header .landing-brand-fallback')).toHaveText('MRLC');
  await expect(page.locator('footer .landing-brand-fallback')).toHaveText('MRLC');
  const fallbackContrast = await page.locator('header .landing-brand-fallback').evaluate(element => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const channels = (color.match(/[\d.]+/g) || []).slice(0, 3).map(value => Number(value) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(fallbackContrast).toBeGreaterThanOrEqual(4.5);
  await expect(page.locator('.landing-brand img, .landing-hero-photo')).toHaveCount(0);
  await expect(page.getByRole('link', { name: `${schoolName} home`, exact: true })).toBeVisible();
  await expect(page.locator('.landing-daybook')).toBeVisible();
  await page.locator('#learning-quest').scrollIntoViewIfNeeded();
  await expect(page.getByAltText('Pip reading a book', { exact: true })).toHaveCount(0);
  await expect(page.locator('.landing-quest-fallback')).toBeVisible();
  await expect(page.locator('#learning-quest').getByRole('link', { name: 'Explore Learning Quest', exact: true })).toBeVisible();
});

test('Learning Quest loads a responsive WebP illustration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await openLanding(page);
  const illustration = page.getByAltText('Pip reading a book', { exact: true });
  await illustration.scrollIntoViewIfNeeded();
  await expect(illustration).toHaveAttribute('src', /pip-study-640\.webp$/);
  for (const width of [320, 640, 960]) await expect(illustration).toHaveAttribute('srcset', new RegExp(`pip-study-${width}\\.webp ${width}w`));
  await expect.poll(() => illustration.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(await illustration.evaluate(image => (image as HTMLImageElement).currentSrc)).toMatch(/pip-study-(320|640|960)\.webp$/);
  await expectNoHorizontalOverflow(page);
});

test('system appearance updates the page and theme control until the visitor chooses a theme', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await fixture(page, { theme: 'system' });
  await openLanding(page);
  await expect(page.locator('html')).toHaveClass(/\blight\b/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.getByRole('button', { name: 'Use light theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/\blight\b/);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveClass(/\blight\b/);
  await expect(page.getByRole('button', { name: 'Use dark theme', exact: true })).toBeVisible();
});

test('theme controls remain usable when saving and reading the theme preference is blocked', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await fixture(page, { blockThemeStorage: true });
  await openLanding(page);
  await page.getByRole('button', { name: 'Use dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  await page.getByRole('button', { name: 'Use light theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/\blight\b/);
  expect(errors).toEqual([]);
});
