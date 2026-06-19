import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { TimetableForm } from '@/src/components/timetable/TimetableForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays } from 'lucide-react';
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
        throw new Error(err.error || 'Failed to update schedule item');
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          render={<Link to="/timetable" />}
          nativeButton={false}
          className="rounded-full hover:bg-slate-100 dark:hover:bg-surface-raised"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-aubergine-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Schedule Item</h1>
          </div>
          <p className="text-sm text-slate-500">Modify the timing or assignment for this timetable slot.</p>
        </div>
      </div>

      <TimetableForm initialData={timetableItem} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
