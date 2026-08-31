export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type ScheduleType = 'CLASS' | 'HOLIDAY' | 'SPECIAL_EVENT' | 'EXAM' | 'MEETING';
export type ScheduleStatus = 'ACTIVE' | 'CANCELLED' | 'SUBSTITUTED';
export type ScheduleRecurrence = 'ONCE' | 'WEEKLY' | 'BIWEEKLY';

export interface TimetableEntry {
  id: string;
  classId: string | null;
  className: string | null;
  subjectId: string | null;
  subjectName: string | null;
  subjectColor: string | null;
  teacherId: string | null;
  teacherName: string | null;
  substituteTeacherId?: string | null;
  substituteTeacherName?: string | null;
  academicYear?: string | null;
  term?: string | null;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string | null;
  scheduleType?: ScheduleType;
  recurrence?: ScheduleRecurrence;
  status?: ScheduleStatus;
  cancellationReason?: string | null;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  eventDate?: string | null;
  notes?: string | null;
}

export const TIMETABLE_DAYS: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const mondayOfWeek = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
};

export const addCalendarDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

export const parseLocalDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const raw = typeof value === 'string' ? value : value.toISOString();
  const [year, month, day] = raw.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

export const isSameLocalDate = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear()
  && first.getMonth() === second.getMonth()
  && first.getDate() === second.getDate();

export function occursOn(entry: TimetableEntry, date: Date) {
  if (entry.eventDate) {
    const eventDate = parseLocalDate(entry.eventDate);
    return eventDate ? isSameLocalDate(eventDate, date) : false;
  }

  // Older one-off records had no eventDate. They remain visible so the migration
  // does not silently hide school history.
  if (entry.recurrence === 'ONCE') return true;

  const from = parseLocalDate(entry.effectiveFrom);
  const until = parseLocalDate(entry.effectiveUntil);
  if (from && date < from) return false;
  if (until && date > until) return false;

  if (entry.recurrence === 'BIWEEKLY' && from) {
    const difference = mondayOfWeek(date).getTime() - mondayOfWeek(from).getTime();
    const weeks = Math.floor(Math.round(difference / 86_400_000) / 7);
    return weeks % 2 === 0;
  }

  return true;
}

export type PositionedTimetableEntry = {
  entry: TimetableEntry;
  lane: number;
  lanes: number;
};

/** Assign side-by-side lanes to overlapping entries without changing their time. */
export function layoutTimetableDay(entries: TimetableEntry[]): PositionedTimetableEntry[] {
  const sorted = [...entries].sort(
    (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)
      || toMinutes(b.endTime) - toMinutes(a.endTime),
  );
  const positioned: PositionedTimetableEntry[] = [];
  let cluster: TimetableEntry[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const laneEnds: number[] = [];
    const assigned = cluster.map((entry) => {
      const start = toMinutes(entry.startTime);
      let lane = laneEnds.findIndex((end) => end <= start);
      if (lane === -1) {
        laneEnds.push(toMinutes(entry.endTime));
        lane = laneEnds.length - 1;
      } else {
        laneEnds[lane] = toMinutes(entry.endTime);
      }
      return { entry, lane };
    });

    const lanes = Math.max(1, laneEnds.length);
    assigned.forEach((item) => positioned.push({ ...item, lanes }));
    cluster = [];
    clusterEnd = -Infinity;
  };

  sorted.forEach((entry) => {
    const start = toMinutes(entry.startTime);
    if (cluster.length && start >= clusterEnd) flush();
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, toMinutes(entry.endTime));
  });
  flush();

  return positioned;
}

export function timetableEntryTitle(entry: TimetableEntry) {
  if (entry.scheduleType === 'HOLIDAY') return entry.notes || 'School holiday';
  if (entry.scheduleType === 'SPECIAL_EVENT') return entry.notes || 'Special event';
  return entry.subjectName || entry.className || 'Scheduled period';
}

export function formatTimetableDay(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTimetableRange(start: Date, end: Date) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const first = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  });
  const last = end.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${first} – ${last}`;
}

export function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}
