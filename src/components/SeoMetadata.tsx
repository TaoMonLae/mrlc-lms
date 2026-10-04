import { useEffect } from "react";
import { useLocation } from "react-router";
import { getSeoMetadata, SITE_NAME } from "../../shared/seo";

function headElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  selector: string,
): HTMLElementTagNameMap[K] {
  const matches = document.head.querySelectorAll<HTMLElementTagNameMap[K]>(selector);
  const element = matches[0] ?? document.createElement(tag);
  // Reuse the server-rendered tags, including the fallback tags from bare Vite.
  matches.forEach((match, index) => {
    if (index > 0) match.remove();
  });
  element.setAttribute("data-seo", "");
  if (!element.parentNode) document.head.appendChild(element);
  return element;
}

function setMeta(attribute: "name" | "property", name: string, content: string | null) {
  const selector = `meta[${attribute}="${name}"]`;
  if (content === null) {
    document.head.querySelectorAll(selector).forEach((element) => element.remove());
    return;
  }
  const element = headElement("meta", selector);
  element.setAttribute(attribute, name);
  element.content = content;
}

/** Keep metadata correct on SPA navigation, including while lazy pages load. */
export default function SeoMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    // The server's configured public origin remains canonical even when this
    // browser is visiting a proxy, preview, or another hostname.
    const origin = document.head.querySelector<HTMLMetaElement>('meta[name="mrlc-site-origin"]')?.content
      || window.location.origin;
    const metadata = getSeoMetadata(pathname, origin);

    headElement("title", "title");
    document.title = metadata.title;
    setMeta("name", "description", metadata.description);
    setMeta("name", "robots", metadata.robots);

    if (metadata.canonicalUrl) {
      const canonical = headElement("link", 'link[rel="canonical"]');
      canonical.rel = "canonical";
      canonical.href = metadata.canonicalUrl;
    } else {
      document.head.querySelectorAll('link[rel="canonical"]').forEach((element) => element.remove());
    }

    setMeta("property", "og:site_name", SITE_NAME);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:title", metadata.title);
    setMeta("property", "og:description", metadata.description);
    setMeta("property", "og:url", metadata.canonicalUrl);
    setMeta("property", "og:image", metadata.imageUrl);
    setMeta("property", "og:image:alt", `${SITE_NAME} logo`);
    setMeta("name", "twitter:card", "summary");
    setMeta("name", "twitter:title", metadata.title);
    setMeta("name", "twitter:description", metadata.description);
    setMeta("name", "twitter:image", metadata.imageUrl);
    setMeta("name", "twitter:image:alt", `${SITE_NAME} logo`);

    const structuredDataSelector = 'script[id="seo-structured-data"]';
    if (metadata.structuredData) {
      const structuredData = headElement("script", structuredDataSelector);
      structuredData.id = "seo-structured-data";
      structuredData.type = "application/ld+json";
      structuredData.textContent = JSON.stringify(metadata.structuredData);
    } else {
      document.head.querySelectorAll(structuredDataSelector).forEach((element) => element.remove());
    }
  }, [pathname]);

  return null;
}
