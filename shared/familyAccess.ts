/** Guardian tokens only reach their own portal and account settings. */
export function isGuardianApiRequestAllowed(method: string, originalUrl: string): boolean {
  const pathname = originalUrl.split("?")[0];
  return pathname.startsWith("/api/family/")
    || pathname === "/api/family"
    || pathname.startsWith("/api/auth/")
    || (method === "GET" && pathname === "/api/settings");
}
