export type SchoolDateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
export type SchoolTimeFormat = '12' | '24';

type DateParts = { day: string; month: string; year: string };

function safeTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en', { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return 'UTC';
  }
}

function dateParts(date: Date, timeZone: string): DateParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    timeZone: safeTimeZone(timeZone),
    year: 'numeric',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  return { day: value('day'), month: value('month'), year: value('year') };
}

export function formatSchoolDate(
  date: Date,
  timeZone: string,
  format: SchoolDateFormat,
): string {
  const { day, month, year } = dateParts(date, timeZone);
  if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
}

export function formatSchoolTime(
  date: Date,
  timeZone: string,
  format: SchoolTimeFormat,
  showSeconds: boolean,
): string {
  const twelveHour = format === '12';
  const parts = new Intl.DateTimeFormat(twelveHour ? 'en-US' : 'en-GB', {
    hour: '2-digit',
    hour12: twelveHour,
    hourCycle: twelveHour ? 'h12' : 'h23',
    minute: '2-digit',
    second: showSeconds ? '2-digit' : undefined,
    timeZone: safeTimeZone(timeZone),
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';
  const clock = `${value('hour')}:${value('minute')}${showSeconds ? `:${value('second')}` : ''}`;
  return twelveHour ? `${clock} ${value('dayPeriod')}` : clock;
}

export function formatSchoolWeekday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en', {
    timeZone: safeTimeZone(timeZone),
    weekday: 'short',
  }).format(date);
}

export function formatTimeZoneLabel(timeZone: string, date = new Date()): string {
  const validZone = safeTimeZone(timeZone);
  const offset = new Intl.DateTimeFormat('en', {
    timeZone: validZone,
    timeZoneName: 'shortOffset',
  }).formatToParts(date).find((part) => part.type === 'timeZoneName')?.value;
  const location = validZone.replace(/_/g, ' ').replace('/', ' / ');
  return offset ? `${location} · ${offset}` : location;
}
