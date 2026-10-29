const SCHOOL_TIME_ZONE = 'Asia/Kuala_Lumpur';
const DATE_UNAVAILABLE = 'Date unavailable';

const dateOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric', month: 'long', year: 'numeric', calendar: 'gregory', numberingSystem: 'latn',
};

/** Validate the calendar before Date can silently roll 31 February into March. */
function calendarDate(year: number, month: number, day: number): Date | null {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date : null;
}

function parseDocumentDate(value: string): { date: Date; dateOnly: boolean } | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const date = calendarDate(Number(dateOnly[1]), Number(dateOnly[2]), Number(dateOnly[3]));
    return date ? { date, dateOnly: true } : null;
  }

  // A timestamp must include its offset. A browser-local timestamp would make
  // the same issued document show different dates on different computers.
  const timestamp = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!timestamp || !calendarDate(Number(timestamp[1]), Number(timestamp[2]), Number(timestamp[3]))) return null;
  if (Number(timestamp[4]) > 23 || Number(timestamp[5]) > 59 || Number(timestamp[6] || 0) > 59) return null;
  const offset = timestamp[8];
  if (offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4, 6)) > 59)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false };
}

/** Calendar dates stay literal; instants always use the school's Malaysian date. */
export function formatVolunteerIssueDate(value?: string | null): string {
  if (value == null || value === '') return 'Set when issued';
  if (typeof value !== 'string') return DATE_UNAVAILABLE;
  const parsed = parseDocumentDate(value);
  if (!parsed) return DATE_UNAVAILABLE;
  return new Intl.DateTimeFormat('en-GB', {
    ...dateOptions, timeZone: parsed.dateOnly ? 'UTC' : SCHOOL_TIME_ZONE,
  }).format(parsed.date);
}

/** Signing records require an instant, including an explicit timezone offset. */
export function formatVolunteerSignedAt(value?: string | null): string {
  if (typeof value !== 'string') return DATE_UNAVAILABLE;
  const parsed = parseDocumentDate(value);
  if (!parsed || parsed.dateOnly) return DATE_UNAVAILABLE;
  const date = new Intl.DateTimeFormat('en-GB', {
    ...dateOptions, timeZone: SCHOOL_TIME_ZONE,
  }).format(parsed.date);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: SCHOOL_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', numberingSystem: 'latn',
  }).format(parsed.date);
  return `${date}, ${time} MYT`;
}
