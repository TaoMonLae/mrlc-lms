import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { useUser } from '../../lib/permissions';

const videoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  videoUrl: z.string().url('Must be a valid URL (YouTube, Vimeo, or direct video link)'),
  thumbnailUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  duration: z.coerce.number().int().min(0).optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  visibility: z.enum(['ALL', 'STUDENTS', 'TEACHERS_ONLY']),
  status: z.enum(['PUBLISHED', 'DRAFT']),
});

type FormValues = z.infer<typeof videoSchema>;

export default function VideoNew() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

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
      } catch {
        // non-blocking; dropdowns will be empty
      }
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
    defaultValues: {
      visibility: 'ALL',
      status: 'PUBLISHED',
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const payload = {
        ...data,
        classId: data.classId || null,
        subjectId: data.subjectId || null,
        thumbnailUrl: data.thumbnailUrl || null,
        duration: data.duration || null,
        uploadedByName: user?.name || 'Unknown',
      };

      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save video lesson');
      }

      toast.success('Video lesson added successfully.');
      navigate('/videos');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save video lesson');
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          render={<Link to="/videos" />}
          nativeButton={false}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Video Lessons
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Add Video Lesson</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
          Link a YouTube, Vimeo, or direct video URL to the lesson library.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-6">

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video URL *</Label>
            <Input
              id="videoUrl"
              {...register('videoUrl')}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {errors.videoUrl && <p className="text-xs text-red-500 font-medium">{errors.videoUrl.message}</p>}
            <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs border border-blue-100 dark:border-blue-900">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Paste a YouTube, Vimeo, or direct .mp4/.webm URL. The player will auto-embed supported links.</span>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register('title')} placeholder="e.g. Introduction to Algebra" />
            {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Briefly describe what this video covers..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visibility */}
            <div className="space-y-2">
              <Label>Visibility *</Label>
              <Select value={watch('visibility')} onValueChange={(val: any) => setValue('visibility', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Who can see this?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Everyone</SelectItem>
                  <SelectItem value="STUDENTS">Students Only</SelectItem>
                  <SelectItem value="TEACHERS_ONLY">Teachers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={watch('status')} onValueChange={(val: any) => setValue('status', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="DRAFT">Save as Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Class */}
            <div className="space-y-2">
              <Label>Assign to Class (Optional)</Label>
              <Select value={watch('classId') || 'none'} onValueChange={(val) => setValue('classId', val === 'none' ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- All Classes --</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>Assign to Subject (Optional)</Label>
              <Select value={watch('subjectId') || 'none'} onValueChange={(val) => setValue('subjectId', val === 'none' ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="General" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- General --</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (seconds, optional)</Label>
              <Input
                id="duration"
                type="number"
                min={0}
                {...register('duration')}
                placeholder="e.g. 1845"
              />
              {errors.duration && <p className="text-xs text-red-500 font-medium">{errors.duration.message}</p>}
            </div>

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label htmlFor="thumbnailUrl">Thumbnail URL (Optional)</Label>
              <Input
                id="thumbnailUrl"
                {...register('thumbnailUrl')}
                placeholder="https://..."
              />
              {errors.thumbnailUrl && <p className="text-xs text-red-500 font-medium">{errors.thumbnailUrl.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/videos')}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Video Lesson
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
