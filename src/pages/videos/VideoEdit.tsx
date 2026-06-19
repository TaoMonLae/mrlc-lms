import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Info } from 'lucide-react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { VideoLesson } from './VideoList';

const videoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  videoUrl: z.string().url('Must be a valid URL'),
  thumbnailUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  duration: z.coerce.number().int().min(0).optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  visibility: z.enum(['ALL', 'STUDENTS', 'TEACHERS_ONLY']),
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']),
});

type FormValues = z.infer<typeof videoSchema>;

const MOCK_VIDEOS: VideoLesson[] = import.meta.env.DEV ? [
  {
    id: 'v1',
    title: 'Introduction to GED Mathematics',
    description: 'An overview of the key mathematical concepts you will need for the GED exam.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 1845,
    subjectName: 'Mathematics',
    visibility: 'ALL',
    status: 'PUBLISHED',
    uploadedById: 'u1',
    uploadedByName: 'System User',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
  {
    id: 'v2',
    title: 'Reading Comprehension Strategies',
    description: 'Learn how to tackle reading comprehension passages in the GED RLA section.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 2310,
    subjectName: 'English Language Arts',
    visibility: 'STUDENTS',
    status: 'PUBLISHED',
    uploadedById: 't1',
    uploadedByName: 'Ms. Naw Htwe',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 'v3',
    title: 'Science: Ecosystems & Biodiversity',
    description: 'Covers ecosystem dynamics, food webs, and biodiversity concepts for GED Science.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 3020,
    subjectName: 'Science',
    className: 'Pre-GED Class A',
    visibility: 'ALL',
    status: 'PUBLISHED',
    uploadedById: 't2',
    uploadedByName: 'Mr. Saw Htoo',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
  },
  {
    id: 'v4',
    title: 'Social Studies: US Government Overview',
    description: 'A walkthrough of US government structure and civic concepts for GED prep.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 2760,
    subjectName: 'Social Studies',
    visibility: 'TEACHERS_ONLY',
    status: 'DRAFT',
    uploadedById: 'u1',
    uploadedByName: 'System User',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
] : [];

export default function VideoEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  const video = MOCK_VIDEOS.find(v => v.id === id);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const headers = { Authorization: `Bearer ${token}` };
        const [cRes, sRes] = await Promise.all([
          fetch('/api/classes', { headers }),
          fetch('/api/subjects', { headers }),
        ]);
        if (cRes.ok) setClasses(await cRes.json());
        if (sRes.ok) setSubjects(await sRes.json());
      } catch {}
    };
    fetchOptions();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(videoSchema) as Resolver<FormValues>,
    defaultValues: video
      ? {
          title: video.title,
          description: video.description || '',
          videoUrl: video.videoUrl,
          thumbnailUrl: video.thumbnailUrl || '',
          duration: video.duration,
          classId: video.classId,
          subjectId: video.subjectId,
          visibility: video.visibility,
          status: video.status,
        }
      : { visibility: 'ALL', status: 'PUBLISHED' },
  });

  if (!video) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Video not found</h2>
        <Button variant="link" onClick={() => navigate('/videos')} className="mt-2">Back to Video Lessons</Button>
      </div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const payload = {
        ...data,
        classId: data.classId || null,
        subjectId: data.subjectId || null,
        thumbnailUrl: data.thumbnailUrl || null,
        duration: data.duration || null,
      };

      const res = await fetch(`/api/videos/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update video lesson');
      }

      toast.success('Video lesson updated successfully.');
      navigate(`/videos/${id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update video lesson');
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          render={<Link to={`/videos/${id}`} />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Video Lesson</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Update the details of this video lesson.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-6">

          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL *</Label>
            <Input id="videoUrl" {...register('videoUrl')} placeholder="https://www.youtube.com/watch?v=..." />
            {errors.videoUrl && <p className="text-xs text-red-500 font-medium">{errors.videoUrl.message}</p>}
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs border border-blue-100 dark:border-blue-900">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Supported: YouTube, Vimeo, or direct .mp4/.webm URLs.</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Visibility *</Label>
              <Select value={watch('visibility')} onValueChange={(val: any) => setValue('visibility', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="STUDENTS">Students Only</SelectItem>
                  <SelectItem value="TEACHERS_ONLY">Teachers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={watch('status')} onValueChange={(val: any) => setValue('status', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign to Class (Optional)</Label>
              <Select value={watch('classId') || 'none'} onValueChange={(val) => setValue('classId', val === 'none' ? undefined : val)}>
                <SelectTrigger><SelectValue placeholder="All Classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- All Classes --</SelectItem>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign to Subject (Optional)</Label>
              <Select value={watch('subjectId') || 'none'} onValueChange={(val) => setValue('subjectId', val === 'none' ? undefined : val)}>
                <SelectTrigger><SelectValue placeholder="General" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- General --</SelectItem>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds, optional)</Label>
              <Input id="duration" type="number" min={0} {...register('duration')} />
              {errors.duration && <p className="text-xs text-red-500 font-medium">{errors.duration.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Thumbnail URL (Optional)</Label>
              <Input id="thumbnailUrl" {...register('thumbnailUrl')} placeholder="https://..." />
              {errors.thumbnailUrl && <p className="text-xs text-red-500 font-medium">{errors.thumbnailUrl.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/videos/${id}`)}>Cancel</Button>
          <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
