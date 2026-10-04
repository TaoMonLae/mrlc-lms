# Search discovery

The Express application serves `/sitemap.xml` and `/robots.txt`. Both use the
configured `APP_URL` origin, as do canonical links, social sharing images and
structured data. Do not use a localhost URL in production. For the deployment
documented in this repository:

```dotenv
APP_URL="https://gedmrlc.monrefugeelc.com"
```

The sitemap contains only the four public content pages: `/`, `/language-quest`,
`/language-quest/about` and `/dictionary`. The shared registry in `shared/seo.ts`
also supplies their titles and descriptions. Add a page there only after making
sure anonymous visitors can read it. `/about` currently requires a school
account and is deliberately excluded, along with lessons, dashboards, account
pages, verification links and private school records.

Public pages receive metadata, canonical URLs, Open Graph/Twitter tags, School
and WebSite structured data, and a short public introduction in their initial
HTML. React replaces the introduction with the full interactive page and keeps
the head metadata current during navigation. Query strings, including dictionary
lookups, are omitted from canonical URLs. The dictionary is indexed as one tool;
individual search results are not separate sitemap entries.

Other app pages return `noindex, nofollow` in the initial HTML and an
`X-Robots-Tag` response header. APIs and uploads also receive the header.
`robots.txt` allows fetching pages and their render dependencies so crawlers can
read those directives and render the public pages. Indexing rules do not replace
the existing authentication and authorization controls.

## Deploy and verify

1. Set `APP_URL` to the public HTTP(S) origin, without credentials, a path, query
   or fragment. Build with `npm run build` and restart the Express application
   with the updated environment. Serve through Express; a static-only Vite host
   does not run the sitemap endpoints or inject the initial metadata.
2. Open `/sitemap.xml` and `/robots.txt` on the live domain. Confirm the sitemap
   URLs use the production origin. View page source for each public page to
   confirm its title, description and canonical URL. Ensure proxies/CDNs pass
   these requests to Express and revalidate cached HTML after deployment.
3. Verify domain ownership in [Google Search Console](https://search.google.com/search-console)
   and submit `https://gedmrlc.monrefugeelc.com/sitemap.xml` (or your configured
   origin). Use URL Inspection to test the homepage and request indexing.
   You can also submit the sitemap in [Bing Webmaster Tools](https://www.bing.com/webmasters).
4. Review crawl/indexing reports after search engines revisit the site. A sitemap
   helps discovery; it does not guarantee indexing or a particular ranking.

These changes do not automatically verify a Search Console property or submit
to an account. Google also discovers the sitemap from its `robots.txt` reference.
See Google's [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
and [JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
