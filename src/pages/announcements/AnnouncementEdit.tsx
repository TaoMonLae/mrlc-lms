import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AnnouncementForm } from '@/src/components/announcements/AnnouncementForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { Announcement } from './AnnouncementsList';

// Mock fetching function
const getAnnouncement = (id: string): Announcement | undefined => {
  const data: Announcement[] = [
    {
      id: 'ann-1',
      title: 'School Reopening & Safety Guidelines',
      body: 'Welcome back students! Please read the attached safety guidelines for the upcoming semester. We prioritize your health and safety above all else. Daily temperature checks will be mandatory...',
      audience: 'ALL',
      pinned: true,
      createdById: 'u1',
      createdByName: 'Admin User',
      status: 'ACTIVE',
      createdAt: '2025-05-01T08:00:00Z',
      updatedAt: '2025-05-01T08:00:00Z',
    },
    {
      id: 'ann-2',
      title: 'Final Exam Schedule - Term 1',
      body: 'The final exam schedule for Term 1 has been released. Please check your student portal for specific timings and room assignments. Ensure you arrive at least 15 minutes before the start time.',
      audience: 'STUDENTS',
      pinned: true,
      expiresAt: '2025-06-15T23:59:59Z',
      createdById: 'u1',
      createdByName: 'Admin User',
      status: 'ACTIVE',
      createdAt: '2025-05-10T10:30:00Z',
      updatedAt: '2025-05-10T10:30:00Z',
    },
    {
      id: 'ann-3',
      title: 'Staff Meeting: Curriculum Development',
      body: 'Reminder for all teaching staff about our monthly meeting regarding curriculum updates and student progress reporting. We will be discussing the new integration of digital assessment tools.',
      audience: 'TEACHERS',
      pinned: false,
      createdById: 'u1',
      createdByName: 'Admin User',
      status: 'ACTIVE',
      createdAt: '2025-05-12T14:00:00Z',
      updatedAt: '2025-05-12T14:00:00Z',
    }
  ];
  return data.find(a => a.id === id);
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
    // Simulate API call
    setTimeout(() => {
      console.log('Updated Announcement:', values);
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
