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
  // Education / educational
  { name: "EdSurge", feedUrl: "https://www.edsurge.com/articles_rss", category: "Education" },
  { name: "Inside Higher Ed", feedUrl: "https://www.insidehighered.com/rss.xml", category: "Education" },
  // Myanmar — independent outlets only (deliberately excludes state/military-
  // run media like Global New Light of Myanmar or MRTV, given the audience).
  { name: "The Irrawaddy", feedUrl: "https://www.irrawaddy.com/feed", category: "Myanmar" },
  { name: "Myanmar Now", feedUrl: "https://myanmar-now.org/en/feed/", category: "Myanmar" },
  { name: "Frontier Myanmar", feedUrl: "https://www.frontiermyanmar.net/en/feed/", category: "Myanmar" },
  { name: "BBC Burmese", feedUrl: "https://feeds.bbci.co.uk/burmese/rss.xml", category: "Myanmar" },
  { name: "Independent Mon News Agency (IMNA)", feedUrl: "https://monnews.org/feed/", category: "Myanmar" },
  { name: "Karen News", feedUrl: "https://karennews.org/feed/", category: "Myanmar" },
];

// Articles older than this are pruned on refresh so the table doesn't grow
// forever — mirrors the ephemeral-cleanup pattern already used for social
// posts / chat photos in server.ts.
const RETENTION_DAYS = 30;
const MAX_ITEMS_PER_FEED = 30;
const FETCH_TIMEOUT_MS = 15000;

function firstImageFrom(item: any): string | null {
  if (item.enclosure?.url) return item.enclosure.url;
  const mediaContent = item["media:content"];
  if (mediaContent?.$?.url) return mediaContent.$.url;
  const html: string = item.content || item["content:encoded"] || "";
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
  const parser = new Parser({ timeout: FETCH_TIMEOUT_MS });

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
        source: { enabled: true, ...(category ? { category } : {}) },
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
      const cats = Array.from(new Set(sources.map((s: any) => s.category).filter(Boolean)));
      res.json(cats);
    } catch (err: any) {
      if (degrade(err, res, [])) return;
      logger.error("Error fetching news categories:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/news/:id", authMiddleware, async (req, res) => {
    try {
      const article = await prisma.newsArticle.findUnique({
        where: { id: req.params.id },
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
        data: { name, feedUrl, category: category || null, createdById: jwtUser.userId },
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
          ...(name !== undefined ? { name } : {}),
          ...(feedUrl !== undefined ? { feedUrl } : {}),
          ...(category !== undefined ? { category: category || null } : {}),
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
