export const SITE_NAME = 'Mon Refugee Learning Centre';

// Only pages visitors can read without an account belong in search results.
// Keep this list shared by the sitemap, initial HTML and client navigation.
export const PUBLIC_SEO_PAGES = [
  {
    path: '/',
    title: 'Mon Refugee Learning Centre | GED School in Malaysia',
    heading: SITE_NAME,
    description: 'Discover Mon Refugee Learning Centre in Malaysia: GED preparation, guided learning, and school resources supporting refugee learners and their families.',
    summary: 'MRLC connects classroom learning, GED preparation and independent practice. Students, families and educators can sign in to access their school tools, while visitors can explore Learning Quest and the public dictionary.',
    label: 'MRLC home',
  },
  {
    path: '/language-quest',
    title: 'Learning Quest | Languages, Mathematics & GED | MRLC',
    heading: 'Learning Quest',
    description: 'Explore free guided courses in languages, K–12 mathematics and GED preparation with MRLC Learning Quest. Create an account to practise and save your progress.',
    summary: 'Browse guided courses with short lessons, worked feedback and scored practice. A free learner account lets you begin lessons and save your progress.',
    label: 'Explore Learning Quest',
  },
  {
    path: '/language-quest/about',
    title: 'About Learning Quest | Courses & Learning Approach | MRLC',
    heading: 'About Learning Quest',
    description: 'Learn how MRLC Learning Quest supports language learning, K–12 mathematics and GED preparation through guided practice, feedback and mastery review.',
    summary: 'Learning Quest combines guided practice, feedback and mastery review. Read about the learning approach, original MRLC curriculum and the sources behind its language, mathematics and GED courses.',
    label: 'About Learning Quest',
  },
  {
    path: '/dictionary',
    title: 'English, Myanmar, Mon & Chinese Dictionary | MRLC',
    heading: 'MRLC Dictionary',
    description: 'Look up English definitions, Myanmar translations, Mon words and Chinese vocabulary in the free MRLC dictionary. No school account is required.',
    summary: 'Find definitions and vocabulary across English, Myanmar, Mon and Chinese. The dictionary is available to visitors without signing in.',
    label: 'Open the dictionary',
  },
] as const;

export function normalizeSeoPath(pathname: string): string {
  return pathname.split(/[?#]/, 1)[0].replace(/\/+$/, '').toLowerCase() || '/';
}

export function getPublicSeoPage(pathname: string) {
  const path = normalizeSeoPath(pathname);
  return PUBLIC_SEO_PAGES.find(page => page.path === path);
}

export function getSiteOrigin(appUrl: string): string {
  const url = new URL(appUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('APP_URL must be an HTTP(S) origin without credentials, a path, query or fragment.');
  }
  return url.origin;
}

export function getSeoMetadata(pathname: string, appUrl: string) {
  const origin = getSiteOrigin(appUrl);
  const page = getPublicSeoPage(pathname);
  const canonicalUrl = page ? `${origin}${page.path}` : null;
  const title = page?.title ?? 'MRLC LMS | Mon Refugee Learning Centre';
  const description = page?.description ?? 'Sign in to access Mon Refugee Learning Centre learning resources and school services.';
  const imageUrl = `${origin}/icon-512.png`;
  const structuredData: Record<string, unknown> | null = page ? {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'School',
        '@id': `${origin}/#school`,
        name: SITE_NAME,
        alternateName: 'MRLC',
        url: `${origin}/`,
        logo: imageUrl,
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'MRLC LMS',
        alternateName: SITE_NAME,
        url: `${origin}/`,
        publisher: { '@id': `${origin}/#school` },
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: title,
        description,
        isPartOf: { '@id': `${origin}/#website` },
        about: { '@id': `${origin}/#school` },
      },
    ],
  } : null;
  return {
    title, description, canonicalUrl, imageUrl, structuredData,
    robots: page ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
  };
}
