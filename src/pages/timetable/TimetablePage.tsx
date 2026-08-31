import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  BookOpen, CalendarDays, ChevronLeft, ChevronRight, Edit, Filter, MapPin,
  MoreVertical, Plus, Printer, RefreshCw, Trash2, User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '@/src/lib/permissions';
import { qs } from '../../lib/api';
import {
  TIMETABLE_DAYS, addCalendarDays, formatTimetableDay, formatTimetableRange,
  isSameLocalDate, layoutTimetableDay, mondayOfWeek, occursOn,
  timetableEntryTitle, toMinutes, type TimetableEntry,
} from '../../lib/timetable';

export type { DayOfWeek, TimetableEntry } from '../../lib/timetable';

const PX_PER_MINUTE = 1.05;

function scheduleTypeLabel(entry: TimetableEntry) {
  return (entry.scheduleType || 'CLASS').replaceAll('_', ' ');
}

function eventTone(entry: TimetableEntry) {
  if (entry.status === 'CANCELLED') return 'border-academic-coral bg-academic-coral/10 text-foreground';
  if (entry.status === 'SUBSTITUTED') return 'border-academic-gold bg-academic-gold/14 text-foreground';
  return 'border-academic-teal bg-card text-foreground';
}

function currentTimeTop(minHour: number, maxHour: number) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < minHour * 60 || minutes > maxHour * 60) return null;
  return (minutes - minHour * 60) * PX_PER_MINUTE;
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
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()));
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { isAdmin, hasPermission, isTeacher, isStudent } = usePermissions();

  const canManage = isAdmin || hasPermission('manage_timetable');
  const weekDates = useMemo(
    () => TIMETABLE_DAYS.map((_, index) => addCalendarDays(weekStart, index)),
    [weekStart],
  );
  const isCurrentWeek = isSameLocalDate(weekStart, mondayOfWeek(new Date()));

  const loadTimetable = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/timetable${qs({ academicYear, term, status, scheduleType })}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch timetable');
      const data: TimetableEntry[] = await response.json();
      setTimetable(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching timetable:', error);
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTimetable();
    // Filters are deliberately applied with the Apply button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const identifierOptions = useMemo(() => {
    const options = new Map<string, string>();
    timetable.forEach((entry) => {
      if (viewType === 'teacher' && entry.teacherId) {
        options.set(entry.teacherId, entry.teacherName || options.get(entry.teacherId) || 'Unnamed teacher');
      } else if (viewType === 'room' && entry.room) {
        options.set(entry.room, entry.room);
      } else if (viewType === 'class' && entry.classId) {
        options.set(entry.classId, entry.className || options.get(entry.classId) || 'Unnamed class');
      }
    });
    return Array.from(options, ([value, label]) => ({ value, label }))
      .sort((first, second) => first.label.localeCompare(second.label));
  }, [timetable, viewType]);

  const filteredTimetable = useMemo(() => {
    if (isTeacher || isStudent || !selectedIdentifier) return timetable;
    return timetable.filter((entry) => {
      if (viewType === 'teacher') return entry.teacherId === selectedIdentifier || entry.substituteTeacherId === selectedIdentifier;
      if (viewType === 'room') return entry.room === selectedIdentifier;
      return entry.classId === selectedIdentifier;
    });
  }, [isStudent, isTeacher, selectedIdentifier, timetable, viewType]);

  const weekEntries = useMemo(
    () => TIMETABLE_DAYS.map((day, index) => filteredTimetable.filter(
      (entry) => entry.dayOfWeek === day && occursOn(entry, weekDates[index]),
    )),
    [filteredTimetable, weekDates],
  );

  const allVisible = weekEntries.flat();
  const minHour = allVisible.length
    ? Math.max(0, Math.floor(Math.min(...allVisible.map((entry) => toMinutes(entry.startTime))) / 60))
    : 8;
  const maxHour = allVisible.length
    ? Math.min(24, Math.ceil(Math.max(...allVisible.map((entry) => toMinutes(entry.endTime))) / 60))
    : 16;
  const gridHeight = Math.max(1, maxHour - minHour) * 60 * PX_PER_MINUTE;
  const hours = Array.from({ length: Math.max(1, maxHour - minHour) + 1 }, (_, index) => minHour + index);
  const nowTop = currentTimeTop(minHour, maxHour);
  const activeCount = allVisible.filter((entry) => entry.status !== 'CANCELLED').length;
  const exceptionCount = allVisible.filter(
    (entry) => entry.status !== 'ACTIVE' || (entry.scheduleType && entry.scheduleType !== 'CLASS'),
  ).length;
  const classCount = new Set(allVisible.map((entry) => entry.classId).filter(Boolean)).size;
  const staffCount = new Set(allVisible.flatMap((entry) => [entry.teacherId, entry.substituteTeacherId]).filter(Boolean)).size;

  const deleteEntry = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch(`/api/timetable/${deleteTarget.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete');
      setTimetable((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('Timetable slot deleted');
    } catch {
      toast.error('Failed to delete slot');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-12 print:max-w-none print:bg-white">
      <header className="flex flex-col gap-5 border-b border-foreground pb-5 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-academic-teal">Academics / Weekly field plan</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Timetable control desk</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Read teaching load, room use, substitutions, and school exceptions on one ruled weekly canvas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="rounded-none border-foreground" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print evidence
          </Button>
          {canManage && (
            <Button className="rounded-none" render={<Link to="/timetable/new" />} nativeButton={false}>
              <Plus className="h-4 w-4" /> Add schedule item
            </Button>
          )}
        </div>
      </header>

      <div className="hidden print:block">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-600">MRLC / Weekly timetable evidence</p>
        <h1 className="mt-1 text-xl font-semibold">{formatTimetableRange(weekDates[0], weekDates[6])}</h1>
        <p className="mt-1 text-xs text-slate-600">{academicYear || 'All academic years'} · {term || 'All terms'}</p>
      </div>

      <section className="border border-foreground bg-card print:hidden" aria-label="Timetable controls">
        {!isTeacher && !isStudent && (
          <div className="grid border-b border-foreground sm:grid-cols-[180px_1fr]">
            <div className="flex items-center border-b border-foreground bg-academic-navy-deep px-4 py-3 text-white sm:border-b-0 sm:border-r">
              <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-[#6dd4cb]">Arrange the week by</p>
            </div>
            <div className="grid grid-cols-3">
              {(['class', 'teacher', 'room'] as const).map((mode) => (
                <button
                  key={mode} type="button" aria-pressed={viewType === mode}
                  onClick={() => { setViewType(mode); setSelectedIdentifier(''); }}
                  className={`min-h-11 border-r border-border px-3 text-left text-xs font-semibold uppercase tracking-[0.08em] transition-colors last:border-r-0 ${viewType === mode ? 'bg-academic-gold text-academic-navy-deep' : 'bg-card text-muted-foreground hover:bg-muted/45 hover:text-foreground'}`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-px bg-border lg:grid-cols-[minmax(180px,1.15fr)_minmax(150px,.8fr)_minmax(130px,.7fr)_minmax(160px,.9fr)_minmax(170px,1fr)_auto]">
          {!isTeacher && !isStudent ? (
            <FilterSelect label={`${viewType} focus`} value={selectedIdentifier || 'all'} onValueChange={(value) => setSelectedIdentifier(value === 'all' ? '' : value)} options={identifierOptions} allLabel={`All ${viewType}s`} />
          ) : <div className="hidden bg-card lg:block" />}
          <FilterInput label="Academic year" value={academicYear} onChange={setAcademicYear} placeholder="2026-2027" />
          <FilterInput label="Term" value={term} onChange={setTerm} placeholder="Term 1" />
          <FilterSelect label="Status" value={status} onValueChange={setStatus} allLabel="All statuses" options={[
            { value: 'ACTIVE', label: 'Active' }, { value: 'SUBSTITUTED', label: 'Substituted' }, { value: 'CANCELLED', label: 'Cancelled' },
          ]} />
          <FilterSelect label="Schedule type" value={scheduleType} onValueChange={setScheduleType} allLabel="All types" options={[
            { value: 'CLASS', label: 'Class periods' }, { value: 'EXAM', label: 'Exams' },
            { value: 'MEETING', label: 'Meetings' }, { value: 'HOLIDAY', label: 'Holidays' },
            { value: 'SPECIAL_EVENT', label: 'Special events' },
          ]} />
          <div className="flex items-end bg-card p-3">
            <Button className="w-full rounded-none" onClick={() => void loadTimetable()} disabled={loading}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />} Apply records
            </Button>
          </div>
        </div>
      </section>

      <section className="grid border border-foreground bg-card sm:grid-cols-2 xl:grid-cols-4" aria-label="Week summary">
        <WeekMeasure label="Published sessions" value={String(activeCount)} note="Active in this date window" />
        <WeekMeasure label="Classes in view" value={String(classCount)} note={`Grouped by ${viewType}`} />
        <WeekMeasure label="Teaching staff" value={String(staffCount)} note="Primary and substitute" />
        <WeekMeasure label="Exceptions" value={String(exceptionCount)} note="Events, exams, substitutions, or cancellations" attention={exceptionCount > 0} />
      </section>

      <section className="timetable-print-area border border-foreground bg-card">
        <header className="grid border-b border-foreground lg:grid-cols-[1fr_auto]">
          <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:px-4">
            <Button variant="ghost" size="icon-sm" aria-label="Previous week" onClick={() => setWeekStart(addCalendarDays(weekStart, -7))} className="print:hidden"><ChevronLeft /></Button>
            <div className="min-w-0 flex-1 text-center lg:text-left">
              <p className="truncate font-mono text-sm font-semibold tabular-nums">{formatTimetableRange(weekDates[0], weekDates[6])}</p>
              <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">Monday start · local school time</p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => setWeekStart(addCalendarDays(weekStart, 7))} className="print:hidden lg:hidden"><ChevronRight /></Button>
          </div>
          <div className="hidden items-center border-l border-foreground lg:flex print:hidden">
            {!isCurrentWeek && <Button variant="ghost" className="h-full rounded-none border-r border-foreground px-4" onClick={() => setWeekStart(mondayOfWeek(new Date()))}>Current week</Button>}
            <Button variant="ghost" size="icon" aria-label="Next week" onClick={() => setWeekStart(addCalendarDays(weekStart, 7))}><ChevronRight /></Button>
          </div>
        </header>

        <div className="hidden overflow-x-auto lg:block print:block" tabIndex={0} role="region" aria-label="Weekly timetable grid">
          <div className="min-w-[1120px] print:min-w-0">
            <div className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] border-b border-foreground bg-muted/35">
              <div className="flex items-end border-r border-foreground px-3 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Time</div>
              {TIMETABLE_DAYS.map((day, index) => {
                const isToday = isSameLocalDate(weekDates[index], new Date());
                return (
                  <div key={day} className={`border-r border-border px-3 py-3 last:border-r-0 ${isToday ? 'bg-academic-gold/22' : ''}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{day.slice(0, 3)}</span>
                      <span className={`font-mono text-sm font-semibold tabular-nums ${isToday ? 'text-academic-gold-foreground' : ''}`}>{formatTimetableDay(weekDates[index])}</span>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">{weekEntries[index].length} item{weekEntries[index].length === 1 ? '' : 's'}</p>
                  </div>
                );
              })}
            </div>

            {loading ? (
              <div className="grid min-h-96 place-items-center"><div className="text-center"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-academic-teal" /><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Reading timetable ledger</p></div></div>
            ) : allVisible.length === 0 ? <EmptyWeek canManage={canManage} /> : (
              <div className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))]">
                <div className="relative border-r border-foreground" style={{ height: gridHeight }}>
                  {hours.map((hour) => <div key={hour} className="absolute right-3 -translate-y-1/2 font-mono text-[10px] tabular-nums text-muted-foreground" style={{ top: (hour - minHour) * 60 * PX_PER_MINUTE }}>{String(hour).padStart(2, '0')}:00</div>)}
                </div>
                {TIMETABLE_DAYS.map((day, index) => {
                  const isToday = isSameLocalDate(weekDates[index], new Date());
                  return (
                    <div key={day} className={`relative border-r border-border last:border-r-0 ${isToday ? 'bg-academic-gold/[0.045]' : ''}`} style={{ height: gridHeight }}>
                      {hours.slice(1).map((hour) => <div key={hour} className="pointer-events-none absolute inset-x-0 border-t border-border/65" style={{ top: (hour - minHour) * 60 * PX_PER_MINUTE }} />)}
                      {isToday && nowTop !== null && <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: nowTop }} aria-hidden="true"><span className="h-2 w-2 -translate-x-1/2 bg-academic-coral" /><span className="h-px flex-1 bg-academic-coral" /></div>}
                      {layoutTimetableDay(weekEntries[index]).map(({ entry, lane, lanes }) => {
                        const top = (toMinutes(entry.startTime) - minHour * 60) * PX_PER_MINUTE;
                        const height = Math.max(38, (toMinutes(entry.endTime) - toMinutes(entry.startTime)) * PX_PER_MINUTE - 2);
                        const width = 100 / lanes;
                        return <div key={entry.id} className="absolute px-0.5 py-px" style={{ top, height, left: `${lane * width}%`, width: `${width}%` }}><ScheduleBlock entry={entry} viewType={viewType} canManage={canManage} compact={height < 72} onDelete={setDeleteTarget} /></div>;
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:hidden print:hidden">
          {loading ? <div className="px-5 py-12 text-center text-sm text-muted-foreground">Reading timetable ledger…</div> : allVisible.length === 0 ? <EmptyWeek canManage={canManage} /> : TIMETABLE_DAYS.map((day, index) => {
            const entries = [...weekEntries[index]].sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (!entries.length) return null;
            const isToday = isSameLocalDate(weekDates[index], new Date());
            return (
              <section key={day} className="border-b border-foreground last:border-b-0">
                <header className={`flex items-center justify-between px-4 py-3 ${isToday ? 'bg-academic-gold/22' : 'bg-muted/35'}`}>
                  <div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{day}</p><p className="mt-0.5 text-sm font-semibold">{formatTimetableDay(weekDates[index])}</p></div>
                  <span className="font-mono text-xs text-muted-foreground">{entries.length} scheduled</span>
                </header>
                <div className="divide-y divide-border">{entries.map((entry) => <ScheduleBlock key={entry.id} entry={entry} viewType={viewType} canManage={canManage} mobile onDelete={setDeleteTarget} />)}</div>
              </section>
            );
          })}
        </div>
      </section>

      <div className="grid border border-foreground bg-card text-xs sm:grid-cols-3 print:hidden">
        <LegendItem marker="border-academic-teal" label="Published teaching or school item" />
        <LegendItem marker="border-academic-gold" label="Substitute or changed assignment" />
        <LegendItem marker="border-academic-coral" label="Cancelled — requires attention" />
      </div>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}>
        <DialogContent className="rounded-none border-foreground" showCloseButton={!deleting}>
          <DialogHeader>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-academic-coral">Permanent timetable change</p>
            <DialogTitle>Delete this schedule item?</DialogTitle>
            <DialogDescription>{deleteTarget ? `${timetableEntryTitle(deleteTarget)} · ${deleteTarget.dayOfWeek} ${deleteTarget.startTime}–${deleteTarget.endTime}` : ''}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" className="rounded-none" disabled={deleting} />}>Keep item</DialogClose>
            <Button variant="destructive" className="rounded-none" onClick={() => void deleteEntry()} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block bg-card p-3"><span className="font-mono text-[9px] uppercase tracking-[0.11em] text-muted-foreground">{label}</span><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 h-8 rounded-none border-0 border-b border-input bg-transparent px-0 shadow-none focus-visible:border-academic-teal focus-visible:ring-0" /></label>;
}

function FilterSelect({ label, value, onValueChange, options, allLabel }: { label: string; value: string; onValueChange: (value: string) => void; options: { value: string; label: string }[]; allLabel: string }) {
  return <div className="bg-card p-3"><p className="font-mono text-[9px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><Select value={value} onValueChange={onValueChange}><SelectTrigger className="mt-1 h-8 w-full rounded-none border-0 border-b border-input px-0 shadow-none focus-visible:ring-0"><SelectValue /></SelectTrigger><SelectContent className="rounded-none"><SelectItem value="all">{allLabel}</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

function WeekMeasure({ label, value, note, attention = false }: { label: string; value: string; note: string; attention?: boolean }) {
  return <div className="border-b border-border px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${attention ? 'text-academic-coral' : 'text-foreground'}`}>{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></div>;
}

function EmptyWeek({ canManage }: { canManage: boolean }) {
  return <div className="grid min-h-80 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><CalendarDays className="mx-auto h-7 w-7 text-academic-teal" /><h2 className="mt-4 text-lg font-semibold">The weekly field is clear</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">No records match this date window and filter set. Change the focus or publish a schedule item.</p>{canManage && <Button className="mt-5 rounded-none" render={<Link to="/timetable/new" />} nativeButton={false}><Plus className="h-4 w-4" /> Add first item</Button>}</div></div>;
}

function ScheduleBlock({ entry, viewType, canManage, onDelete, mobile = false, compact = false }: { entry: TimetableEntry; viewType: 'class' | 'teacher' | 'room'; canManage: boolean; onDelete: (entry: TimetableEntry) => void; mobile?: boolean; compact?: boolean }) {
  const counterpart = viewType === 'teacher' ? entry.className || 'No class' : entry.teacherName || 'Unassigned';
  const DetailIcon = viewType === 'teacher' ? BookOpen : User;
  const cancelled = entry.status === 'CANCELLED';
  if (mobile) {
    return <article className={`grid grid-cols-[74px_minmax(0,1fr)_auto] border-l-4 px-4 py-4 ${eventTone(entry)}`}><div><p className="font-mono text-xs font-semibold tabular-nums">{entry.startTime}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{entry.endTime}</p></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[9px] uppercase tracking-[0.1em] text-academic-teal">{scheduleTypeLabel(entry)}</span>{entry.status && entry.status !== 'ACTIVE' && <span className={cancelled ? 'text-academic-coral' : 'text-academic-gold-foreground'}>· {entry.status}</span>}</div><h3 className={`mt-1 truncate text-sm font-semibold ${cancelled ? 'line-through opacity-70' : ''}`}>{timetableEntryTitle(entry)}</h3><p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{entry.room || 'No room'}</span><span className="inline-flex items-center gap-1"><DetailIcon className="h-3.5 w-3.5" />{counterpart}</span></p></div>{canManage && <ScheduleMenu entry={entry} onDelete={onDelete} />}</article>;
  }
  return <article className={`group relative h-full overflow-hidden border-l-[3px] border-y border-r px-2 py-1.5 transition-colors hover:bg-accent/45 ${eventTone(entry)}`}><div className="flex items-start justify-between gap-1"><p className="font-mono text-[9px] font-semibold uppercase tracking-[0.06em] tabular-nums text-muted-foreground">{entry.startTime}–{entry.endTime}</p>{canManage && !compact && <ScheduleMenu entry={entry} onDelete={onDelete} compact />}</div><h3 className={`truncate font-semibold leading-tight ${compact ? 'mt-0.5 text-[11px]' : 'mt-1 text-xs'} ${cancelled ? 'line-through opacity-65' : ''}`}>{timetableEntryTitle(entry)}</h3>{!compact && <div className="mt-1.5 space-y-1 text-[10px] leading-tight text-muted-foreground"><p className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{entry.room || 'No room'}</p><p className="flex items-center gap-1 truncate"><DetailIcon className="h-3 w-3 shrink-0" />{counterpart}</p><p className="truncate font-mono text-[8px] uppercase tracking-[0.08em] text-academic-teal">{scheduleTypeLabel(entry)}{entry.status && entry.status !== 'ACTIVE' ? ` · ${entry.status}` : ''}</p></div>}</article>;
}

function ScheduleMenu({ entry, onDelete, compact = false }: { entry: TimetableEntry; onDelete: (entry: TimetableEntry) => void; compact?: boolean }) {
  return <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" className={`${compact ? 'opacity-0 group-hover:opacity-100 focus:opacity-100' : ''} print:hidden`} />} nativeButton={true}><MoreVertical className="h-3.5 w-3.5" /><span className="sr-only">Actions for {timetableEntryTitle(entry)}</span></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40 rounded-none"><DropdownMenuItem render={<Link to={`/timetable/${entry.id}/edit`} className="flex w-full items-center" />}><Edit className="mr-2 h-3.5 w-3.5" /> Edit item</DropdownMenuItem><DropdownMenuItem className="text-academic-coral" onClick={() => onDelete(entry)}><Trash2 className="mr-2 h-3.5 w-3.5" /> Delete item</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}

function LegendItem({ marker, label }: { marker: string; label: string }) {
  return <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><span className={`h-5 w-3 border-l-4 ${marker}`} aria-hidden="true" /><span className="text-muted-foreground">{label}</span></div>;
}
