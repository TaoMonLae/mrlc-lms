function cleanPathname(value: string): string {
  const pathname = value.split(/[?#]/, 1)[0] || "/";
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/**
 * Browser routes available after a public learner signs in.
 *
 * Keep this deliberately narrower than the general STUDENT route set:
 * public learner accounts exist only for Learning Quest and password changes.
 */
export function isExternalLearnerAppPathAllowed(value: string): boolean {
  const pathname = cleanPathname(value);
  return (
    pathname === "/language-quest"
    || pathname === "/language-quest/about"
    || pathname === "/change-password"
    || pathname === "/games/language-quest"
    || pathname === "/games/language-quest/profile"
    || pathname === "/games/language-quest/leaderboard"
    || pathname === "/games/language-quest/mastery"
    || pathname === "/games/language-quest/heart-refill"
    || pathname === "/games/language-quest/words"
    || /^\/games\/language-quest\/courses\/[^/]+$/.test(pathname)
    || /^\/games\/language-quest\/courses\/[^/]+\/(?:boss-battle|final-exam|culture)$/.test(pathname)
    || /^\/games\/language-quest\/courses\/[^/]+\/story\/[^/]+$/.test(pathname)
    || /^\/games\/language-quest\/lessons\/[^/]+$/.test(pathname)
  );
}

/**
 * Authenticated API surface available to a public learner token.
 *
 * This is an explicit method-and-route allowlist. In particular, the broad
 * Learning Quest prefix is not enough because it also contains management
 * endpoints intended for school staff.
 */
export function isExternalLearnerApiRequestAllowed(method: string, value: string): boolean {
  const pathname = cleanPathname(value);
  const verb = method.toUpperCase();

  if (verb === "GET") {
    return (
      pathname === "/api/auth/me"
      || pathname === "/api/language-quest/profile"
      || pathname === "/api/language-quest/overview"
      || pathname === "/api/language-quest/leaderboard"
      || pathname === "/api/language-quest/engagement"
      || pathname === "/api/language-quest/mastery"
      || pathname === "/api/language-quest/voice"
      || pathname === "/api/language-quest/learned-words"
      || /^\/api\/language-quest\/courses\/[^/]+$/.test(pathname)
      || /^\/api\/language-quest\/courses\/[^/]+\/boss-battle$/.test(pathname)
      || /^\/api\/language-quest\/lessons\/[^/]+(?:\/preview)?$/.test(pathname)
    );
  }

  if (verb === "POST") {
    return (
      pathname === "/api/auth/logout"
      || pathname === "/api/auth/change-password"
      || pathname === "/api/language-quest/profile/classrooms"
      || pathname === "/api/language-quest/voice"
      || pathname === "/api/language-quest/heart-refill/start"
      || pathname === "/api/language-quest/heart-refill/finish"
      || /^\/api\/language-quest\/challenges\/[^/]+\/answer$/.test(pathname)
      || /^\/api\/language-quest\/courses\/[^/]+\/boss-battle\/finish$/.test(pathname)
      || /^\/api\/language-quest\/courses\/[^/]+\/final-exam\/(?:start|audio|finish|violation)$/.test(pathname)
      || /^\/api\/language-quest\/mastery\/[^/]+\/answer$/.test(pathname)
      || /^\/api\/language-quest\/missions\/[^/]+\/claim$/.test(pathname)
    );
  }

  if (verb === "PATCH") {
    return pathname === "/api/language-quest/profile";
  }

  if (verb === "DELETE") {
    return /^\/api\/language-quest\/profile\/classrooms\/[^/]+$/.test(pathname);
  }

  return false;
}

/**
 * The Learning Quest leaderboard is global across public learner accounts and
 * LMS members. Only active accounts are eligible; this does not grant public
 * learners access to any private LMS route or API.
 */
export function languageQuestGlobalLeaderboardWhere() {
  return {
    isActive: true,
  };
}
