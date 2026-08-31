import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { TimetableForm } from '@/src/components/timetable/TimetableForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
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
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <header className="flex items-start gap-4 border-b border-foreground pb-5">
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link to={backUrl} />}
          nativeButton={false}
          className="mt-1 rounded-none border-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to timetable</span>
        </Button>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-academic-teal">Timetable / New field entry</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Publish a schedule item</h1>
          <p className="mt-2 text-sm text-muted-foreground">Assign the people, place, teaching period, and effective date window.</p>
        </div>
      </header>

      <TimetableForm onSubmit={handleSubmit} isLoading={isLoading} defaultClassId={classId} />
    </div>
  );
}
