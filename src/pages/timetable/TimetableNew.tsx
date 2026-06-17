import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TimetableForm } from '@/src/components/timetable/TimetableForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function TimetableNew() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (values: any) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      console.log('New Timetable Slot:', values);
      setIsLoading(false);
      toast.success('Schedule item created successfully');
      navigate('/timetable');
    }, 1000);
  };

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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">New Schedule Item</h1>
          </div>
          <p className="text-sm text-slate-500">Add a new subject slot to the weekly timetable.</p>
        </div>
      </div>

      <TimetableForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
