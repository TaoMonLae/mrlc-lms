import { expect, test, type Page } from '@playwright/test';
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import { CURRENT_RELEASE } from '../../src/data/releases';

test.use({ serviceWorkers: 'block' });

async function pdfFixture() {
  const pdf = new PDFDocument({ size: 'LETTER', margin: 50 });
  const buffers: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve) => {
    pdf.on('data', (chunk) => buffers.push(chunk));
    pdf.on('end', () => resolve(Buffer.concat(buffers)));
  });
  for (let page = 1; page <= 40; page++) {
    if (page > 1) pdf.addPage();
    pdf.fontSize(24).text(`Reading practice — page ${page}`);
    pdf.moveDown().fontSize(12).text(`This is the content of page ${page}. Students can scroll, select words, and navigate with their keyboards. ` .repeat(8));
  }
  pdf.end();
  return finished;
}

async function epubFixture() {
  const zip = new JSZip();
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/book.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  zip.file('OEBPS/book.opf', `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">reader-fixture</dc:identifier><dc:title>Reading practice</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-09-30T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/>${[1, 2, 3].map(n => `<item id="chapter${n}" href="chapter${n}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${[1, 2, 3].map(n => `<itemref idref="chapter${n}"/>`).join('')}</spine></package>`);
  zip.file('OEBPS/nav.xhtml', '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><ol><li><a href="chapter1.xhtml">Chapter one</a><ol><li><a href="chapter2.xhtml">Chapter two</a></li></ol></li><li><a href="chapter3.xhtml">Chapter three</a></li></ol></nav></body></html>');
  for (const chapter of [1, 2, 3]) {
    zip.file(`OEBPS/chapter${chapter}.xhtml`, `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Chapter ${chapter}</title><style>body { font-family: sans-serif; line-height: 1.7; } p { margin-bottom: 24px; }</style></head><body><h1>Chapter ${chapter}</h1><input aria-label="Chapter notes" type="text"/><p>Chapter ${chapter} opens with a short reading preview.</p>${Array.from({ length: 55 }, (_, i) => `<p>Paragraph ${i + 1}. Learning is easier when a book supports familiar scrolling and keyboard controls. Keep reading to move naturally into the following chapter.</p>`).join('')}</body></html>`);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function fixture(page: Page, format: 'PDF' | 'EPUB', savedPage = '1') {
  const user = { id: 'reader-teacher', role: 'TEACHER', firstName: 'Teacher', lastName: 'Reader', name: 'Teacher Reader', isActive: true, cursorEffect: 'NONE' };
  const body = format === 'PDF' ? await pdfFixture() : await epubFixture();
  const writes: { location: string; percent: number }[] = [];
  await page.addInitScript(({ user, release }) => {
    sessionStorage.setItem('auth_token', 'reader-test');
    sessionStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem(`mrlc:release-seen:${user.id}`, release);
  }, { user, release: CURRENT_RELEASE.id });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { user } });
    if (path.endsWith('/stream')) return route.fulfill({ contentType: 'text/event-stream', body: ': fixture\n\n' });
    if (path === '/api/ebooks/reader-fixture/content') {
      expect(route.request().headers().authorization).toBe('Bearer reader-test');
      return route.fulfill({ body, contentType: format === 'PDF' ? 'application/pdf' : 'application/epub+zip' });
    }
    if (path === '/api/ebooks/reader-fixture/progress') {
      if (route.request().method() === 'PUT') writes.push(route.request().postDataJSON());
      return route.fulfill({ json: { location: format === 'PDF' ? savedPage : '', percent: null } });
    }
    if (path === '/api/ebooks/reader-fixture') return route.fulfill({ json: { id: 'reader-fixture', title: 'Reading practice', author: 'MRLC', format, downloadAllowed: false } });
    return route.fulfill({ json: path.includes('settings') ? {} : [] });
  });
  await page.goto('/elibrary/reader-fixture/read');
  return writes;
}

