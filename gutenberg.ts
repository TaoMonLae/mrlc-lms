import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

interface JwtPayload { userId: string; role: string; email: string; }

interface Deps {
  app: express.Express;
  prisma: any;
  authMiddleware: express.RequestHandler;
  logger: { error: (...a: any[]) => void };
}

// These must match the directories server.ts itself uses for the existing
// E-Library upload feature (EBOOK_DIR / EBOOK_COVER_DIR, and the
// /uploads/ebook-covers static mount) so books imported here are stored and
// served exactly like manually-uploaded ones -- same streaming route, same
// cover URL shape, same everything.
const EBOOK_DIR = process.env.EBOOK_DIR || path.join(process.cwd(), "data", "ebooks");
fs.mkdirSync(EBOOK_DIR, { recursive: true });
const EBOOK_COVER_DIR = process.env.EBOOK_COVER_DIR || path.join(process.cwd(), "data", "ebook-covers");
fs.mkdirSync(EBOOK_COVER_DIR, { recursive: true });

// Gutendex (https://gutendex.com, source: github.com/garethbjohnson/gutendex)
// is a free, public, read-only JSON API over Project Gutenberg's own catalog
// data. Project Gutenberg has no public API of its own; Gutendex is the
// commonly-used community mirror for exactly this use case. Every book it
// serves is in the US public domain (that's Project Gutenberg's whole
// premise), so -- unlike the Dictionary features -- there's no licensing
// caveat to document here.
const GUTENDEX_BASE = "https://gutendex.com/books";

const canManageEbooks = (role: string) => role === "ADMIN" || role === "TEACHER" || role === "LIBRARIAN";

interface GutendexPerson { name: string; birth_year: number | null; death_year: number | null; }
interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexPerson[];
  subjects: string[];
  bookshelves: string[];
  languages: string[];
  copyright: boolean | null;
  formats: Record<string, string>;
  download_count: number;
}

const GUTENBERG_CATEGORY_RULES: Array<[string, string]> = [
  ["science fiction", "Science Fiction"],
  ["fantasy", "Fantasy"],
  ["children", "Children"],
  ["juvenile", "Children"],
  ["history", "History"],
  ["science", "Science"],
  ["biography", "Biography"],
  ["autobiography", "Biography"],
  ["reference", "Reference"],
  ["education", "Education"],
  ["language", "Language"],
  ["religion", "Religion"],
  ["philosophy", "Philosophy"],
  ["poetry", "Poetry"],
  ["drama", "Drama"],
  ["adventure", "Adventure"],
  ["mystery", "Mystery"],
  ["detective", "Mystery"],
  ["fiction", "Fiction"],
  ["literature", "Literature"],
];

function inferGutenbergCategory(book: GutendexBook): string {
  const haystack = [...(book.subjects || []), ...(book.bookshelves || [])].join(" ").toLowerCase();
  for (const [needle, category] of GUTENBERG_CATEGORY_RULES) {
    if (haystack.includes(needle)) return category;
  }
  return "Public Domain";
}

// Gutendex lists an EPUB URL under the "application/epub+zip" MIME key (most
// books also have a ".images"-suffixed href variant under the same key in
// some catalog snapshots, but there's only ever one entry per exact key, so
// a direct lookup is enough).
function pickEpubUrl(formats: Record<string, string>): string | null {
  return formats["application/epub+zip"] || null;
}

function pickCoverUrl(formats: Record<string, string>): string | null {
  return formats["image/jpeg"] || null;
}

function simplify(b: GutendexBook) {
  return {
    gutenbergId: b.id,
    title: b.title,
    author: b.authors.map((a) => a.name).join(", ") || null,
    languages: b.languages || [],
    subjects: (b.subjects || []).slice(0, 6),
    category: inferGutenbergCategory(b),
    downloadCount: b.download_count,
    coverUrl: pickCoverUrl(b.formats || {}),
    hasEpub: !!pickEpubUrl(b.formats || {}),
  };
}

