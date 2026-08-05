import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  Filter,
  MapPin,
  MoreVertical,
  Plus,
  Printer,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/src/lib/permissions';
import { qs } from '../../lib/api';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

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
  scheduleType?: 'CLASS' | 'HOLIDAY' | 'SPECIAL_EVENT' | 'EXAM' | 'MEETING';
  recurrence?: 'ONCE' | 'WEEKLY' | 'BIWEEKLY';
  status?: 'ACTIVE' | 'CANCELLED' | 'SUBSTITUTED';
  cancellationReason?: string | null;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  eventDate?: string | null;
  notes?: string | null;
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const entryTitle = (entry: TimetableEntry) => {
  if (entry.scheduleType === 'HOLIDAY') return entry.notes || 'School Holiday';
  if (entry.scheduleType === 'SPECIAL_EVENT') return entry.notes || 'Special Event';
  return entry.subjectName || 'Scheduled Period';
};

const colorClass = (entry: TimetableEntry) => {
  if (entry.status === 'CANCELLED') return 'bg-slate-500';
  if (entry.scheduleType === 'HOLIDAY') return 'bg-rose-500';
  if (entry.scheduleType === 'SPECIAL_EVENT') return 'bg-amber-500';
  if (entry.scheduleType === 'EXAM') return 'bg-purple-500';
  if (entry.scheduleType === 'MEETING') return 'bg-cyan-500';
  return entry.subjectColor || 'bg-blue-500';
};

const borderPrintClass = (entry: TimetableEntry) => {
  const bg = colorClass(entry);
  return bg.replace('bg-', 'print:border-l-') + ' print:border-l-4';
};

// ── date/time helpers ─────────────────────────────────────────────────────────

/** Minutes since midnight from "HH:mm". */
const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Monday of the week containing d (local time). */
const mondayOf = (d: Date) => {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // Monday = 0
  out.setDate(out.getDate() - dow);
  return out;
};

const addDays = (d: Date, n: number) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

