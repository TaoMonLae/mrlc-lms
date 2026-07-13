/**
 * Date helpers that respect the user's local timezone.
 *
 * `new Date().toISOString().slice(0, 10)` gives the UTC calendar date, which
 * is the wrong day near midnight (e.g. it's still "yesterday" until 06:30 in
 * Myanmar). Use these helpers for date-input defaults and date params.
 */

/** Today's date as YYYY-MM-DD in the user's local timezone. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Format a Date as YYYY-MM-DD in the user's local timezone. */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parse a YYYY-MM-DD string as local midnight (not UTC midnight). */
export function parseLocalDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`);
}

/** Format a stored ISO date as a calendar date without timezone drift. */
export function formatDateOnly(value: string): string {
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00`).toLocaleDateString()
    : value;
}