test('PDF scrolls through pages, resumes correctly, handles keys and bounds rendering', async ({ page }, info) => {
  const writes = await fixture(page, 'PDF', '3');
  const area = page.getByLabel('PDF reading area');
  await expect(page.getByText('Page 3 / 40', { exact: true })).toBeVisible();
  await expect(area.locator('.react-pdf__Page__canvas').first()).toBeVisible();
  expect(await area.locator('.react-pdf__Page__canvas').count()).toBeLessThan(12);
  await area.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Page 4 / 40', { exact: true })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('Page 3 / 40', { exact: true })).toBeVisible();
  const before = await area.evaluate(el => el.scrollTop);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeGreaterThan(before);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeLessThan(before + 80);
  await area.hover();
  await page.mouse.wheel(0, 1300);
  await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 900);
  await page.keyboard.press('Home');
  await expect(page.getByText('Page 1 / 40', { exact: true })).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByText('Page 40 / 40', { exact: true })).toBeVisible();
  await expect.poll(() => writes.at(-1)?.location).toBe('40');
  await area.focus();
  await page.keyboard.press('Home');
  const toggle = page.getByRole('button', { name: 'Toggle preview pane' });
  if (info.project.name.includes('mobile')) await toggle.click();
  const pane = page.getByRole('complementary', { name: 'Pages preview pane' });
  await expect(pane).toBeVisible();
  await pane.getByRole('button', { name: 'Go to page 7', exact: true }).click();
  await expect(page.getByText('Page 7 / 40', { exact: true })).toBeVisible();
  if (info.project.name.includes('mobile')) await expect(pane).toHaveCount(0);
  else {
    await expect(pane.getByRole('button', { name: 'Go to page 7', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.locator('.elibrary-reader-shell').screenshot({ path: info.outputPath('pdf-previews-light.png') });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.locator('.elibrary-reader-shell').screenshot({ path: info.outputPath('pdf-previews-dark.png') });
  }
});

test('PDF fullscreen scroll and search keyboard stay independent', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'Browser fullscreen is a desktop feature.');
  await fixture(page, 'PDF');
  const area = page.getByLabel('PDF reading area');
  await expect(area.locator('.react-pdf__Page__canvas').first()).toBeVisible();
  await page.getByRole('button', { name: 'Full page view', exact: true }).click();
  await expect(page.locator('.elibrary-reader-shell')).toHaveAttribute('data-fullscreen', 'true');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Page 2 / 40', { exact: true })).toHaveCount(1);
  await area.hover();
  const before = await area.evaluate(el => el.scrollTop);
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 900);
  await area.click({ position: { x: 8, y: 8 } });
  await page.getByRole('button', { name: 'Search in book', exact: true }).click();
  const search = page.getByRole('dialog').getByRole('textbox');
  await search.fill('reading');
  const position = await area.evaluate(el => el.scrollTop);
  await search.press('ArrowRight');
  expect(await area.evaluate(el => el.scrollTop)).toBe(position);
  await page.getByRole('dialog').screenshot({ path: info.outputPath('pdf-fullscreen-search.png') });
});

