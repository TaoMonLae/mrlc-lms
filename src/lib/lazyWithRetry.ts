import { lazy, type ComponentType } from "react";

// Every route in App.tsx is code-split with React.lazy(). A dynamic import()
// can fail even though nothing is "broken" in the usual sense - most
// commonly because a browser tab has been open since before the latest
// deploy, so it's still running the previous build in memory and asks the
// server for an old content-hashed chunk filename that a fresh `vite build`
// no longer has on disk (the dist folder gets replaced wholesale on every
// build/deploy, it isn't additive). There's no top-level ErrorBoundary
// around these routes, so an unhandled import() rejection previously just
// left that part of the page permanently blank - which looked like "the
// game/page loads slowly and sometimes doesn't show up at all", especially
// right after a deploy.
//
// Retry once in case it was a transient network blip, and if it still
// fails, reload the page once (guarded by sessionStorage so a genuinely
// broken build can't reload-loop forever) to pick up the current deploy's
// index.html and chunk manifest.
const RELOAD_GUARD_KEY = "lms:chunk-reload-attempted";

export function lazyWithRetry<T extends { default: ComponentType<any> }>(
  importer: () => Promise<T>,
) {
  return lazy(async () => {
    try {
      const mod = await importer();
      // A later successful load means this build is healthy again - clear
      // the guard so a future stale-chunk incident can still recover with
      // a reload instead of silently failing forever.
      try {
        sessionStorage.removeItem(RELOAD_GUARD_KEY);
      } catch {
        /* sessionStorage unavailable (e.g. private browsing) - ignore */
      }
      return mod;
    } catch {
      try {
        return await importer();
      } catch (secondError) {
        let alreadyReloaded = false;
        try {
          alreadyReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
        } catch {
          /* ignore */
        }
        if (!alreadyReloaded) {
          try {
            sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
          } catch {
            /* ignore */
          }
          window.location.reload();
          // The page is about to reload - never resolve so React doesn't
          // try to render an error state in the instant before it does.
          return new Promise<T>(() => {});
        }
        throw secondError;
      }
    }
  });
}
