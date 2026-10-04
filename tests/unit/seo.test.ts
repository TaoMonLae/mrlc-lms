import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer, request, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { DOMParser } from '@xmldom/xmldom';
import express from 'express';
import { buildRobotsTxt, buildSitemap, registerSeoRoutes, renderSeoHtml } from '../../lib/seo';
import { getPublicSeoPage, getSeoMetadata, getSiteOrigin } from '../../shared/seo';

const ORIGIN = 'https://school.example:8443';
const PUBLIC_PATHS = ['/', '/language-quest', '/language-quest/about', '/dictionary'];
const PRIVATE_PATHS = [
  '/about', '/mon-language', '/updates', '/login', '/signup', '/forgot-password',
  '/reset-password?token=private-reset-token', '/unauthorized', '/dashboard',
  '/family', '/student/profile', '/teacher/dashboard', '/settings',
  '/games/language-quest', '/games/language-quest/profile/student-id',
  '/verify/payment/payment-id', '/verify/personnel/private-personnel-token',
  '/verify/private-document-token', '/dictionary/unknown', '/missing-page',
];
const TEMPLATE = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

function parseXml(source: string): Document {
  const errors: string[] = [];
  const document = new DOMParser({ errorHandler: {
    warning: message => errors.push(message),
    error: message => errors.push(message),
    fatalError: message => errors.push(message),
  } }).parseFromString(source, 'application/xml');
  assert.deepEqual(errors, [], 'XML must parse without recovery');
  return document;
}

function parseHtml(source: string): Document {
  // xmldom warns about legal HTML valueless attributes such as crossorigin.
  return new DOMParser({ errorHandler: {
    warning: () => {},
    error: message => assert.fail(message),
    fatalError: message => assert.fail(message),
  } }).parseFromString(source, 'text/html');
}

function elements(document: Document, tag: string): Element[] {
  return Array.from(document.getElementsByTagName(tag));
}

function meta(document: Document, name: string): string | null | undefined {
  return elements(document, 'meta').find(element =>
    element.getAttribute('name') === name || element.getAttribute('property') === name,
  )?.getAttribute('content');
}

test('sitemap is valid XML containing exactly the account-free content URLs on the configured origin', () => {
  const xml = buildSitemap(`${ORIGIN}/`);
  const document = parseXml(xml);
  assert.equal(document.documentElement.localName, 'urlset');
  assert.equal(document.documentElement.namespaceURI, 'http://www.sitemaps.org/schemas/sitemap/0.9');
  const urls = elements(document, 'loc').map(element => element.textContent);
  assert.deepEqual(urls, PUBLIC_PATHS.map(path => `${ORIGIN}${path}`));
  assert.equal(new Set(urls).size, urls.length);
  for (const value of urls) {
    const url = new URL(value!);
    assert.equal(url.origin, ORIGIN);
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
  }
  for (const path of PRIVATE_PATHS) assert.ok(!urls.includes(`${ORIGIN}${path}`), path);
  assert.doesNotMatch(xml, /localhost|<lastmod>|<changefreq>|<priority>/);
});

test('robots advertises the absolute sitemap and permits public page rendering resources', () => {
  const directives = buildRobotsTxt(ORIGIN).split('\n').map(line => line.trim()).filter(Boolean);
  assert.ok(directives.includes('User-agent: *'));
  assert.ok(directives.includes('Allow: /'));
  assert.ok(directives.includes(`Sitemap: ${ORIGIN}/sitemap.xml`));
  // Public branding, catalog and dictionary APIs, as well as scripts/styles,
  // must stay crawlable so Google can render the same page visitors see.
  assert.ok(!directives.some(line => /^Disallow:\s*\S/i.test(line)));
});

