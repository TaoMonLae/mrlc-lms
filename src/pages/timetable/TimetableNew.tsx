import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TimetableForm } from '@/src/components/timetable/TimetableForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function TimetableNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Allows deep-linking here from a Class Profile page (e.g. "/timetable/new?classId=...")
  // so the class is pre-selected and the user is returned to that class afterward.
  const classId = searchParams.get('classId') || undefined;
  const backUrl = classId ? `/classes/${classId}` : '/timetable';
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    // One entry per selected day (falls back to the single dayOfWeek).
    const days: string[] = Array.isArray(values.daysOfWeek) && values.daysOfWeek.length
      ? values.daysOfWeek
      : [values.dayOfWeek];
    try {
      const token = sessionStorage.getItem('auth_token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
      let created = 0;
      const failures: string[] = [];

      for (const day of days) {
        const { daysOfWeek, ...rest } = values;
        const res = await fetch('/api/timetable', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...rest, dayOfWeek: day }),
        });
        if (res.ok) {
          created++;
        } else {
          const err = await res.json().catch(() => ({}));
          const details = Array.isArray(err.conflicts)
            ? `: ${err.conflicts.map((c: any) => c.message).join(', ')}`
            : '';
          failures.push(`${day.slice(0, 3)} — ${err.error || 'failed'}${details}`);
        }
      }

      if (created > 0) {
        toast.success(
          days.length > 1
            ? `Created ${created} of ${days.length} day${days.length > 1 ? 's' : ''}${failures.length ? ` (${failures.length} skipped)` : ''}`
            : 'Schedule item created successfully'
        );
      }
      if (failures.length) {
        toast.error(failures.join(' · '));
      }
      if (created > 0) navigate(backUrl);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create schedule item');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          render={<Link to={backUrl} />}
          nativeButton={false}
          className="rounded-full hover:bg-slate-100 dark:hover:bg-surface-raised"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-aubergine-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">New Schedule Item</h1>
          </div>
          <p className="text-sm text-slate-500">Add a new subject slot to the weekly timetable.</p>
        </div>
      </div>

      <TimetableForm onSubmit={handleSubmit} isLoading={isLoading} defaultClassId={classId} />
    </div>
  );
}
