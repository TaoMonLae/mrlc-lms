import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { TimetableForm } from '@/src/components/timetable/TimetableForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { TimetableEntry } from './TimetablePage';

export default function TimetableEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [timetableItem, setTimetableItem] = useState<TimetableEntry | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchItem = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/timetable/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.error('Schedule item not found');
          navigate('/timetable');
          return;
        }
        setTimetableItem(await res.json());
      } catch (error) {
        console.error('Error fetching timetable item:', error);
        toast.error('Failed to load schedule item');
      }
    };
    fetchItem();
  }, [id, navigate]);

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/timetable/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const details = Array.isArray(err.conflicts) ? `: ${err.conflicts.map((conflict: any) => conflict.message).join(', ')}` : '';
        throw new Error(`${err.error || 'Failed to update schedule item'}${details}`);
      }
      toast.success('Schedule item updated successfully');
      navigate('/timetable');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update schedule item');
    } finally {
      setIsLoading(false);
    }
  };

  if (!timetableItem) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12">
      <header className="flex items-start gap-4 border-b border-foreground pb-5">
        <Button 
          variant="outline"
          size="icon-sm"
          render={<Link to="/timetable" />}
          nativeButton={false}
          className="mt-1 rounded-none border-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to timetable</span>
        </Button>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-academic-teal">Timetable / Revise field entry</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Revise a schedule item</h1>
          <p className="mt-2 text-sm text-muted-foreground">Change timing, assignment, status, or the item’s effective date window.</p>
        </div>
      </header>

      <TimetableForm initialData={timetableItem} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