test('public HTML includes unique metadata, canonical URLs, valid linked schema and readable navigation before JavaScript', () => {
  for (const path of PUBLIC_PATHS) {
    const page = getPublicSeoPage(path)!;
    const html = renderSeoHtml(TEMPLATE, path, ORIGIN);
    const document = parseHtml(html);
    assert.equal(elements(document, 'title').length, 1);
    assert.equal(elements(document, 'title')[0].textContent, page.title);
    assert.equal(meta(document, 'description'), page.description);
    assert.equal(meta(document, 'robots'), 'index, follow, max-image-preview:large');
    assert.equal(meta(document, 'mrlc-site-origin'), ORIGIN);
    assert.equal(meta(document, 'og:title'), page.title);
    assert.equal(meta(document, 'og:description'), page.description);
    assert.equal(meta(document, 'og:url'), `${ORIGIN}${path}`);
    assert.equal(meta(document, 'og:image'), `${ORIGIN}/icon-512.png`);
    assert.equal(meta(document, 'twitter:card'), 'summary');
    assert.equal(meta(document, 'twitter:title'), page.title);
    const canonicals = elements(document, 'link').filter(link => link.getAttribute('rel') === 'canonical');
    assert.equal(canonicals.length, 1);
    assert.equal(canonicals[0].getAttribute('href'), `${ORIGIN}${path}`);

    const schemaScripts = elements(document, 'script').filter(script => script.getAttribute('type') === 'application/ld+json');
    assert.equal(schemaScripts.length, 1);
    const schema = JSON.parse(schemaScripts[0].textContent!);
    assert.equal(schema['@context'], 'https://schema.org');
    assert.deepEqual(schema['@graph'].map((entry: any) => entry['@type']), ['School', 'WebSite', 'WebPage']);
    const [school, website, webpage] = schema['@graph'];
    assert.equal(website.publisher['@id'], school['@id']);
    assert.equal(webpage.isPartOf['@id'], website['@id']);
    assert.equal(webpage.url, `${ORIGIN}${path}`);

    assert.equal(elements(document, 'h1')[0].textContent, page.heading);
    assert.ok(elements(document, 'p').some(paragraph => paragraph.textContent === page.summary));
    assert.deepEqual(elements(document, 'a').map(link => link.getAttribute('href')), PUBLIC_PATHS);
    assert.ok(elements(document, 'script').some(script => script.getAttribute('src') === '/src/main.tsx'));
    assert.ok(elements(document, 'link').some(link => link.getAttribute('rel') === 'manifest'));
    assert.doesNotMatch(html, /<!--seo:/);
  }
});

test('public canonical URLs collapse route variants and never reflect queries, fragments or search input', () => {
  for (const path of ['/DICTIONARY/', '/dictionary/?word=private-search#section', '/dictionary?word=</script><script>private-input</script>']) {
    const html = renderSeoHtml(TEMPLATE, path, ORIGIN);
    const document = parseHtml(html);
    assert.equal(meta(document, 'og:url'), `${ORIGIN}/dictionary`);
    assert.doesNotMatch(html, /private-search|private-input|<script>private/);
  }
});

test('private and unknown URLs are noindex without canonical links, structured data, public copy or token leakage', () => {
  for (const path of PRIVATE_PATHS) {
    assert.equal(getPublicSeoPage(path), undefined, path);
    const seo = getSeoMetadata(path, ORIGIN);
    assert.equal(seo.canonicalUrl, null, path);
    assert.equal(seo.structuredData, null, path);
    const html = renderSeoHtml(TEMPLATE, path, ORIGIN);
    const document = parseHtml(html);
    assert.equal(meta(document, 'robots'), 'noindex, nofollow', path);
    assert.equal(meta(document, 'og:url'), undefined, path);
    assert.ok(!elements(document, 'link').some(link => link.getAttribute('rel') === 'canonical'), path);
    assert.ok(!elements(document, 'script').some(script => script.getAttribute('type') === 'application/ld+json'), path);
    assert.equal(elements(document, 'main').length, 0, path);
    assert.doesNotMatch(html, /private-reset-token|private-personnel-token|private-document-token|student-id|payment-id/);
  }
});

test('configured origin accepts HTTP(S) origins and rejects credentials or non-origin URLs', () => {
  assert.equal(getSiteOrigin('https://SCHOOL.EXAMPLE:443/'), 'https://school.example');
  assert.equal(getSiteOrigin('http://localhost:8000'), 'http://localhost:8000');
  for (const value of ['', '/relative', '//school.example', 'ftp://school.example', 'javascript:alert(1)',
    'https://user:password@school.example', 'https://school.example/subpath',
    'https://school.example?query=1', 'https://school.example#fragment']) {
    assert.throws(() => getSiteOrigin(value), undefined, value);
    assert.throws(() => buildSitemap(value), undefined, value);
  }
});

