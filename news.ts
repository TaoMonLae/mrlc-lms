import express from "express";
import Parser from "rss-parser";

interface JwtPayload { userId: string; role: string; email: string; }

interface Deps {
  app: express.Express;
  prisma: any;
  authMiddleware: express.RequestHandler;
  requireRole: (role: string) => express.RequestHandler;
  createAuditLog: (
    userId: string | null, userName: string | null, action: string,
    entityType: string, entityId: string | null, description: string,
    ip: string | null, ua: string | null, severity?: string,
  ) => Promise<void>;
  logger: { error: (...a: any[]) => void; warn: (...a: any[]) => void; info: (...a: any[]) => void };
}

// Starter set of well-known, stable public RSS feeds, seeded additively (by
// unique feedUrl) on every boot — an admin can edit/disable/remove any of
// these from Settings > News Sources at any time; re-adding new categories
// here later only inserts what's missing, it never touches existing rows.
const DEFAULT_SOURCES = [
  { name: "BBC News — World", feedUrl: "http://feeds.bbci.co.uk/news/world/rss.xml", category: "World" },
  { name: "NPR News", feedUrl: "https://feeds.npr.org/1004/rss.xml", category: "World" },
  { name: "Al Jazeera — All News", feedUrl: "https://www.aljazeera.com/xml/rss/all.xml", category: "World" },
  { name: "UN News", feedUrl: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", category: "Global Affairs" },
  // IT / technology
  { name: "TechCrunch", feedUrl: "https://techcrunch.com/feed/", category: "IT" },
  { name: "Ars Technica", feedUrl: "https://feeds.arstechnica.com/arstechnica/index", category: "IT" },
  { name: "The Verge", feedUrl: "https://www.theverge.com/rss/index.xml", category: "IT" },
  // AI (.AI)
  { name: "AI News", feedUrl: "https://www.artificialintelligence-news.com/feed/", category: "AI" },
  { name: "MIT Technology Review — AI", feedUrl: "https://www.technologyreview.com/topic/artificial-intelligence/feed/", category: "AI" },
  // Education / educational
  { name: "EdSurge", feedUrl: "https://www.edsurge.com/articles_rss", category: "Education" },
  { name: "Inside Higher Ed", feedUrl: "https://www.insidehighered.com/rss.xml", category: "Education" },
  { name: "KQED MindShift", feedUrl: "https://ww2.kqed.org/mindshift/feed/", category: "Education" },
  { name: "eSchool News", feedUrl: "https://www.eschoolnews.com/category/top-news/feed/", category: "Education" },
  // Myanmar — independent outlets only (deliberately excludes state/military-
  // run media like Global New Light of Myanmar or MRTV, given the audience).
  { name: "The Irrawaddy", feedUrl: "https://www.irrawaddy.com/feed", category: "Myanmar" },
  { name: "Myanmar Now", feedUrl: "https://myanmar-now.org/en/feed/", category: "Myanmar" },
  { name: "Frontier Myanmar", feedUrl: "https://www.frontiermyanmar.net/en/feed/", category: "Myanmar" },
  { name: "BBC Burmese", feedUrl: "https://feeds.bbci.co.uk/burmese/rss.xml", category: "Myanmar" },
  { name: "Independent Mon News Agency (IMNA)", feedUrl: "https://monnews.org/feed/", category: "Myanmar" },
  { name: "Karen News", feedUrl: "https://karennews.org/feed/", category: "Myanmar" },
  { name: "DVB English", feedUrl: "https://english.dvb.no/feed", category: "Myanmar" },
  // Malaysia
  { name: "Malaysiakini", feedUrl: "https://www.malaysiakini.com/rss/en/news.rss", category: "Malaysia" },
  { name: "Malay Mail", feedUrl: "https://www.malaymail.com/feed/rss/malaysia", category: "Malaysia" },
  // Social Studies (history, civics, culture)
  { name: "Smithsonian Magazine — History", feedUrl: "https://www.smithsonianmag.com/rss/history/", category: "Social Studies" },
  // Discovery (general-audience science & exploration)
  { name: "Discover Magazine", feedUrl: "https://www.discovermagazine.com/rss/all", category: "Discovery" },
  // STEM
  { name: "NASA Breaking News", feedUrl: "http://www.nasa.gov/rss/breaking_news.rss", category: "STEM" },
  { name: "ScienceDaily — All", feedUrl: "https://www.sciencedaily.com/rss/all.xml", category: "STEM" },
  // GED / adult education — no dedicated GED-branded outlet exists publicly,
  // so this pairs Hechinger's two overlapping-but-distinct adult-ed tags for
  // more volume (the "adult-learning" tag alone only had 1 recent article).
  { name: "The Hechinger Report — Adult Learning", feedUrl: "https://hechingerreport.org/tags/adult-learning/feed/", category: "GED" },
  { name: "The Hechinger Report — Adult Education", feedUrl: "https://hechingerreport.org/tags/adult-education/feed/", category: "GED" },
];

// Articles older than this are pruned on refresh so the table doesn't grow
// forever — mirrors the ephemeral-cleanup pattern already used for social
// posts / chat photos in server.ts.
const RETENTION_DAYS = 30;
const MAX_ITEMS_PER_FEED = 30;
const FETCH_TIMEOUT_MS = 15000;

function firstImageFrom(item: any): string | null {
  // Only trust <enclosure> when it's actually an image — some feeds use it
  // for podcast audio/video, which would otherwise get rendered as a photo.
  if (item.enclosure?.url && (!item.enclosure.type || item.enclosure.type.startsWith("image"))) {
    return item.enclosure.url;
  }
  // <media:content> and <media:thumbnail> can each appear as a single object
  // or an array of them depending on the feed — normalize both to arrays.
  // (BBC and Malay Mail, e.g., only ever set media:thumbnail, not
  // media:content, so both namespaces need to be checked.)
  const mediaCandidates = ([] as any[])
    .concat(item["media:content"] || [])
    .concat(item["media:thumbnail"] || []);
  for (const m of mediaCandidates) {
    const url = m?.$?.url;
    const medium = m?.$?.medium;
    const type = m?.$?.type;
    if (url && (!medium || medium === "image") && (!type || !type.startsWith("video"))) return url;
  }
  // Fall back to scanning the article HTML for a plain <img> tag. Check
  // content:encoded (the full article body) before the plain `content`
  // field — a feed's <description> is often just text, so checking it first
  // would short-circuit and miss an image that's only present further in.
  const html: string = item["content:encoded"] || item.content || "";
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return match ? match[1] : null;
}

function stripHtml(text: string | undefined | null): string | null {
  if (!text) return null;
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() || null;
}

// Full-article HTML, but only when the publisher's own feed includes it (the
// content:encoded namespace, or a `content` field bigger than the plain-text
// snippet). We never fetch/scrape the source page to manufacture this — if
// the feed only syndicates a short excerpt, `content` stays null and the
// reader is pointed at the original article instead.
function fullContentFrom(item: any): string | null {
  const raw: string | undefined = item["content:encoded"] || item.content;
  if (!raw || typeof raw !== "string") return null;
  const plain = stripHtml(raw) || "";
  const snippet = stripHtml(item.contentSnippet || item.summary || "") || "";
  // Guard against feeds where `content` is just the same short snippet
  // repeated — that's not "full text", so don't pretend it is.
  if (plain.length < 400 || (snippet && plain.length < snippet.length * 1.5)) return null;
  return raw;
}

export function registerNewsRoutes(deps: Deps): { refreshAllSources: () => Promise<void> } {
  const { app, prisma, authMiddleware, requireRole, createAuditLog, logger } = deps;
  // Some publishers (notably WordPress sites behind Cloudflare, e.g. The
  // Irrawaddy, Frontier Myanmar) reject requests that carry Node's default
  // "no User-Agent" / generic client signature, even though the same feed
  // loads fine in a browser. Sending a normal browser UA + Accept header
  // fixes those silently-failing fetches without affecting feeds that never
  // had a problem.
  const parser = new Parser({
    timeout: FETCH_TIMEOUT_MS,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept": "application/rss+xml, application/xml, text/xml, */*",
    },
  });

  const user = (req: express.Request) => (req as any).user as JwtPayload;
  const ipOf = (req: express.Request) => (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || null;
  const uaOf = (req: express.Request) => (req.headers["user-agent"] as string) || null;
  const degrade = (err: any, res: express.Response, empty: any) => {
    if (err?.code === "P2021" || err?.code === "P2022") { res.json(empty); return true; }
    return false;
  };

  // ── fetch + upsert one source's articles ──────────────────────────────────
  async function refreshSource(source: { id: string; feedUrl: string }): Promise<{ ok: boolean; count: number; error?: string }> {
    try {
      const feed = await parser.parseURL(source.feedUrl);
      const items = (feed.items || []).slice(0, MAX_ITEMS_PER_FEED);
      let count = 0;
      for (const item of items) {
        const link = item.link || item.guid;
        if (!link || !item.title) continue;
        const publishedAt = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null);
        await prisma.newsArticle.upsert({
          where: { sourceId_link: { sourceId: source.id, link } },
          create: {
            sourceId: source.id,
            title: stripHtml(item.title) || item.title,
            summary: stripHtml(item.contentSnippet || item.summary || item.content),
            content: fullContentFrom(item),
            link,
            imageUrl: firstImageFrom(item),
            author: item.creator || null,
            publishedAt: publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
          },
          // Refresh volatile fields only — keep fetchedAt from the first sighting
          // so "new since last visit" ordering stays stable.
          update: {
            title: stripHtml(item.title) || item.title,
            summary: stripHtml(item.contentSnippet || item.summary || item.content),
            content: fullContentFrom(item),
            imageUrl: firstImageFrom(item),
          },
        }).catch(() => null);
        count++;
      }
      await prisma.newsSource.update({ where: { id: source.id }, data: { lastFetchedAt: new Date(), lastError: null } }).catch(() => {});
      return { ok: true, count };
    } catch (err: any) {
      logger.error(`News refresh failed for source ${source.id} (${source.feedUrl}):`, err.message);
      await prisma.newsSource.update({ where: { id: source.id }, data: { lastFetchedAt: new Date(), lastError: String(err.message || err).slice(0, 500) } }).catch(() => {});
      return { ok: false, count: 0, error: err.message };
    }
  }

  async function pruneOldArticles(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await prisma.newsArticle.deleteMany({
      where: { AND: [{ OR: [{ publishedAt: { lt: cutoff } }, { publishedAt: null, fetchedAt: { lt: cutoff } }] }] },
    }).catch(() => {});
  }

  async function ensureDefaultSources(): Promise<void> {
    try {
      const existing = await prisma.newsSource.findMany({ select: { feedUrl: true } });
      const have = new Set(existing.map((s: any) => s.feedUrl));
      const missing = DEFAULT_SOURCES.filter((s) => !have.has(s.feedUrl));
      if (!missing.length) return;
      for (const s of missing) {
        await prisma.newsSource.create({ data: s }).catch(() => {});
      }
      logger.info(`Seeded ${missing.length} new default news source(s).`);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") return; // migration not applied yet
      logger.error("Failed to seed default news sources:", err.message);
    }
  }

  async function refreshAllSources(): Promise<void> {
    try {
      const sources = await prisma.newsSource.findMany({ where: { enabled: true } });
      let total = 0;
      for (const s of sources) {
        const r = await refreshSource(s);
        if (r.ok) total += r.count;
      }
      await pruneOldArticles();
      logger.info(`News refresh complete: ${total} article(s) across ${sources.length} source(s).`);
    } catch (err: any) {
      if (err?.code === "P2021" || err?.code === "P2022") return; // migration not applied yet
      logger.error("News refresh failed:", err.message);
    }
  }

  // ── reader-facing endpoints (any authenticated role) ──────────────────────
  app.get("/api/news", authMiddleware, async (req, res) => {
    const { category, sourceId, q, page } = req.query as Record<string, string>;
    const take = 24;
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    try {
      const where: any = {
        ...(sourceId ? { sourceId } : {}),
        ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { summary: { contains: q, mode: "insensitive" } }] } : {}),
        // Case-insensitive: category is admin-entered free text (no enum),
        // so "World" and "world" would otherwise be treated as different
        // categories and silently split a source's articles out of the
        // filter the user actually meant.
        source: { enabled: true, ...(category ? { category: { equals: category, mode: "insensitive" } } : {}) },
      };
      const [items, total] = await Promise.all([
        prisma.newsArticle.findMany({
          where,
          select: {
            id: true, title: true, summary: true, link: true, imageUrl: true, author: true,
            publishedAt: true, fetchedAt: true, content: true, // fetched only to derive the flag below, stripped before sending
            source: { select: { id: true, name: true, category: true } },
          },
          orderBy: [{ publishedAt: "desc" }, { fetchedAt: "desc" }], take, skip,
        }),
        prisma.newsArticle.count({ where }),
      ]);
      // Keep the list payload light: signal full-text availability with a flag
      // instead of shipping every article's full HTML body up front.
      const slim = items.map(({ content, ...rest }: any) => ({ ...rest, hasFullContent: !!content }));
      res.json({ items: slim, total, page: Number(page) || 1, pageSize: take });
    } catch (err: any) {
      if (degrade(err, res, { items: [], total: 0, page: 1, pageSize: take })) return;
      logger.error("Error fetching news:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/news/categories", authMiddleware, async (_req, res) => {
    try {
      const sources = await prisma.newsSource.findMany({ where: { enabled: true }, select: { category: true } });
      // Dedupe case-insensitively (keeping the first-seen casing) so "World"
      // and "world" don't show up as two separate filter options even though
      // the article filter itself now treats them as the same category.
      const seen = new Set<string>();
      const cats: string[] = [];
      for (const s of sources as any[]) {
        if (!s.category) continue;
        const key = s.category.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        cats.push(s.category);
      }
      res.json(cats);
    } catch (err: any) {
      if (degrade(err, res, [])) return;
      logger.error("Error fetching news categories:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/news/:id", authMiddleware, async (req, res) => {
    try {
      // Match the list endpoint's `source: { enabled: true }` filter -- without
      // it, an article whose source an admin has since disabled/removed from
      // rotation stayed reachable by direct ID (e.g. via a homework link that
      // pointed at it before the source was disabled), even though it no
      // longer shows up in the feed at all.
      const article = await prisma.newsArticle.findFirst({
        where: { id: req.params.id, source: { enabled: true } },
        include: { source: { select: { id: true, name: true, category: true } } },
      });
      if (!article) { res.status(404).json({ error: "Not found" }); return; }
      res.json(article);
    } catch (err) {
      logger.error("Error fetching article:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // ── admin-only source management ──────────────────────────────────────────
  app.get("/api/news-sources", authMiddleware, requireRole("ADMIN"), async (_req, res) => {
    try {
      const sources = await prisma.newsSource.findMany({
        include: { _count: { select: { articles: true } } },
        orderBy: { name: "asc" },
      });
      res.json(sources);
    } catch (err: any) {
      if (degrade(err, res, [])) return;
      logger.error("Error fetching news sources:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/news-sources", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    const jwtUser = user(req);
    const { name, feedUrl, category } = req.body || {};
    if (!name || !feedUrl) { res.status(400).json({ error: "name and feedUrl are required" }); return; }
    try {
      const source = await prisma.newsSource.create({
        data: {
          name: String(name).trim(),
          feedUrl: String(feedUrl).trim(),
          category: category ? String(category).trim() || null : null,
          createdById: jwtUser.userId,
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "CREATE", "NEWS_SOURCE", source.id,
        `News source '${name}' added.`, ipOf(req), uaOf(req), "SUCCESS");
      // Populate immediately so the admin sees results without waiting for the
      // next scheduled refresh.
      refreshSource(source).catch(() => {});
      res.status(201).json(source);
    } catch (err: any) {
      if (err?.code === "P2002") { res.status(400).json({ error: "That feed URL is already added" }); return; }
      logger.error("Error creating news source:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.put("/api/news-sources/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    const jwtUser = user(req);
    const { name, feedUrl, category, enabled } = req.body || {};
    try {
      const source = await prisma.newsSource.update({
        where: { id: req.params.id },
        data: {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(feedUrl !== undefined ? { feedUrl: String(feedUrl).trim() } : {}),
          ...(category !== undefined ? { category: category ? String(category).trim() || null : null } : {}),
          ...(enabled !== undefined ? { enabled: !!enabled } : {}),
        },
      });
      await createAuditLog(jwtUser.userId, jwtUser.email, "UPDATE", "NEWS_SOURCE", source.id,
        `News source '${source.name}' updated.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json(source);
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
      if (err?.code === "P2002") { res.status(400).json({ error: "That feed URL is already added" }); return; }
      logger.error("Error updating news source:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.delete("/api/news-sources/:id", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    const jwtUser = user(req);
    try {
      const source = await prisma.newsSource.delete({ where: { id: req.params.id } });
      await createAuditLog(jwtUser.userId, jwtUser.email, "DELETE", "NEWS_SOURCE", req.params.id,
        `News source '${source.name}' removed.`, ipOf(req), uaOf(req), "SUCCESS");
      res.json({ ok: true });
    } catch (err: any) {
      if (err?.code === "P2025") { res.status(404).json({ error: "Not found" }); return; }
      logger.error("Error deleting news source:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/news-sources/:id/refresh", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    try {
      const source = await prisma.newsSource.findUnique({ where: { id: req.params.id } });
      if (!source) { res.status(404).json({ error: "Not found" }); return; }
      const result = await refreshSource(source);
      res.json(result);
    } catch (err) {
      logger.error("Error refreshing news source:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/news/refresh", authMiddleware, requireRole("ADMIN"), async (req, res) => {
    const jwtUser = user(req);
    try {
      await refreshAllSources();
      await createAuditLog(jwtUser.userId, jwtUser.email, "REFRESH", "NEWS", null,
        "Manually triggered a full news refresh.", ipOf(req), uaOf(req), "SUCCESS");
      res.json({ ok: true });
    } catch (err) {
      logger.error("Error refreshing news:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Seed starter sources once (no-op if any already exist), then let the
  // caller (server.ts) decide when to run the first real fetch.
  ensureDefaultSources().catch(() => {});

  return { refreshAllSources };
}
