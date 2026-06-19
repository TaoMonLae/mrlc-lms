import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AnnouncementForm } from '@/src/components/announcements/AnnouncementForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { Announcement } from './AnnouncementsList';

export default function AnnouncementEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAnnouncement = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/announcements/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          toast.error('Announcement not found');
          navigate('/announcements');
          return;
        }
        setAnnouncement(await res.json());
      } catch (error) {
        console.error('Error fetching announcement:', error);
        toast.error('Failed to load announcement');
      }
    };
    fetchAnnouncement();
  }, [id, navigate]);

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update announcement');
      }
      toast.success('Announcement updated successfully');
      navigate('/announcements');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update announcement');
    } finally {
      setIsLoading(false);
    }
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
