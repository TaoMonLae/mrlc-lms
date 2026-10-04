import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('sitemap and robots are served as crawler resources', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  expect(sitemap.headers()['content-type']).toContain('application/xml');
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]));
  expect(urls.map(url => url.pathname)).toEqual(['/', '/language-quest', '/language-quest/about', '/dictionary']);
  expect(new Set(urls.map(url => url.origin)).size).toBe(1);
  const robots = await request.get('/robots.txt');
  expect(robots.headers()['content-type']).toContain('text/plain');
  expect(await robots.text()).toContain(`Sitemap: ${urls[0].origin}/sitemap.xml`);
});

test('private and token URLs are excluded before JavaScript runs', async ({ request }) => {
  for (const path of ['/students', '/about', '/login', '/reset-password?token=seo-secret', '/verify/seo-secret', '/does-not-exist']) {
    const response = await request.get(path);
    expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
    const html = await response.text();
    expect(html).toContain('name="robots" content="noindex, nofollow"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('seo-structured-data');
    expect(html).not.toContain('seo-secret');
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('public pages contain readable text, links and canonical metadata', async ({ page }) => {
    for (const path of ['/', '/language-quest', '/language-quest/about', '/dictionary?word=hello']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await expect(page.locator('nav[aria-label="Public pages"] a')).toHaveCount(4);
      await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large');
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(new URL(canonical!).pathname).toBe(path.split('?')[0]);
      expect(new URL(canonical!).search).toBe('');
      const schema = JSON.parse(await page.locator('#seo-structured-data').textContent() || '{}');
      expect(schema['@graph'].map((item: { '@type': string }) => item['@type'])).toEqual(['School', 'WebSite', 'WebPage']);
    }
  });
});

test('SPA navigation updates and clears metadata without duplicates', async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ json: { courses: [] } }));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Explore Learning Quest', exact: true })).toBeVisible();
  const origin = await page.locator('meta[name="mrlc-site-origin"]').getAttribute('content');
  await page.getByRole('link', { name: 'Explore Learning Quest', exact: true }).click();
  await expect(page).toHaveTitle('Learning Quest | Languages, Mathematics & GED | MRLC');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/language-quest`);
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.locator('link[rel="canonical"], meta[property="og:url"], #seo-structured-data')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveTitle('Learning Quest | Languages, Mathematics & GED | MRLC');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/language-quest`);
  for (const selector of ['title', 'meta[name="description"]', 'meta[name="robots"]', 'meta[property="og:title"]', '#seo-structured-data']) {
    await expect(page.locator(`head ${selector}`)).toHaveCount(1);
  }
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary');

  await page.goto('/does-not-exist');
  await expect(page).toHaveTitle('Page not found | MRLC');
  await page.getByRole('button', { name: 'Return home' }).click();
  await expect(page).toHaveTitle('Mon Refugee Learning Centre | GED School in Malaysia');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/`);
});