test('XML and HTML escape URL metacharacters and text while structured data stays valid JSON', () => {
  // WHATWG URL accepts these characters in a hostname. Even an unusual
  // configured origin must not break markup or create extra attributes.
  const unusualOrigin = `https://school&'".example`;
  const xml = buildSitemap(unusualOrigin);
  assert.match(xml, /&amp;&apos;&quot;/);
  assert.equal(elements(parseXml(xml), 'loc')[0].textContent, `${unusualOrigin}/`);
  const html = renderSeoHtml(TEMPLATE, '/language-quest', unusualOrigin);
  assert.match(html, /Mathematics &amp; GED/);
  const document = parseHtml(html);
  assert.equal(meta(document, 'og:url'), `${unusualOrigin}/language-quest`);
  assert.equal(meta(document, 'og:image'), `${unusualOrigin}/icon-512.png`);
  const script = elements(document, 'script').find(item => item.getAttribute('type') === 'application/ld+json')!;
  assert.equal(JSON.parse(script.textContent!)['@graph'][2].url, `${unusualOrigin}/language-quest`);
});

test('SEO HTTP routes use configured host, return discoverable content types and keep data responses noindex', async t => {
  const app = express();
  app.set('trust proxy', true);
  registerSeoRoutes(app, ORIGIN);
  app.get('/api/public/branding', (_req, res) => res.json({ name: 'MRLC' }));
  app.get('/uploads/document.pdf', (_req, res) => res.type('application/pdf').send('fixture'));
  app.get('/assets/app.js', (_req, res) => res.type('application/javascript').send('fixture'));
  app.use((_req, res) => res.sendStatus(404));
  const server = createServer(app);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const port = (server.address() as AddressInfo).port;
  const get = (path: string, method = 'GET') => new Promise<{ status: number; headers: IncomingHttpHeaders; body: string }>((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path, method, headers: {
      Host: 'attacker.example', 'X-Forwarded-Host': 'spoofed.example', 'X-Forwarded-Proto': 'http',
    } }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode!, headers: response.headers, body }));
      response.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });

  const sitemap = await get('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers['content-type']!, /^application\/xml; charset=utf-8/);
  assert.equal(sitemap.headers['cache-control'], 'public, max-age=3600');
  assert.deepEqual(elements(parseXml(sitemap.body), 'loc').map(item => item.textContent), PUBLIC_PATHS.map(path => `${ORIGIN}${path}`));
  assert.doesNotMatch(sitemap.body, /attacker|spoofed/);

  const robots = await get('/robots.txt');
  assert.equal(robots.status, 200);
  assert.match(robots.headers['content-type']!, /^text\/plain; charset=utf-8/);
  assert.equal(robots.body, buildRobotsTxt(ORIGIN));
  assert.equal(robots.headers['x-robots-tag'], undefined);

  const redirect = await get('/index.html?source=bookmark');
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.location, '/?source=bookmark');
  for (const alias of ['/%69ndex.html', '/index%2Ehtml', '/INDEX.HTML/', '/%69ndex.html?source=bookmark']) {
    const response = await get(alias);
    assert.equal(response.status, 301, alias);
    assert.equal(response.headers.location, alias.includes('?') ? '/?source=bookmark' : '/', alias);
  }
  assert.equal((await get('/%69ndex.html', 'HEAD')).status, 301);
  assert.equal((await get('/index.html', 'POST')).status, 404);
  for (const path of ['/api/public/branding', '/uploads/document.pdf', '/api/missing', '/uploads/missing']) {
    const response = await get(path);
    assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow', path);
  }
  assert.equal((await get('/api/public/branding')).status, 200);
  assert.match((await get('/uploads/document.pdf')).headers['content-type']!, /^application\/pdf(?:;|$)/);
  assert.equal((await get('/assets/app.js')).headers['x-robots-tag'], undefined);
  const head = await get('/sitemap.xml', 'HEAD');
  assert.equal(head.status, 200);
  assert.equal(head.body, '');
  assert.equal(head.headers['content-type'], sitemap.headers['content-type']);
});