const parseLocalDate = (dateVal: string | Date | null | undefined) => {
  if (!dateVal) return null;
  const str = typeof dateVal === 'string' ? dateVal : dateVal.toISOString();
  const [y, m, d] = str.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

const sameLocalDate = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const fmtDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtRange = (a: Date, b: Date) =>
  `${a.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

/** Should this entry appear on the given calendar date? */
function occursOn(entry: TimetableEntry, date: Date): boolean {
  // One-off entries pinned to a date show only on that date.
  if (entry.eventDate) {
    const evDate = parseLocalDate(entry.eventDate);
    return evDate ? sameLocalDate(evDate, date) : false;
  }
  if (entry.recurrence === 'ONCE') return true; // legacy one-offs without a date

  // Recurring entries respect their effective window.
  const from = parseLocalDate(entry.effectiveFrom);
  const until = parseLocalDate(entry.effectiveUntil);
  if (from && date < from) return false;
  if (until && date > until) return false;

  if (entry.recurrence === 'BIWEEKLY' && from) {
    const diffDays = Math.round((mondayOf(date).getTime() - mondayOf(from).getTime()) / 86_400_000);
    const weeks = Math.floor(diffDays / 7);
    return weeks % 2 === 0;
  }
  return true;
}

// ── overlap layout: assign side-by-side lanes to overlapping entries ─────────
type Positioned = { entry: TimetableEntry; lane: number; lanes: number };

function layoutDay(entries: TimetableEntry[]): Positioned[] {
  const sorted = [...entries].sort((a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(a.endTime) - toMin(b.endTime));
  const out: Positioned[] = [];
  let cluster: { entry: TimetableEntry; lane: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const lanes = cluster.length ? Math.max(...cluster.map((c) => c.lane)) + 1 : 1;
    for (const c of cluster) out.push({ entry: c.entry, lane: c.lane, lanes });
    cluster = [];
  };

  for (const entry of sorted) {
    const start = toMin(entry.startTime);
    if (cluster.length && start >= clusterEnd) { flush(); clusterEnd = -1; }
    // First free lane whose last entry has ended.
    const laneEnds: number[] = [];
    for (const c of cluster) laneEnds[c.lane] = Math.max(laneEnds[c.lane] ?? 0, toMin(c.entry.endTime));
    let lane = 0;
    while ((laneEnds[lane] ?? 0) > start) lane++;
    cluster.push({ entry, lane });
    clusterEnd = Math.max(clusterEnd, toMin(entry.endTime));
  }
  flush();
  return out;
}

export default function TimetablePage() {
  const [viewType, setViewType] = useState<'class' | 'teacher' | 'room'>('class');
  const [selectedIdentifier, setSelectedIdentifier] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [scheduleType, setScheduleType] = useState('all');
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const { isAdmin, hasPermission, isTeacher, isStudent } = usePermissions();

  const canManage = isAdmin || hasPermission('manage_timetable');
  const weekDates = useMemo(() => DAYS.map((_, i) => addDays(weekStart, i)), [weekStart]);
  const isCurrentWeek = sameLocalDate(weekStart, mondayOf(new Date()));

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/timetable${qs({ academicYear, term, status, scheduleType })}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch timetable');
      const data: TimetableEntry[] = await res.json();
      setTimetable(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selector options keyed by stable IDs (names can be missing or duplicated).
  const identifierOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of timetable) {
      if (viewType === 'teacher') {
        if (entry.teacherId) map.set(entry.teacherId, entry.teacherName || map.get(entry.teacherId) || 'Unnamed teacher');
      } else if (viewType === 'room') {
        if (entry.room) map.set(entry.room, entry.room);
      } else if (entry.classId) {
        map.set(entry.classId, entry.className || map.get(entry.classId) || 'Unnamed class');
      }
    }
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [timetable, viewType]);

  const filteredTimetable = useMemo(() => {
    if (isTeacher || isStudent || !selectedIdentifier) return timetable;
    return timetable.filter((entry) => {
      if (viewType === 'teacher') return entry.teacherId === selectedIdentifier || entry.substituteTeacherId === selectedIdentifier;
      if (viewType === 'room') return entry.room === selectedIdentifier;
      return entry.classId === selectedIdentifier;
    });
  }, [timetable, selectedIdentifier, viewType, isTeacher, isStudent]);

  /** Entries visible on each date of the selected week. */
  const weekEntries = useMemo(() =>
    DAYS.map((day, i) =>
      filteredTimetable.filter((entry) => entry.dayOfWeek === day && occursOn(entry, weekDates[i]))
    ), [filteredTimetable, weekDates]);

  // Time axis bounds (floor/ceil to the hour, sensible defaults for empty views).
  const allVisible = weekEntries.flat();
  const minHour = allVisible.length ? Math.floor(Math.min(...allVisible.map((e) => toMin(e.startTime))) / 60) : 8;
  const maxHour = allVisible.length ? Math.ceil(Math.max(...allVisible.map((e) => toMin(e.endTime))) / 60) : 16;
  const PX_PER_MIN = 1.2;
  const gridHeight = Math.max(1, maxHour - minHour) * 60 * PX_PER_MIN;
  const hours = Array.from({ length: Math.max(1, maxHour - minHour) + 1 }, (_, i) => minHour + i);

  const handleDelete = async (entryId: string) => {
    if (!confirm('Delete this timetable slot?')) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/timetable/${entryId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setTimetable((prev) => prev.filter((entry) => entry.id !== entryId));
      toast.success('Timetable slot deleted');
    } catch {
      toast.error('Failed to delete slot');
    }
  };

  return (
    <div className="space-y-6 print:bg-white">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <CalendarDays className="h-6 w-6 text-aubergine-600" />
            School Timetable
          </h1>
          <p className="text-sm text-slate-500">
            Weekly class periods, teacher assignments, rooms, holidays, events, substitutions, and cancellations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print / PDF
          </Button>
          {canManage && (
            <Button render={<Link to="/timetable/new" />} nativeButton={false}>
              <Plus className="mr-2 h-4 w-4" />
              Add Slot
            </Button>
          )}
        </div>
      </div>

      <div className="hidden print:block">
        <h1 className="text-xl font-bold">MRLC Weekly Timetable</h1>
        <p className="text-sm">{fmtRange(weekDates[0], weekDates[6])} · {academicYear || 'All years'} · {term || 'All terms'}</p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-surface-raised dark:bg-surface-indigo print:hidden">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_1fr_140px_130px_150px_auto]">
          {!isTeacher && !isStudent && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1 dark:bg-surface-raised">
              {(['class', 'teacher', 'room'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewType === mode ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => {
                    setViewType(mode);
                    setSelectedIdentifier('');
                  }}
                  className="h-8 px-3 text-xs capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
          )}

          {!isTeacher && !isStudent && (
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-surface-raised dark:bg-surface-indigo dark:text-white"
              value={selectedIdentifier}
              onChange={(event) => setSelectedIdentifier(event.target.value)}
            >
              <option value="">All {viewType}s</option>
              {identifierOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

          <input
            value={academicYear}
            onChange={(event) => setAcademicYear(event.target.value)}
            placeholder="Academic year"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-surface-raised dark:bg-surface-indigo dark:text-white"
          />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Term"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-surface-raised dark:bg-surface-indigo dark:text-white"
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-surface-raised dark:bg-surface-indigo dark:text-white">
            <option value="ACTIVE">Active</option>
            <option value="SUBSTITUTED">Substituted</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="all">All statuses</option>
          </select>
          <select value={scheduleType} onChange={(event) => setScheduleType(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-surface-raised dark:bg-surface-indigo dark:text-white">
            <option value="all">All types</option>
            <option value="CLASS">Class periods</option>
            <option value="EXAM">Exams</option>
            <option value="MEETING">Meetings</option>
            <option value="HOLIDAY">Holidays</option>
            <option value="SPECIAL_EVENT">Special events</option>
          </select>
          <Button type="button" variant="outline" onClick={loadTimetable} disabled={loading}>
            <Filter className="mr-2 h-4 w-4" />
            Apply
          </Button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-surface-raised dark:bg-surface-indigo print:hidden">
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous week
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">{fmtRange(weekDates[0], weekDates[6])}</span>
          {!isCurrentWeek && (
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setWeekStart(mondayOf(new Date()))}>
              Today
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          Next week <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      {/* Desktop: proportional week grid */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo lg:block print:block print:border-slate-300">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-surface-raised dark:bg-surface-raised/50">
          <div className="border-r border-slate-200 p-3 dark:border-surface-raised">Time</div>
          {DAYS.map((day, i) => {
            const isToday = sameLocalDate(weekDates[i], new Date());
            return (
              <div key={day} className={`border-r border-slate-200 p-2 last:border-r-0 dark:border-surface-raised ${isToday ? 'bg-aubergine-50 dark:bg-aubergine-900/20' : ''}`}>
                <div className={isToday ? 'text-aubergine-700 dark:text-aubergine-300' : ''}>{day.slice(0, 3)}</div>
                <div className={`mt-0.5 text-[10px] font-semibold normal-case ${isToday ? 'text-aubergine-600 dark:text-aubergine-400' : 'text-slate-400'}`}>{fmtDay(weekDates[i])}</div>
              </div>
            );
          })}
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading timetable...</div>
        ) : allVisible.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No timetable entries for this week.</div>
        ) : (
          <div className="grid grid-cols-[64px_repeat(7,1fr)]">
            {/* Hour labels */}
            <div className="relative border-r border-slate-200 dark:border-surface-raised" style={{ height: gridHeight }}>
              {hours.map((h) => (
                <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-bold text-slate-400" style={{ top: (h - minHour) * 60 * PX_PER_MIN }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
            {/* Day columns */}
            {DAYS.map((day, i) => (
              <div key={day} className="relative border-r border-slate-100 last:border-r-0 dark:border-surface-raised/50" style={{ height: gridHeight }}>
                {/* hour gridlines */}
                {hours.slice(1).map((h) => (
                  <div key={h} className="absolute left-0 right-0 border-t border-slate-100 dark:border-surface-raised/40" style={{ top: (h - minHour) * 60 * PX_PER_MIN }} />
                ))}
                {layoutDay(weekEntries[i]).map(({ entry, lane, lanes }) => {
                  const top = (toMin(entry.startTime) - minHour * 60) * PX_PER_MIN;
                  const height = Math.max(34, (toMin(entry.endTime) - toMin(entry.startTime)) * PX_PER_MIN);
                  const width = 100 / lanes;
                  return (
                    <div
                      key={entry.id}
                      className="absolute px-0.5 py-px"
                      style={{ top, height, left: `${lane * width}%`, width: `${width}%` }}
                    >
                      <ScheduleCard entry={entry} viewType={viewType} canManage={canManage} onDelete={handleDelete} compact={height < 76} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: per-day lists */}
      <div className="space-y-4 lg:hidden print:hidden">
        {DAYS.map((day, i) => {
          const entries = weekEntries[i].sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (entries.length === 0) return null;
          const isToday = sameLocalDate(weekDates[i], new Date());
          return (
            <section key={day} className="space-y-3">
              <h2 className={`border-l-4 pl-2 text-sm font-bold uppercase tracking-widest ${isToday ? 'border-aubergine-500 text-aubergine-600' : 'border-slate-300 text-slate-500'}`}>
                {day} <span className="font-semibold normal-case text-slate-400">· {fmtDay(weekDates[i])}</span>
              </h2>
              {entries.map((entry) => <ScheduleCard key={entry.id} entry={entry} viewType={viewType} canManage={canManage} onDelete={handleDelete} mobile />)}
            </section>
          );
        })}
        {!loading && allVisible.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-400 dark:border-surface-raised">No timetable entries for this week.</p>
        )}
      </div>
    </div>
  );
}

function ScheduleCard({ entry, viewType, canManage, onDelete, mobile = false, compact = false }: {
  entry: TimetableEntry;
  viewType: 'class' | 'teacher' | 'room';
  canManage: boolean;
  onDelete: (id: string) => void;
  mobile?: boolean;
  compact?: boolean;
}) {
  const counterpart = viewType === 'teacher' ? (entry.className || 'No class') : (entry.teacherName || 'Unassigned');
  return (
    <div className={`${colorClass(entry)} ${borderPrintClass(entry)} relative h-full overflow-hidden rounded-lg text-white shadow-sm ${mobile ? 'flex gap-3 p-3' : compact ? 'p-1.5' : 'p-2.5'} print:bg-white print:text-slate-900 print:shadow-none print:ring-1 print:ring-slate-300`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1">
          <p className={`font-bold uppercase tracking-wider opacity-85 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{entry.startTime}–{entry.endTime}</p>
          {!compact && (
            <Badge variant="outline" className="h-4 border-white/40 bg-white/10 px-1 text-[9px] text-white print:border-slate-300 print:text-slate-700">
              {entry.status || 'ACTIVE'}
            </Badge>
          )}
        </div>
        <h3 className={`truncate font-bold ${compact ? 'text-xs' : 'mt-0.5 text-sm'} ${entry.status === 'CANCELLED' ? 'line-through opacity-70' : ''}`}>{entryTitle(entry)}</h3>
        {!compact && (
          <div className="mt-1 space-y-0.5 text-[11px] opacity-90">
            <p className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{entry.room || 'No room'}</p>
            <p className="flex items-center gap-1 truncate">
              {viewType === 'teacher' ? <BookOpen className="h-3 w-3 shrink-0" /> : <User className="h-3 w-3 shrink-0" />}
              {counterpart}
            </p>
            {entry.substituteTeacherName && <p className="truncate">Sub: {entry.substituteTeacherName}</p>}
            {entry.scheduleType && entry.scheduleType !== 'CLASS' && <p>{entry.scheduleType.replaceAll('_', ' ')}</p>}
            {entry.cancellationReason && <p className="truncate">Reason: {entry.cancellationReason}</p>}
          </div>
        )}
      </div>
      {canManage && (
        <div className={mobile ? 'print:hidden' : 'absolute right-1 top-1 print:hidden'}>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className={`text-white hover:bg-white/20 ${compact ? 'h-5 w-5' : 'h-6 w-6'}`} />} nativeButton={true}>
              <MoreVertical className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem render={<Link to={`/timetable/${entry.id}/edit`} className="flex w-full items-center" />}>
                <Edit className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-rose-600" onClick={() => onDelete(entry.id)}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
