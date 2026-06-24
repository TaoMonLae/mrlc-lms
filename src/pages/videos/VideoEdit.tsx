import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Info, Upload, X, Film } from 'lucide-react';
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
import { isValidVideoSourceUrl } from '../../lib/video';

const videoUrlSchema = z.string().min(1, 'Video URL is required').refine(
  isValidVideoSourceUrl,
  'Must be a YouTube, Vimeo, direct video URL, or uploaded video file'
);

const videoSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  videoUrl: videoUrlSchema,
  thumbnailUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  duration: z.coerce.number().int().min(0).optional(),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  visibility: z.enum(['ALL', 'STUDENTS', 'TEACHERS_ONLY']),
  status: z.enum(['PUBLISHED', 'DRAFT', 'ARCHIVED']),
});

type FormValues = z.infer<typeof videoSchema>;

export default function VideoEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [video, setVideo] = useState<VideoLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(videoSchema) as Resolver<FormValues>,
    defaultValues: { visibility: 'ALL', status: 'PUBLISHED' },
  });

  const handleVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (500MB limit)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('Video file must be 500 MB or smaller');
      event.target.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/x-flv', 'video/x-ms-wmv'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv)$/i)) {
      toast.error('Only video files (MP4, WebM, MOV, AVI, MKV, FLV, WMV) are allowed');
      event.target.value = '';
      return;
    }

    setVideoFile(file);

    // Auto-upload the file
    await uploadVideoFile(file);
  };

  const uploadVideoFile = async (file: File) => {
    const token = sessionStorage.getItem('auth_token');
    const formData = new FormData();
    formData.append('video', file);

    setUploadingVideo(true);
    try {
      const res = await fetch('/api/videos/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload video file');
      }

      const data = await res.json();
      setUploadedVideoUrl(data.url);
      setValue('videoUrl', data.url); // Auto-fill the URL field

      toast.success('Video file uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload video file');
      setVideoFile(null);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const removeUploadedVideo = () => {
    setVideoFile(null);
    setUploadedVideoUrl(null);
    setValue('videoUrl', '');
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

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

  useEffect(() => {
    if (!id) return;
    const fetchVideo = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/videos/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setVideo(null);
          return;
        }
        const v: VideoLesson = await res.json();
        setVideo(v);
        reset({
          title: v.title,
          description: v.description || '',
          videoUrl: v.videoUrl,
          thumbnailUrl: v.thumbnailUrl || '',
          duration: v.duration,
          classId: v.classId,
          subjectId: v.subjectId,
          visibility: v.visibility,
          status: v.status,
        });
      } catch (error) {
        console.error('Error fetching video:', error);
        toast.error('Failed to load video');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [id, reset]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading video...</span>
      </div>
    );
  }

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

          {/* Upload Method Selector */}
          <div className="space-y-3">
            <Label>How do you want to add the video?</Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setUploadMethod('url')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  uploadMethod === 'url'
                    ? 'border-aubergine-600 bg-aubergine-50 text-aubergine-700 dark:bg-aubergine-900/20 dark:text-aubergine-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-surface-raised dark:bg-surface-indigo dark:text-slate-300 dark:hover:bg-surface-raised'
                }`}
              >
                <Film className="h-4 w-4" />
                Video URL
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod('file')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                  uploadMethod === 'file'
                    ? 'border-aubergine-600 bg-aubergine-50 text-aubergine-700 dark:bg-aubergine-900/20 dark:text-aubergine-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-surface-raised dark:bg-surface-indigo dark:text-slate-300 dark:hover:bg-surface-raised'
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload File
              </button>
            </div>
          </div>

          {/* Video URL Input */}
          {uploadMethod === 'url' && (
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL *</Label>
              <Input id="videoUrl" {...register('videoUrl')} placeholder="https://www.youtube.com/watch?v=..." />
              {errors.videoUrl && <p className="text-xs text-red-500 font-medium">{errors.videoUrl.message}</p>}
              <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs border border-blue-100 dark:border-blue-900">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Supported: YouTube, Vimeo, or direct .mp4/.webm URLs.</span>
              </div>
            </div>
          )}

          {/* Video File Upload */}
          {uploadMethod === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="videoFile">Upload Video File *</Label>
              <div className="space-y-3">
                {!uploadedVideoUrl ? (
                  <>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/x-flv,video/x-ms-wmv,.mp4,.webm,.mov,.avi,.mkv,.flv,.wmv"
                      className="hidden"
                      onChange={handleVideoFileChange}
                      disabled={uploadingVideo}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="w-full"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingVideo ? 'Uploading...' : 'Choose Video File'}
                    </Button>
                    <p className="text-xs text-slate-500">
                      Supports MP4, WebM, MOV, AVI, MKV, FLV, WMV files up to 500MB
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        {videoFile?.name || 'Video uploaded successfully'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeUploadedVideo}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Input
                  type="hidden"
                  {...register('videoUrl')}
                  value={uploadedVideoUrl || watch('videoUrl') || ''}
                />
                {errors.videoUrl && <p className="text-xs text-red-500 font-medium">{errors.videoUrl.message}</p>}
              </div>
            </div>
          )}

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
