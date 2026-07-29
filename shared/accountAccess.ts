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
