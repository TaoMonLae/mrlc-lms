import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
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

const resourceSchema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Provide a brief description'),
    type: z.enum(['PDF', 'IMAGE', 'VIDEO', 'LINK', 'DOCUMENT', 'OTHER']),
    visibility: z.enum(['TEACHERS_ONLY', 'STUDENTS', 'ALL']),
    classId: z.string().optional(),
    subjectId: z.string().optional(),
    // Accept any stored value here; only VIDEO/LINK require a real URL (checked below).
    externalUrl: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if ((data.type === 'VIDEO' || data.type === 'LINK')) {
      const url = (data.externalUrl || '').trim();
      if (url) {
        try {
          // eslint-disable-next-line no-new
          new URL(url);
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['externalUrl'],
            message: 'Must be a valid URL',
          });
        }
      }
    }
  });

type FormValues = z.infer<typeof resourceSchema>;

export default function LibraryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(resourceSchema),
  });

  useEffect(() => {
    const fetchOptionsAndData = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const headers = { 'Authorization': `Bearer ${token}` };
        
        // 1. Fetch dropdown options
        const [cRes, sRes] = await Promise.all([
          fetch('/api/classes', { headers }),
          fetch('/api/subjects', { headers })
        ]);
        if (cRes.ok) setClasses(await cRes.json());
        if (sRes.ok) setSubjects(await sRes.json());

        // 2. Fetch the resource itself
        const res = await fetch(`/api/library/${id}`, { headers });
        if (!res.ok) throw new Error('Resource not found');
        const resource = await res.json();

        reset({
          title: resource.title,
          description: resource.description,
          type: resource.type,
          visibility: resource.visibility,
          classId: resource.classId || undefined,
          subjectId: resource.subjectId || undefined,
          externalUrl: resource.externalUrl || '',
        });
      } catch (err) {
        console.error('Error loading resource data:', err);
        toast.error('Failed to load resource details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchOptionsAndData();
  }, [id, reset]);

  const onInvalid = (formErrors: typeof errors) => {
    const first = Object.values(formErrors)[0] as { message?: string } | undefined;
    toast.error(first?.message || 'Please fix the highlighted fields before saving.');
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const payload = {
        title: data.title,
        description: data.description,
        type: data.type,
        visibility: data.visibility,
        classId: data.classId || null,
        subjectId: data.subjectId || null,
        // Preserve whatever was stored (uploaded file URL for PDFs/images, or the
        // external link for VIDEO/LINK). Never wipe it on an unrelated edit.
        externalUrl: data.externalUrl || null,
      };

      const res = await fetch(`/api/library/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update resource');
      }

      toast.success('Resource updated successfully.');
      navigate(`/library/${id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to update resource');
    }
  };

  const resourceType = watch('type');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="animate-spin rounded-full h-6 w-6 border-2 border-aubergine-600 border-t-transparent mr-2"></span>
        <span className="text-slate-500">Loading resource...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/library/${id}`} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resource
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Resource</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm p-6 space-y-6">
            
          <div className="space-y-2">
            <Label htmlFor="title">Resource Title *</Label>
            <Input id="title" {...register('title')} placeholder="e.g. Intro to Biology Worksheet" />
            {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea id="description" {...register('description')} placeholder="Briefly describe the contents of this resource..." rows={4} />
            {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Resource Type *</Label>
              <Select value={resourceType} onValueChange={(val: any) => setValue('type', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCUMENT">Document (Word, Excel)</SelectItem>
                  <SelectItem value="PDF">PDF File</SelectItem>
                  <SelectItem value="IMAGE">Image</SelectItem>
                  <SelectItem value="VIDEO">Video</SelectItem>
                  <SelectItem value="LINK">External Link</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-red-500 font-medium">{errors.type.message}</p>}
            </div>

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
              {errors.visibility && <p className="text-xs text-red-500 font-medium">{errors.visibility.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Assign to Class (Optional)</Label>
              <Select value={watch('classId') || "none"} onValueChange={(val) => setValue('classId', val === "none" ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Global Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Global (All Classes) --</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign to Subject (Optional)</Label>
              <Select value={watch('subjectId') || "none"} onValueChange={(val) => setValue('subjectId', val === "none" ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="General Resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- General System --</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(resourceType === 'VIDEO' || resourceType === 'LINK') && (
            <div className="pt-4 border-t border-slate-100 dark:border-surface-raised space-y-4">
               <div className="space-y-2">
                  <Label htmlFor="externalUrl">External URL</Label>
                  <Input id="externalUrl" {...register('externalUrl')} placeholder="https://..." />
                  {errors.externalUrl && <p className="text-xs text-red-500 font-medium">{errors.externalUrl.message}</p>}
               </div>
            </div>
          )}

        </div>

        <div className="flex justify-end gap-3">
           <Button type="button" variant="outline" onClick={() => navigate(`/library/${id}`)}>
             Cancel
           </Button>
           <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
             {isSubmitting ? 'Saving...' : (
               <>
                 <Save className="mr-2 h-4 w-4" />
                 Save Changes
               </>
             )}
           </Button>
        </div>
      </form>
    </div>
  );
}
