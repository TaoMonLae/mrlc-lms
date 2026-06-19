import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AnnouncementForm } from '@/src/components/announcements/AnnouncementForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { Announcement, MOCK_ANNOUNCEMENTS } from './AnnouncementsList';

const getAnnouncement = (id: string): Announcement | undefined => {
  return MOCK_ANNOUNCEMENTS.find(a => a.id === id);
};

export default function AnnouncementEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (id) {
      const data = getAnnouncement(id);
      if (data) {
        setAnnouncement(data);
      } else {
        toast.error('Announcement not found');
        navigate('/announcements');
      }
    }
  }, [id, navigate]);

  const handleSubmit = (values: any) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Announcement updated successfully');
      navigate('/announcements');
    }, 1500);
  };

  if (!announcement) return null;

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
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Announcement</h1>
            </div>
            <p className="text-sm text-slate-500">Modify the existing broadcast details.</p>
          </div>
        </div>
      </div>

      <AnnouncementForm initialData={announcement} onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
