const LOCAL_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const two = (value: number) => String(value).padStart(2, '0');

/** Convert an API ISO timestamp into the user's local datetime-local value. */
export function toDateTimeLocalValue(value?: string | Date | null): string {
  if (!value) return '';
  if (typeof value === 'string' && LOCAL_DATE_TIME.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}T${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** Convert a datetime-local value into an unambiguous ISO timestamp for the API. */
export function fromDateTimeLocalValue(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}
