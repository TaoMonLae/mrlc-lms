const key = (userId: string) => `mrlc:course-return:${userId}`;
export function validCourseReturn(value: unknown): value is string {
  return typeof value === 'string' && /^\/courses\/learn\/[a-zA-Z0-9_-]+\?lesson=[a-zA-Z0-9_-]+$/.test(value);
}
export function rememberCourseReturn(userId: string, path: string) {
  if (!validCourseReturn(path)) return;
  try { sessionStorage.setItem(key(userId), path); } catch { /* Back navigation remains available when storage is disabled. */ }
}
export function getCourseReturn(userId: string | undefined): string | null {
  if (!userId) return null;
  try { const path = sessionStorage.getItem(key(userId)); return validCourseReturn(path) ? path : null; } catch { return null; }
}
export function clearCourseReturn(userId: string) {
  try { sessionStorage.removeItem(key(userId)); } catch { /* Optional navigation context only. */ }
}
