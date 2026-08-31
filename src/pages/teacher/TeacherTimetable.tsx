import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3, Download, Filter,
  MapPin, Plus, Printer, RefreshCw, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { apiGet } from '../../lib/api';
import {
  TIMETABLE_DAYS, addCalendarDays, csvCell, formatTimetableDay,
  formatTimetableRange, isSameLocalDate, layoutTimetableDay, mondayOfWeek,
  occursOn, timetableEntryTitle, toMinutes, type DayOfWeek, type TimetableEntry,
} from '../../lib/timetable';

const TEACHING_DAYS = TIMETABLE_DAYS.slice(0, 6);
const PX_PER_MINUTE = 1;
const API_DAY: Record<string, DayOfWeek> = {
  MONDAY: 'Monday', TUESDAY: 'Tuesday', WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday', FRIDAY: 'Friday', SATURDAY: 'Saturday', SUNDAY: 'Sunday',
};

function normalizeEntry(entry: TimetableEntry): TimetableEntry {
  return { ...entry, dayOfWeek: API_DAY[String(entry.dayOfWeek).toUpperCase()] || entry.dayOfWeek };
}

function teachingTone(entry: TimetableEntry) {
  if (entry.status === 'CANCELLED') return 'border-academic-coral bg-academic-coral/10';
  if (entry.status === 'SUBSTITUTED') return 'border-academic-gold bg-academic-gold/14';
  return 'border-academic-teal bg-card';
}

