import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Link as LinkIcon } from 'lucide-react';
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

const resourceSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Provide a brief description'),
  type: z.enum(['PDF', 'IMAGE', 'VIDEO', 'LINK', 'DOCUMENT', 'OTHER']),
  visibility: z.enum(['TEACHERS_ONLY', 'STUDENTS', 'ALL']),
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  externalUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type FormValues = z.infer<typeof resourceSchema>;

export default function LibraryEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

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
    // Mock loading data
    reset({
      title: 'Introduction to React',
      description: 'A great tutorial on React fundamentals.',
      type: 'VIDEO',
      visibility: 'ALL',
      classId: 'c1',
      externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    });
  }, [reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Updated resource data:', data);
      toast.success('Resource updated successfully');
      navigate(`/library/${id}`);
    } catch (error) {
      toast.error('Failed to update resource');
    }
  };

  const resourceType = watch('type');

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/library/${id}`} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Resource
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Resource</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm p-6 space-y-6">
            
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
                  <SelectItem value="c1">Grade 10A</SelectItem>
                  <SelectItem value="c2">Grade 10B</SelectItem>
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
                  <SelectItem value="math-10">Mathematics</SelectItem>
                  <SelectItem value="bio-10">Biology</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(resourceType === 'VIDEO' || resourceType === 'LINK') && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
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
           <Button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900" disabled={isSubmitting}>
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
