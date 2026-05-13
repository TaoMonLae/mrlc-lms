import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { TimetableForm } from '@/src/components/timetable/TimetableForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { TimetableEntry } from './TimetablePage';

// Mock fetching function
const getTimetableItem = (id: string): TimetableEntry | undefined => {
  const mockData: TimetableEntry[] = [
    {
      id: 't1',
      classId: 'c1',
      className: 'Grade 10A',
      subjectId: 's1',
      subjectName: 'Mathematics',
      subjectColor: 'bg-blue-500',
      teacherId: 't1',
      teacherName: 'John Smith',
      dayOfWeek: 'Monday',
      startTime: '08:00',
      endTime: '09:30',
      room: 'Room 302',
    }
  ];
  return mockData.find(t => t.id === id);
};

export default function TimetableEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [timetableItem, setTimetableItem] = useState<TimetableEntry | null>(null);

  useEffect(() => {
    if (id) {
      const data = getTimetableItem(id);
      if (data) {
        setTimetableItem(data);
      } else {
        toast.error('Schedule item not found');
        navigate('/timetable');
      }
    }
  }, [id, navigate]);

  const handleSubmit = (values: any) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      console.log('Updated Timetable Slot:', values);
      setIsLoading(false);
      toast.success('Schedule item updated successfully');
      navigate('/timetable');
    }, 1000);
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
          className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Schedule Item</h1>
          </div>
          <p className="text-sm text-slate-500">Modify the timing or assignment for this timetable slot.</p>
        </div>
      </div>

      <TimetableForm initialData={timetableItem} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