export default function TeacherTimetable() {
  const [view, setView] = useState<'week' | 'day'>('week');
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek;
    return TEACHING_DAYS.includes(today) ? today : 'Monday';
  });
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [schedule, setSchedule] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiGet<TimetableEntry[]>('/api/timetable')
      .then((rows) => {
        if (!active) return;
        setSchedule((rows || []).map(normalizeEntry));
        setError('');
      })
      .catch(() => {
        if (!active) return;
        setSchedule([]);
        setError('Your teaching schedule could not be read.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const weekDates = useMemo(
    () => TEACHING_DAYS.map((_, index) => addCalendarDays(weekStart, index)),
    [weekStart],
  );

  const weekEntries = useMemo(
    () => TEACHING_DAYS.map((day, index) => schedule.filter((entry) => (
      entry.dayOfWeek === day
      && occursOn(entry, weekDates[index])
      && (typeFilter === 'ALL' || (entry.scheduleType || 'CLASS') === typeFilter)
      && (statusFilter === 'ALL' || (entry.status || 'ACTIVE') === statusFilter)
    ))),
    [schedule, statusFilter, typeFilter, weekDates],
  );
  const allVisible = weekEntries.flat();
  const displayedDays = view === 'day' ? [selectedDay] : TEACHING_DAYS;
  const displayedIndexes = displayedDays.map((day) => TEACHING_DAYS.indexOf(day));
  const displayedEntries = displayedIndexes.map((index) => weekEntries[index]);

  const minHour = allVisible.length ? Math.floor(Math.min(...allVisible.map((entry) => toMinutes(entry.startTime))) / 60) : 8;
  const maxHour = allVisible.length ? Math.ceil(Math.max(...allVisible.map((entry) => toMinutes(entry.endTime))) / 60) : 16;
  const gridHeight = Math.max(1, maxHour - minHour) * 60 * PX_PER_MINUTE;
  const hours = Array.from({ length: Math.max(1, maxHour - minHour) + 1 }, (_, index) => minHour + index);
  const weeklyHours = allVisible
    .filter((entry) => entry.status !== 'CANCELLED' && ['CLASS', 'EXAM'].includes(entry.scheduleType || 'CLASS'))
    .reduce((sum, entry) => sum + Math.max(0, toMinutes(entry.endTime) - toMinutes(entry.startTime)) / 60, 0);
  const activeClasses = new Set(allVisible.map((entry) => entry.classId).filter(Boolean)).size;
  const exceptionCount = allVisible.filter((entry) => entry.status !== 'ACTIVE' || (entry.scheduleType && entry.scheduleType !== 'CLASS')).length;

  const upcoming = useMemo(() => {
    const today = new Date();
    const todayIndex = TEACHING_DAYS.indexOf(today.toLocaleDateString('en-US', { weekday: 'long' }) as DayOfWeek);
    const currentWeek = isSameLocalDate(weekStart, mondayOfWeek(today));
    const firstDay = currentWeek && todayIndex >= 0 ? todayIndex : 0;
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    for (let index = firstDay; index < TEACHING_DAYS.length; index += 1) {
      const candidate = weekEntries[index]
        .filter((entry) => entry.status !== 'CANCELLED' && (!currentWeek || index !== todayIndex || toMinutes(entry.startTime) >= nowMinutes))
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))[0];
      if (candidate) return { entry: candidate, date: weekDates[index] };
    }
    return null;
  }, [weekEntries, weekDates, weekStart]);

  const exportCsv = () => {
    const rows = allVisible.map((entry) => {
      const dayIndex = TEACHING_DAYS.indexOf(entry.dayOfWeek);
      return [
        csvCell(weekDates[dayIndex]?.toLocaleDateString('en-CA')),
        csvCell(entry.dayOfWeek), csvCell(entry.startTime), csvCell(entry.endTime),
        csvCell(timetableEntryTitle(entry)), csvCell(entry.className), csvCell(entry.room), csvCell(entry.status || 'ACTIVE'),
      ].join(',');
    });
    const header = ['Date', 'Day', 'Start', 'End', 'Session', 'Class', 'Room', 'Status'].map(csvCell).join(',');
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `teaching-schedule-${weekStart.toLocaleDateString('en-CA')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Visible teaching week exported');
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-12">
      <header className="flex flex-col gap-5 border-b border-foreground pb-5 lg:flex-row lg:items-end lg:justify-between print:hidden">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-academic-teal">Teacher desk / Personal field plan</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Teaching timetable</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">A date-true view of your classes, rooms, changes, and the next roll call.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="rounded-none border-foreground" onClick={() => window.print()}><Printer /> Print week</Button>
          <Button variant="outline" className="rounded-none border-foreground" onClick={exportCsv} disabled={!allVisible.length}><Download /> Export visible</Button>
          <Button className="rounded-none" onClick={() => navigate('/timetable/new')}><Plus /> Schedule session</Button>
        </div>
      </header>

      <section className="grid border border-foreground bg-card sm:grid-cols-2 xl:grid-cols-4" aria-label="Teaching week summary">
        <Measure label="Teaching load" value={`${weeklyHours.toFixed(1)}h`} note="Classes and exams in view" />
        <Measure label="Sessions" value={String(allVisible.length)} note="Matching this date window" />
        <Measure label="Active classes" value={String(activeClasses)} note="Distinct class groups" />
        <Measure label="Exceptions" value={String(exceptionCount)} note="Changes or non-class items" attention={exceptionCount > 0} />
      </section>

      {error && <div className="border border-academic-coral bg-card px-5 py-4 text-sm text-academic-coral" role="alert">{error}</div>}

      <section className="timetable-print-area border border-foreground bg-card">
        <div className="hidden print:block border-b border-slate-900 px-4 py-3"><p className="text-lg font-semibold">Teaching timetable</p><p className="text-xs">{formatTimetableRange(weekDates[0], weekDates[5])}</p></div>
        <header className="grid border-b border-foreground lg:grid-cols-[auto_1fr_auto] print:hidden">
          <div className="grid grid-cols-2 border-b border-foreground lg:border-b-0 lg:border-r">
            {(['week', 'day'] as const).map((option) => <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`min-h-11 px-5 font-mono text-[10px] uppercase tracking-[0.1em] ${view === option ? 'bg-academic-gold text-academic-navy-deep' : 'hover:bg-muted/45'}`}>{option}</button>)}
          </div>
          <div className="flex items-center justify-center gap-2 px-3 py-2">
            <Button variant="ghost" size="icon-sm" aria-label="Previous week" onClick={() => setWeekStart(addCalendarDays(weekStart, -7))}><ChevronLeft /></Button>
            <p className="min-w-0 flex-1 truncate text-center font-mono text-sm font-semibold tabular-nums">{formatTimetableRange(weekDates[0], weekDates[5])}</p>
            <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => setWeekStart(addCalendarDays(weekStart, 7))}><ChevronRight /></Button>
          </div>
          <Button variant="ghost" className="h-full rounded-none border-t border-foreground px-4 lg:border-l lg:border-t-0" onClick={() => setShowFilters((value) => !value)} aria-expanded={showFilters}><Filter /> Filters</Button>
        </header>

        {(showFilters || view === 'day') && (
          <div className="grid gap-px border-b border-foreground bg-border sm:grid-cols-3 print:hidden">
            {view === 'day' && <FieldSelect label="Day focus" value={selectedDay} onValueChange={(value) => setSelectedDay(value as DayOfWeek)} options={TEACHING_DAYS.map((day) => ({ value: day, label: day }))} />}
            {showFilters && <FieldSelect label="Schedule type" value={typeFilter} onValueChange={setTypeFilter} options={[{ value: 'ALL', label: 'All types' }, ...Array.from(new Set(schedule.map((entry) => entry.scheduleType || 'CLASS'))).sort().map((type) => ({ value: type, label: type.replaceAll('_', ' ') }))]} />}
            {showFilters && <FieldSelect label="Status" value={statusFilter} onValueChange={setStatusFilter} options={[{ value: 'ALL', label: 'All statuses' }, ...Array.from(new Set(schedule.map((entry) => entry.status || 'ACTIVE'))).sort().map((status) => ({ value: status, label: status }))]} />}
          </div>
        )}

        {loading ? (
          <div className="grid min-h-96 place-items-center"><div className="text-center"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-academic-teal" /><p className="mt-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Reading teaching ledger</p></div></div>
        ) : allVisible.length === 0 ? (
          <div className="grid min-h-80 place-items-center px-6 py-12 text-center"><div className="max-w-sm"><CalendarDays className="mx-auto h-7 w-7 text-academic-teal" /><h2 className="mt-4 text-lg font-semibold">No sessions in this week</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The date window and filters contain no teaching records.</p></div></div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Teaching timetable grid">
            <div className={view === 'week' ? 'min-w-[980px] print:min-w-0' : 'min-w-0'}>
              <div className="grid border-b border-foreground bg-muted/35" style={{ gridTemplateColumns: `70px repeat(${displayedDays.length}, minmax(0, 1fr))` }}>
                <div className="border-r border-foreground px-3 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Time</div>
                {displayedDays.map((day, position) => {
                  const index = displayedIndexes[position];
                  const today = isSameLocalDate(weekDates[index], new Date());
                  return <div key={day} className={`border-r border-border px-3 py-3 last:border-r-0 ${today ? 'bg-academic-gold/22' : ''}`}><div className="flex items-baseline justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{day.slice(0, 3)}</span><span className="font-mono text-sm font-semibold">{formatTimetableDay(weekDates[index])}</span></div><p className="mt-2 text-[10px] text-muted-foreground">{displayedEntries[position].length} sessions</p></div>;
                })}
              </div>
              <div className="grid" style={{ gridTemplateColumns: `70px repeat(${displayedDays.length}, minmax(0, 1fr))` }}>
                <div className="relative border-r border-foreground" style={{ height: gridHeight }}>{hours.map((hour) => <span key={hour} className="absolute right-3 -translate-y-1/2 font-mono text-[10px] text-muted-foreground" style={{ top: (hour - minHour) * 60 }}>{String(hour).padStart(2, '0')}:00</span>)}</div>
                {displayedDays.map((day, position) => <div key={day} className="relative border-r border-border last:border-r-0" style={{ height: gridHeight }}>{hours.slice(1).map((hour) => <span key={hour} className="absolute inset-x-0 border-t border-border/65" style={{ top: (hour - minHour) * 60 }} />)}{layoutTimetableDay(displayedEntries[position]).map(({ entry, lane, lanes }) => { const top = (toMinutes(entry.startTime) - minHour * 60) * PX_PER_MINUTE; const height = Math.max(40, (toMinutes(entry.endTime) - toMinutes(entry.startTime)) * PX_PER_MINUTE - 2); return <button key={entry.id} type="button" onClick={() => entry.classId && navigate(`/teacher/classes/${entry.classId}`)} disabled={!entry.classId} className={`absolute overflow-hidden border-l-[3px] border-y border-r px-2 py-1.5 text-left transition-colors hover:bg-accent/45 disabled:cursor-default ${teachingTone(entry)}`} style={{ top, height, left: `${lane * (100 / lanes)}%`, width: `${100 / lanes}%` }}><p className="font-mono text-[9px] text-muted-foreground">{entry.startTime}–{entry.endTime}</p><p className={`mt-1 truncate text-xs font-semibold ${entry.status === 'CANCELLED' ? 'line-through opacity-65' : ''}`}>{timetableEntryTitle(entry)}</p>{height >= 70 && <><p className="mt-1 truncate text-[10px] text-muted-foreground">{entry.className || 'School item'}</p><p className="mt-1 flex items-center gap-1 truncate text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" />{entry.room || 'No room'}</p></>}</button>; })}</div>)}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(300px,.65fr)_minmax(0,1.35fr)] print:hidden">
        <section className="border border-foreground bg-academic-navy-deep text-white">
          <header className="border-b border-white/30 px-5 py-4"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6dd4cb]">Next field action</p><h2 className="mt-1 text-lg font-semibold">Upcoming session</h2></header>
          {upcoming ? <div className="px-5 py-5"><p className="font-mono text-xs text-academic-gold">{formatTimetableDay(upcoming.date)} · {upcoming.entry.startTime}</p><h3 className="mt-3 text-xl font-semibold">{timetableEntryTitle(upcoming.entry)}</h3><p className="mt-3 flex flex-wrap gap-4 text-xs text-white/65"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{upcoming.entry.className || 'School item'}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{upcoming.entry.room || 'No room'}</span></p><Button className="mt-5 w-full rounded-none" onClick={() => navigate('/teacher/attendance')}>Open roll call</Button></div> : <p className="px-5 py-8 text-sm text-white/65">No upcoming session in this date window.</p>}
        </section>
        <section className="border border-foreground bg-card">
          <header className="border-b border-foreground px-5 py-4"><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-academic-teal">Workload reading</p><h2 className="mt-1 text-lg font-semibold">What this week means</h2></header>
          <div className="grid sm:grid-cols-3"><Interpretation label="Teaching days" value={String(weekEntries.filter((entries) => entries.some((entry) => entry.status !== 'CANCELLED')).length)} note="Days with active duty" /><Interpretation label="Earliest start" value={allVisible.length ? allVisible.reduce((earliest, entry) => entry.startTime < earliest ? entry.startTime : earliest, allVisible[0].startTime) : '—'} note="Across visible records" /><Interpretation label="Latest finish" value={allVisible.length ? allVisible.reduce((latest, entry) => entry.endTime > latest ? entry.endTime : latest, allVisible[0].endTime) : '—'} note="Across visible records" /></div>
        </section>
      </div>

      <style>{`@media print { body * { visibility: hidden; } .timetable-print-area, .timetable-print-area * { visibility: visible; } .timetable-print-area { position: absolute; inset: 0; width: 100%; } @page { size: A4 landscape; margin: 10mm; } }`}</style>
    </div>
  );
}

function Measure({ label, value, note, attention = false }: { label: string; value: string; note: string; attention?: boolean }) {
  return <div className="border-b border-border px-4 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${attention ? 'text-academic-coral' : ''}`}>{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></div>;
}

function FieldSelect({ label, value, onValueChange, options }: { label: string; value: string; onValueChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <div className="bg-card p-3"><p className="font-mono text-[9px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><Select value={value} onValueChange={onValueChange}><SelectTrigger className="mt-1 h-8 w-full rounded-none border-0 border-b border-input px-0 focus-visible:ring-0"><SelectValue /></SelectTrigger><SelectContent className="rounded-none">{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div>;
}

function Interpretation({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="border-b border-border px-5 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><p className="font-mono text-[9px] uppercase tracking-[0.11em] text-muted-foreground">{label}</p><p className="mt-2 font-mono text-xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div>;
}
