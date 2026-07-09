import express from "express";
import { Readable } from "stream";

interface JwtPayload { userId: string; role: string; email: string; }

interface Deps {
  app: express.Express;
  authMiddleware: express.RequestHandler;
  // Reuses the app's own JWT verification (same secret/shape as authMiddleware)
  // so the proxy cookie below is checked exactly like a normal Bearer token.
  verifyToken: (token: string) => JwtPayload;
  logger: { error: (...a: any[]) => void };
}

// Kiwix (kiwix.org) serves offline Wikipedia/Wiktionary/etc. from ZIM archive
// files via a separate program, kiwix-serve, that the school runs on its own
// server -- ZIM files are far too large (hundreds of MB to 100+ GB) to bundle
// with the app the way the Dictionary's data is. This module does NOT run
// kiwix-serve itself; it authenticates and reverse-proxies to an already-
// running instance, so the Wiki page looks and behaves like a native part of
// the LMS instead of a separate, unauthenticated site.
//
// Setup required on the server (see README "Kiwix / Offline Wiki"):
//   1. Install kiwix-tools and download a ZIM file from https://library.kiwix.org
//   2. Run kiwix-serve pointed at it, with --urlRootLocation=kiwix-proxy so the
//      HTML it serves already contains links prefixed to match this proxy's
//      mount path (kiwix-serve's documented way of supporting reverse proxies):
//        kiwix-serve --port=8080 --urlRootLocation=kiwix-proxy my-wiki.zim
//   3. Set KIWIX_URL in .env to that server's base URL (default http://127.0.0.1:8080)
const KIWIX_URL = (process.env.KIWIX_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
const PROXY_PREFIX = "/kiwix-proxy";
const KIWIX_COOKIE_PATH = PROXY_PREFIX;

// Response headers that must not be blindly forwarded from the upstream
// response (either meaningless once re-served by Express, or actively wrong).
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive",
]);

export function registerKiwixRoutes(deps: Deps): void {
  const { app, authMiddleware, verifyToken, logger } = deps;

  // The iframe that will show the wiki can't send a custom Authorization
  // header on its navigation/subresource requests, so -- exactly like
  // /api/set-chat-cookie does for EventSource -- the page first calls this
  // (with its normal Bearer token) to get an httpOnly cookie set, scoped
  // narrowly to the proxy path, then points the iframe at it.
  app.post("/api/set-wiki-cookie", authMiddleware, (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) { res.status(400).json({ error: "Token required" }); return; }
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      path: KIWIX_COOKIE_PATH,
    });
    res.json({ success: true });
  });

  // Lets the Wiki page show a helpful message instead of a blank/broken
  // iframe when kiwix-serve isn't running or isn't configured yet.
  app.get("/api/wiki/status", authMiddleware, async (_req, res) => {
    try {
      const ping = await fetch(`${KIWIX_URL}/`, { signal: AbortSignal.timeout(4000) });
      res.json({ reachable: ping.ok || ping.status === 404 }); // kiwix-serve's root without a library still answers
    } catch {
      res.json({ reachable: false });
    }
  });

  // Normalize the bare mount path to the trailing-slash form the wildcard
  // route below expects.
  app.get(PROXY_PREFIX, (_req, res) => res.redirect(`${PROXY_PREFIX}/`));

  // The proxy itself. GET/HEAD only -- ZIM content served by kiwix-serve is
  // read-only, there's nothing to POST to it.
  app.get(`${PROXY_PREFIX}/*`, async (req, res) => {
    let user: JwtPayload;
    try { user = verifyToken(String(req.cookies?.auth_token || "")); }
    catch { res.status(401).send("Please reload the Wiki page from within the app."); return; }
    void user; // presence of a valid token is the only thing that matters here

    const target = `${KIWIX_URL}${req.originalUrl}`;
    try {
      const upstream = await fetch(target, { signal: AbortSignal.timeout(20000) });
      res.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value);
      });
      if (!upstream.body) { res.end(); return; }
      Readable.fromWeb(upstream.body as any).pipe(res);
    } catch (err) {
      logger.error("Error proxying to kiwix-serve:", err);
      res
        .status(502)
        .type("html")
        .send("<p style='font:14px sans-serif;padding:2rem;color:#64748b'>Could not reach the offline wiki server. Ask an administrator to check that kiwix-serve is running.</p>");
    }
  });
}