export function registerGutenbergRoutes(deps: Deps): void {
  const { app, prisma, authMiddleware, logger } = deps;

  const requireLibraryManager: express.RequestHandler = (req, res, next) => {
    const jwtUser = (req as any).user as JwtPayload;
    if (!canManageEbooks(jwtUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };

  // Search Project Gutenberg's catalog (via Gutendex) for books to import.
  app.get("/api/admin/gutenberg/search", authMiddleware, requireLibraryManager, async (req, res) => {
    const q = (req.query.q ?? "").toString().trim().slice(0, 120);
    const page = Math.max(1, parseInt((req.query.page ?? "1").toString(), 10) || 1);
    if (!q) { res.status(400).json({ error: "A search term is required" }); return; }
    try {
      const url = `${GUTENDEX_BASE}?search=${encodeURIComponent(q)}&mime_type=application%2Fepub%2Bzip&page=${page}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Gutendex returned ${resp.status}`);
      const data: { count: number; next: string | null; results: GutendexBook[] } = await resp.json();
      const results = (data.results || []).map(simplify).filter((b) => b.hasEpub);
      res.json({ count: data.count, hasNext: !!data.next, results });
    } catch (err) {
      logger.error("Error searching Project Gutenberg:", err);
      res.status(502).json({ error: "Could not reach Project Gutenberg's catalog. Please try again." });
    }
  });

  // Downloads the chosen book's EPUB (and cover, if available) straight from
  // Project Gutenberg's own servers and creates an Ebook record identical in
  // shape to one created by the manual upload flow.
  app.post("/api/admin/gutenberg/import", authMiddleware, requireLibraryManager, async (req, res) => {
    const jwtUser = (req as any).user as JwtPayload;
    const { gutenbergId, visibility, downloadAllowed, category } = req.body || {};
    const id = parseInt(gutenbergId, 10);
    if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "A valid Gutenberg book ID is required" }); return; }

    const originalName = `gutenberg-${id}.epub`;
    try {
      const already = await prisma.ebook.findFirst({ where: { originalName } });
      if (already) { res.status(409).json({ error: "This book has already been imported." }); return; }

      const metaResp = await fetch(`${GUTENDEX_BASE}/${id}`);
      if (!metaResp.ok) { res.status(404).json({ error: "Book not found on Project Gutenberg." }); return; }
      const book: GutendexBook = await metaResp.json();
      const epubUrl = pickEpubUrl(book.formats || {});
      if (!epubUrl) { res.status(400).json({ error: "No EPUB is available for this book." }); return; }

      const epubResp = await fetch(epubUrl);
      if (!epubResp.ok) throw new Error(`Could not download the EPUB (status ${epubResp.status})`);
      const epubBuf = Buffer.from(await epubResp.arrayBuffer());
      const fileName = `${crypto.randomUUID()}.epub`;
      await fs.promises.writeFile(path.join(EBOOK_DIR, fileName), epubBuf);

      let coverUrl: string | null = null;
      const coverSrc = pickCoverUrl(book.formats || {});
      if (coverSrc) {
        try {
          const coverResp = await fetch(coverSrc);
          if (coverResp.ok) {
            const coverBuf = Buffer.from(await coverResp.arrayBuffer());
            const coverName = `${crypto.randomUUID()}.jpg`;
            await fs.promises.writeFile(path.join(EBOOK_COVER_DIR, coverName), coverBuf);
            coverUrl = `/uploads/ebook-covers/${coverName}`;
          }
        } catch {
          // The cover is a nice-to-have -- a missing/broken cover image
          // shouldn't block importing the book itself.
        }
      }

      const author = (book.authors || []).map((a) => a.name).join(", ") || null;
      const ebook = await prisma.ebook.create({
        data: {
          title: book.title,
          author,
          description: null,
          category: category || inferGutenbergCategory(book),
          language: (book.languages && book.languages[0]) || "en",
          coverUrl,
          format: "EPUB",
          fileName,
          originalName,
          fileSize: epubBuf.length,
          visibility: visibility || "ALL",
          downloadAllowed: downloadAllowed === undefined ? true : !!downloadAllowed,
          uploadedById: jwtUser.userId,
          uploadedByName: "Project Gutenberg import",
        },
      });
      res.status(201).json(ebook);
    } catch (err) {
      logger.error("Error importing from Project Gutenberg:", err);
      res.status(500).json({ error: "Import failed. Please try again." });
    }
  });
}
