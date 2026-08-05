function accountPathname(value: string): string {
  const pathname = value.split(/[?#]/, 1)[0] || "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Temporary-password accounts may only reach the password replacement page.
 * Keep this independent of any particular app layout so standalone products
 * such as Language Quest cannot accidentally bypass the requirement.
 */
export function shouldForcePasswordChange(
  mustChangePassword: boolean | null | undefined,
  value: string,
): boolean {
  return Boolean(mustChangePassword) && accountPathname(value) !== "/change-password";
}

/**
 * Convert React Router's saved location into a same-app return URL. Reject
 * protocol-relative and malformed paths so login redirects cannot be used to
 * navigate outside the application.
 */
export function safeAppReturnPath(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { pathname?: unknown; search?: unknown; hash?: unknown };
  if (
    typeof candidate.pathname !== "string"
    || !candidate.pathname.startsWith("/")
    || candidate.pathname.startsWith("//")
    || candidate.pathname.includes("\\")
    || candidate.pathname === "/login"
  ) return null;
  const search = typeof candidate.search === "string" && candidate.search.startsWith("?")
    ? candidate.search
    : "";
  const hash = typeof candidate.hash === "string" && candidate.hash.startsWith("#")
    ? candidate.hash
    : "";
  return `${candidate.pathname}${search}${hash}`;
}
