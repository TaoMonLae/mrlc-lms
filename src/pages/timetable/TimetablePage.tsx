import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
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
  eventDate?: string | null;
  notes?: string | null;
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const entryTitle = (entry: TimetableEntry) => {
  if (entry.scheduleType === 'HOLIDAY') return entry.notes || 'School Holiday';
  if (entry.scheduleType === 'SPECIAL_EVENT') return entry.notes || 'Special Event';
  return entry.subjectName || entry.subjectId || 'Scheduled Period';
};

const colorClass = (entry: TimetableEntry) => {
  if (entry.status === 'CANCELLED') return 'bg-slate-500';
  if (entry.scheduleType === 'HOLIDAY') return 'bg-rose-500';
  if (entry.scheduleType === 'SPECIAL_EVENT') return 'bg-amber-500';
  if (entry.scheduleType === 'EXAM') return 'bg-purple-500';
  if (entry.scheduleType === 'MEETING') return 'bg-cyan-500';
  return entry.subjectColor || 'bg-blue-500';
};

export default function TimetablePage() {
  const [viewType, setViewType] = useState<'class' | 'teacher' | 'room'>('class');
  const [selectedIdentifier, setSelectedIdentifier] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [scheduleType, setScheduleType] = useState('all');
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, hasPermission, isTeacher, isStudent } = usePermissions();

  const canManage = isAdmin || hasPermission('manage_timetable');

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
      if (!selectedIdentifier && data.length > 0 && !isTeacher && !isStudent) {
        setSelectedIdentifier(data[0].className || data[0].classId || '');
      }
    } catch (error) {
      console.error('Error fetching timetable:', error);
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, []);

  const identifiers = useMemo(() => {
    const values = timetable.map((entry) => {
      if (viewType === 'teacher') return entry.teacherName || entry.teacherId || '';
      if (viewType === 'room') return entry.room || '';
      return entry.className || entry.classId || '';
    });
    return Array.from(new Set(values)).filter(Boolean);
  }, [timetable, viewType]);

  useEffect(() => {
    if (identifiers.length > 0 && !identifiers.includes(selectedIdentifier) && !isTeacher && !isStudent) {
      setSelectedIdentifier(identifiers[0]);
    }
  }, [identifiers, selectedIdentifier, isTeacher, isStudent]);

  const filteredTimetable = useMemo(() => {
    if (isTeacher || isStudent) return timetable;
    if (!selectedIdentifier) return timetable;
    return timetable.filter((entry) => {
      if (viewType === 'teacher') return (entry.teacherName || entry.teacherId) === selectedIdentifier;
      if (viewType === 'room') return entry.room === selectedIdentifier;
      return (entry.className || entry.classId) === selectedIdentifier;
    });
  }, [timetable, selectedIdentifier, viewType, isTeacher, isStudent]);

  const timeSlots = useMemo(() => Array.from(new Set(filteredTimetable.map((entry) => entry.startTime))).sort(), [filteredTimetable]);

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
        <p className="text-sm">{academicYear || 'All years'} - {term || 'All terms'} - {selectedIdentifier || 'My schedule'}</p>
      </div>

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
              {identifiers.map((name) => (
                <option key={name} value={name}>{name}</option>
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

      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo lg:block print:block print:border-slate-300">
        <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-surface-raised dark:bg-surface-raised/50">
          <div className="border-r border-slate-200 p-3 dark:border-surface-raised">Time</div>
          {DAYS.map((day) => (
            <div key={day} className="border-r border-slate-200 p-3 last:border-r-0 dark:border-surface-raised">{day}</div>
          ))}
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading timetable...</div>
        ) : timeSlots.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">No timetable entries found.</div>
        ) : (
          timeSlots.map((time) => (
            <div key={time} className="grid min-h-[108px] grid-cols-8 border-b border-slate-100 last:border-b-0 dark:border-surface-raised/50">
              <div className="border-r border-slate-200 p-3 text-center text-xs font-bold text-slate-400 dark:border-surface-raised">{time}</div>
              {DAYS.map((day) => {
                const entries = filteredTimetable.filter((entry) => entry.dayOfWeek === day && entry.startTime === time);
                return (
                  <div key={`${day}-${time}`} className="space-y-2 border-r border-slate-100 p-1 last:border-r-0 dark:border-surface-raised/50">
                    {entries.map((entry) => (
                      <ScheduleCard key={entry.id} entry={entry} viewType={viewType} canManage={canManage} onDelete={handleDelete} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="space-y-4 lg:hidden print:hidden">
        {DAYS.map((day) => {
          const entries = filteredTimetable.filter((entry) => entry.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
          if (entries.length === 0) return null;
          return (
            <section key={day} className="space-y-3">
              <h2 className="border-l-4 border-aubergine-500 pl-2 text-sm font-bold uppercase tracking-widest text-slate-500">{day}</h2>
              {entries.map((entry) => <ScheduleCard key={entry.id} entry={entry} viewType={viewType} canManage={canManage} onDelete={handleDelete} mobile />)}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleCard({ entry, viewType, canManage, onDelete, mobile = false }: {
  entry: TimetableEntry;
  viewType: 'class' | 'teacher' | 'room';
  canManage: boolean;
  onDelete: (id: string) => void;
  mobile?: boolean;
}) {
  return (
    <div className={`${colorClass(entry)} rounded-lg p-3 text-white shadow-sm ${mobile ? 'flex gap-3' : 'min-h-[92px]'} print:bg-white print:text-slate-900 print:shadow-none print:ring-1 print:ring-slate-300`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-85">{entry.startTime} - {entry.endTime}</p>
          <Badge variant="outline" className="h-5 border-white/40 bg-white/10 text-[10px] text-white print:border-slate-300 print:text-slate-700">
            {entry.status || 'ACTIVE'}
          </Badge>
        </div>
        <h3 className="mt-1 truncate text-sm font-bold">{entryTitle(entry)}</h3>
        <div className="mt-2 space-y-1 text-[11px] opacity-90">
          <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{entry.room || 'No room'}</p>
          <p className="flex items-center gap-1">
            {viewType === 'teacher' ? <BookOpen className="h-3 w-3" /> : <User className="h-3 w-3" />}
            {viewType === 'teacher' ? entry.className || entry.classId : entry.teacherName || 'Unassigned'}
          </p>
          {entry.substituteTeacherName && <p>Sub: {entry.substituteTeacherName}</p>}
          {entry.scheduleType && entry.scheduleType !== 'CLASS' && <p>{entry.scheduleType.replaceAll('_', ' ')}</p>}
          {entry.cancellationReason && <p>Reason: {entry.cancellationReason}</p>}
        </div>
      </div>
      {canManage && (
        <div className="print:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" />}>
              <MoreVertical className="h-4 w-4" />
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
