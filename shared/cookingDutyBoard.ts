const dateKey = (value: string | Date) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : '';
};

export function dutyDateIsWithinRoster(value: string | Date, start: string | Date, end: string | Date) {
  const day = dateKey(value);
  const first = dateKey(start);
  const last = dateKey(end);
  return Boolean(day && first && last && day >= first && day <= last);
}

export function rosterDateKeys(start: string | Date, end: string | Date, limit = 93) {
  const first = dateKey(start);
  const last = dateKey(end);
  if (!first || !last || first > last) return [];
  const cursor = new Date(`${first}T00:00:00.000Z`);
  const final = new Date(`${last}T00:00:00.000Z`);
  const result: string[] = [];
  while (cursor <= final && result.length < limit) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

