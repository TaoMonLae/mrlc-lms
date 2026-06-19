import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnnouncementForm } from '@/src/components/announcements/AnnouncementForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function AnnouncementNew() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (values: any) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Announcement published successfully');
      navigate('/announcements');
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            render={<Link to="/announcements" />}
            className="rounded-full hover:bg-slate-100 dark:hover:bg-surface-raised"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-aubergine-600" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create Announcement</h1>
            </div>
            <p className="text-sm text-slate-500">Draft and publish a new broadcast to the school community.</p>
          </div>
        </div>
      </div>

      <AnnouncementForm onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
