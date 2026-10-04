import type { Express } from 'express';
import { getPublicSeoPage, getSeoMetadata, getSiteOrigin, PUBLIC_SEO_PAGES, SITE_NAME } from '../shared/seo';

function escapeMarkup(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
}

export function buildSitemap(appUrl: string): string {
  const origin = getSiteOrigin(appUrl);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${PUBLIC_SEO_PAGES.map(page => `  <url><loc>${escapeMarkup(`${origin}${page.path}`)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function buildRobotsTxt(appUrl: string): string {
  // Let crawlers fetch HTML to see its noindex directive, and fetch the public
  // APIs, scripts and styles needed to render our public React pages.
  return `User-agent: *\nAllow: /\n\nSitemap: ${getSiteOrigin(appUrl)}/sitemap.xml\n`;
}

export function renderSeoHtml(template: string, pathname: string, appUrl: string): string {
  const origin = getSiteOrigin(appUrl);
  const seo = getSeoMetadata(pathname, origin);
  const meta = (attribute: 'name' | 'property', name: string, value: string) =>
    `<meta data-seo ${attribute}="${name}" content="${escapeMarkup(value)}" />`;
  const tags = [
    `<title data-seo>${escapeMarkup(seo.title)}</title>`,
    `<meta name="mrlc-site-origin" content="${escapeMarkup(origin)}" />`,
    meta('name', 'description', seo.description),
    meta('name', 'robots', seo.robots),
    meta('property', 'og:site_name', SITE_NAME),
    meta('property', 'og:type', 'website'),
    meta('property', 'og:title', seo.title),
    meta('property', 'og:description', seo.description),
    meta('property', 'og:image', seo.imageUrl),
    meta('property', 'og:image:alt', `${SITE_NAME} logo`),
    meta('name', 'twitter:card', 'summary'),
    meta('name', 'twitter:title', seo.title),
    meta('name', 'twitter:description', seo.description),
    meta('name', 'twitter:image', seo.imageUrl),
    meta('name', 'twitter:image:alt', `${SITE_NAME} logo`),
  ];
  if (seo.canonicalUrl) {
    tags.push(`<link data-seo rel="canonical" href="${escapeMarkup(seo.canonicalUrl)}" />`);
    tags.push(meta('property', 'og:url', seo.canonicalUrl));
  }
  if (seo.structuredData) {
    // JSON must remain parseable without allowing an HTML script terminator.
    const json = JSON.stringify(seo.structuredData).replace(/</g, '\\u003c');
    tags.push(`<script data-seo id="seo-structured-data" type="application/ld+json">${json}</script>`);
  }
  const page = getPublicSeoPage(pathname);
  // This short public introduction is delivered to every visitor, including
  // those without JavaScript. React replaces it with the interactive page.
  const content = page ? `<main><h1>${escapeMarkup(page.heading)}</h1><p>${escapeMarkup(page.description)}</p><p>${escapeMarkup(page.summary)}</p><nav aria-label="Public pages"><ul>${PUBLIC_SEO_PAGES.map(item => `<li><a href="${item.path}">${escapeMarkup(item.label)}</a></li>`).join('')}</ul></nav><noscript>Enable JavaScript to use the interactive learning tools.</noscript></main>` : '';
  return template
    .replace(/<!--seo:head:start-->[\s\S]*?<!--seo:head:end-->/, () => tags.join('\n    '))
    .replace('<!--seo:content-->', () => content);
}

export function registerSeoRoutes(app: Express, appUrl: string): void {
  const origin = getSiteOrigin(appUrl);
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(buildRobotsTxt(origin));
  });
  app.get('/sitemap.xml', (_req, res) => {
    res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(buildSitemap(origin));
  });
  app.use((req, res, next) => {
    // Static middleware decodes URLs; catch encoded aliases before it can send
    // the unprocessed index template (for example /%69ndex.html).
    let pathname: string;
    try { pathname = decodeURIComponent(req.path); }
    catch { next(); return; }
    if (!['GET', 'HEAD'].includes(req.method) || !/^\/index\.html\/?$/i.test(pathname)) {
      next();
      return;
    }
    const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    res.redirect(301, `/${query}`);
  });
  app.use(['/api', '/uploads'], (_req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    next();
  });
}