test('PDF two-page layout scrolls and keyboard navigation follows spreads', async ({ page }, info) => {
  await fixture(page, 'PDF');
  const area = page.getByLabel('PDF reading area');
  await expect(area.locator('.react-pdf__Page__canvas').first()).toBeVisible();
  const menu = page.locator('[data-reader-menu]');
  await menu.locator('summary').click();
  await menu.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Two Page', exact: true }).click();
  if (await menu.evaluate(element => element.hasAttribute('open'))) await menu.locator('summary').click();
  await expect(page.getByText('Pages 1–2 / 40', { exact: true })).toBeVisible();
  await area.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Pages 3–4 / 40', { exact: true })).toBeVisible();
  const row = area.locator('[data-pdf-page="3"]').locator('..');
  await expect(row.locator('[data-pdf-page]')).toHaveCount(2);
  const before = await area.evaluate(el => el.scrollTop);
  await page.keyboard.press('PageDown');
  await expect.poll(() => area.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 200);
  await area.focus();
  await page.keyboard.press('Home');
  await expect(page.getByText('Pages 1–2 / 40', { exact: true })).toBeVisible();
  if (info.project.name.includes('mobile')) {
    await page.locator('.elibrary-reader-shell').screenshot({ path: info.outputPath('pdf-two-page-mobile.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test('EPUB scrolls inside chapters, supports iframe keys and nested chapter previews', async ({ page }, info) => {
  const writes = await fixture(page, 'EPUB');
  const area = page.getByLabel('EPUB reading area');
  const scroller = area.locator('.epub-container');
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeEnabled();
  const frame = area.frameLocator('iframe').first();
  await expect(frame.getByRole('heading', { name: 'Chapter 1' })).toBeVisible();
  await frame.getByRole('heading', { name: 'Chapter 1' }).click();
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const before = await scroller.evaluate(el => el.scrollTop);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 200);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeLessThan(before + 200);
  await area.hover();
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 600);
  await area.focus();
  await page.keyboard.press('Home');
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeLessThan(100);
  // A chapter input must keep its arrow keys for editing.
  const inputFrame = await Promise.all(page.frames().filter(frame => frame.parentFrame()).map(async frame => ({ frame, count: await frame.getByLabel('Chapter notes').count() })));
  const input = inputFrame.find(entry => entry.count)!.frame.getByLabel('Chapter notes');
  await input.fill('Reader notes');
  const position = await scroller.evaluate(el => el.scrollTop);
  await input.press('ArrowRight');
  expect(await scroller.evaluate(el => el.scrollTop)).toBe(position);
  if (info.project.name.includes('mobile')) await page.getByRole('button', { name: 'Toggle preview pane' }).click();
  const pane = page.getByRole('complementary', { name: 'Contents preview pane' });
  await expect(pane).toBeVisible();
  await expect.poll(() => writes.length).toBeGreaterThan(0);
  const beforeChapter = writes.at(-1)?.location;
  await pane.getByRole('button', { name: 'Go to chapter 2: Chapter two', exact: true }).click();
  await expect.poll(() => writes.at(-1)?.location).not.toBe(beforeChapter);
  if (info.project.name.includes('mobile')) await expect(pane).toHaveCount(0);
  else {
    await expect(pane.getByRole('button', { name: 'Go to chapter 2: Chapter two', exact: true })).toHaveAttribute('aria-current', 'location');
    await page.locator('.elibrary-reader-shell').screenshot({ path: info.outputPath('epub-chapter-previews.png') });
  }
});

test('EPUB paginated mode handles wheel gestures and iframe arrow keys', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'Wheel gestures are verified on desktop.');
  await fixture(page, 'EPUB');
  const area = page.getByLabel('EPUB reading area');
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeEnabled();
  const menu = page.locator('[data-reader-menu]');
  await menu.locator('summary').click();
  await page.getByRole('combobox', { name: 'Reading mode' }).click();
  await page.getByRole('option', { name: 'Paginated', exact: true }).click();
  if (await menu.evaluate(element => element.hasAttribute('open'))) await menu.locator('summary').click();
  await expect(menu).not.toHaveAttribute('open');
  await expect(area).toHaveAttribute('data-reader-flow', 'pages');
  const scroller = area.locator('.epub-container');
  await expect.poll(() => scroller.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await area.focus();
  await area.hover();
  await page.mouse.wheel(0, 240);
  await expect.poll(() => scroller.evaluate(el => el.scrollLeft)).toBeGreaterThan(100);
  const beforeKey = await scroller.evaluate(el => el.scrollLeft);
  // The focused iframe must forward shortcuts as well as the outer viewer.
  const frame = area.frameLocator('iframe').first();
  await frame.locator('body').press('ArrowRight');
  await expect.poll(() => scroller.evaluate(el => el.scrollLeft)).toBeGreaterThan(beforeKey + 100);
  await frame.locator('body').press('ArrowLeft');
  await expect.poll(() => scroller.evaluate(el => el.scrollLeft)).toBeLessThan(beforeKey + 100);
  await menu.locator('summary').click();
  await page.getByRole('combobox', { name: 'Reading mode' }).click();
  await page.getByRole('option', { name: 'Continuous scroll', exact: true }).click();
  if (await menu.evaluate(element => element.hasAttribute('open'))) await menu.locator('summary').click();
  await expect(area).toHaveAttribute('data-reader-flow', 'scroll');
  await expect.poll(() => scroller.evaluate(el => getComputedStyle(el).overflowY)).toBe('scroll');
});

test('EPUB fullscreen scroll reaches other chapters and previews stay usable', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'Browser fullscreen is a desktop feature.');
  const writes = await fixture(page, 'EPUB');
  const area = page.getByLabel('EPUB reading area');
  await expect(page.getByRole('button', { name: 'Next page', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Full page view', exact: true }).click();
  await expect(page.locator('.elibrary-reader-shell')).toHaveAttribute('data-fullscreen', 'true');
  await page.keyboard.press('ArrowDown');
  const scroller = area.locator('.epub-container');
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await area.hover();
  const before = await scroller.evaluate(el => el.scrollTop);
  await page.mouse.wheel(0, 1000);
  await expect.poll(() => scroller.evaluate(el => el.scrollTop)).toBeGreaterThan(before + 600);
  const pane = page.getByRole('complementary', { name: 'Contents preview pane' });
  // Native wheel scrolling must cross chapter boundaries, not stop at the
  // bottom of the initial iframe. EPUB.js appends chapters as they approach.
  await expect(async () => {
    await page.mouse.wheel(0, 1500);
    await expect(pane.getByRole('button', { name: 'Go to chapter 1: Chapter one', exact: true })).not.toHaveAttribute('aria-current', 'location', { timeout: 600 });
  }).toPass({ timeout: 10000, intervals: [500] });
  await pane.getByRole('button', { name: 'Go to chapter 3: Chapter three', exact: true }).click();
  await expect(pane.getByRole('button', { name: 'Go to chapter 3: Chapter three', exact: true })).toHaveAttribute('aria-current', 'location');
  await expect.poll(() => writes.at(-1)?.percent ?? 0).toBeGreaterThan(60);
  await pane.getByRole('button', { name: 'Hide preview pane' }).click();
  await expect(pane).toHaveCount(0);
  await area.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Toggle preview pane' })).toBeVisible();
  await page.getByRole('button', { name: 'Toggle preview pane' }).click();
  await expect(pane).toBeVisible();
  await page.locator('.elibrary-reader-shell').screenshot({ path: info.outputPath('epub-fullscreen-previews.png') });
});
