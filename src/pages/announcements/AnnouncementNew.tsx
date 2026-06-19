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

  const handleSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to publish announcement');
      }
      toast.success('Announcement published successfully');
      navigate('/announcements');
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish announcement');
    } finally {
      setIsLoading(false);
    }
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
