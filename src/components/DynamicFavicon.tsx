import { useEffect } from "react";

// Static fallback icons — same files referenced in index.html. Restored
// whenever there's no custom school logo (or before the branding fetch
// resolves), so the tab never ends up with a broken/empty icon.
const DEFAULT_ICONS = [
  { rel: "icon", href: "/favicon.ico", sizes: "any" },
  { rel: "icon", href: "/favicon-32.png", sizes: "32x32", type: "image/png" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

function mimeTypeFor(url: string): string | undefined {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "svg": return "image/svg+xml";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "ico": return "image/x-icon";
    default: return undefined;
  }
}

// Removes and recreates the <link> elements rather than editing .href in
// place — some browsers (notably Chromium) cache a tab's favicon and won't
// refetch just because an existing link's href attribute changed; a fresh
// element forces a real request. Each upload also gets a unique filename
// server-side (crypto.randomUUID()), so there's no stale-cache risk on the
// image itself once the browser does refetch.
function applyFavicon(logoUrl: string | null) {
  const head = document.head;
  head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((el) => el.remove());

  if (!logoUrl) {
    for (const icon of DEFAULT_ICONS) {
      const link = document.createElement("link");
      link.rel = icon.rel;
      if (icon.sizes) link.sizes.value = icon.sizes;
      if (icon.type) link.type = icon.type;
      link.href = icon.href;
      head.appendChild(link);
    }
    return;
  }

  const type = mimeTypeFor(logoUrl);

  const icon = document.createElement("link");
  icon.rel = "icon";
  if (type) icon.type = type;
  icon.href = logoUrl;
  head.appendChild(icon);

  const appleIcon = document.createElement("link");
  appleIcon.rel = "apple-touch-icon";
  appleIcon.href = logoUrl;
  head.appendChild(appleIcon);
}

async function fetchAndApply() {
  try {
    const res = await fetch(`/api/public/branding?t=${Date.now()}`, { cache: "no-store" });
    const data = res.ok ? await res.json().catch(() => null) : null;
    applyFavicon(data?.logoUrl || null);
  } catch {
    // Leave whatever's already in <head> (static defaults from index.html
    // on first load) rather than clearing the icon on a network hiccup.
  }
}

/**
 * Keeps the browser tab favicon (and apple-touch-icon) in sync with the
 * school's uploaded logo (Settings > Branding), for every visitor — logged
 * in or not, since the branding endpoint is public. Re-applies on mount
 * (covers page loads/refreshes) and whenever an admin saves new branding
 * in the same session (see SettingsProvider's "branding-updated" event),
 * so it doesn't require a manual refresh to show up in the tab you're
 * already using.
 */
export default function DynamicFavicon() {
  useEffect(() => {
    fetchAndApply();
    window.addEventListener("branding-updated", fetchAndApply);
    return () => window.removeEventListener("branding-updated", fetchAndApply);
  }, []);

  return null;
}
