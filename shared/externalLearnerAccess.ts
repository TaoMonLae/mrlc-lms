function cleanPathname(value: string): string {
  const pathname = value.split(/[?#]/, 1)[0] || "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Browser routes available after a public learner signs in.
 *
 * Keep this deliberately narrower than the general STUDENT route set:
 * public learner accounts exist only for Language Quest and password changes.
 */
export function isExternalLearnerAppPathAllowed(value: string): boolean {
  const pathname = cleanPathname(value);
  return (
    pathname === "/language-quest"
    || pathname === "/change-password"
    || pathname === "/games/language-quest"
    || pathname === "/games/language-quest/leaderboard"
    || /^\/games\/language-quest\/courses\/[^/]+$/.test(pathname)
    || /^\/games\/language-quest\/lessons\/[^/]+$/.test(pathname)
  );
}

/**
 * Authenticated API surface available to a public learner token.
 *
 * This is an explicit method-and-route allowlist. In particular, the broad
 * Language Quest prefix is not enough because it also contains management
 * endpoints intended for school staff.
 */
export function isExternalLearnerApiRequestAllowed(method: string, value: string): boolean {
  const pathname = cleanPathname(value);
  const verb = method.toUpperCase();

  if (verb === "GET") {
    return (
      pathname === "/api/auth/me"
      || pathname === "/api/language-quest/overview"
      || pathname === "/api/language-quest/leaderboard"
      || /^\/api\/language-quest\/courses\/[^/]+$/.test(pathname)
      || /^\/api\/language-quest\/lessons\/[^/]+(?:\/preview)?$/.test(pathname)
    );
  }

  if (verb === "POST") {
    return (
      pathname === "/api/auth/logout"
      || pathname === "/api/auth/change-password"
      || /^\/api\/language-quest\/challenges\/[^/]+\/answer$/.test(pathname)
    );
  }

  return false;
}
