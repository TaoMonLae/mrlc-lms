import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus } from 'lucide-react';
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

const subjectSchema = z.object({
  name: z.string().min(2, 'Subject name must be at least 2 characters'),
  code: z.string().min(2, 'Subject code is required'),
  level: z.string().min(2, 'Level is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
});

type SubjectFormValues = z.infer<typeof subjectSchema>;

export default function SubjectNew() {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      code: '',
      level: '',
      description: '',
      status: 'ACTIVE',
    }
  });

  const onSubmit = async (data: SubjectFormValues) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('New subject data:', data);
      toast.success('Subject created successfully');
      navigate('/subjects');
    } catch (error) {
      toast.error('Failed to create subject');
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/subjects" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Subjects
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create New Subject</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Define a new subject for the school's curriculum.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Subject Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Mathematical Reasoning" />
            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Subject Code</Label>
              <Input id="code" {...register('code')} placeholder="e.g. GED-MATH" />
              {errors.code && <p className="text-xs text-red-500 font-medium">{errors.code.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="level">Academic Level</Label>
              <Select value={watch('level')} onValueChange={(val: any) => setValue('level', val)}>
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Foundation">Foundation</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
              {errors.level && <p className="text-xs text-red-500 font-medium">{errors.level.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              {...register('description')} 
              placeholder="Optional description of what the subject covers..." 
              rows={4}
            />
            {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
          </div>

           <div className="space-y-2">
            <Label>Status</Label>
            <Select value={watch('status')} onValueChange={(val: any) => setValue('status', val)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-red-500 font-medium">{errors.status.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-3">
           <Button type="button" variant="outline" onClick={() => navigate('/subjects')}>
             Cancel
           </Button>
           <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
             {isSubmitting ? 'Creating...' : (
               <>
                 <Plus className="mr-2 h-4 w-4" />
                 Create Subject
               </>
             )}
           </Button>
        </div>
      </form>
    </div>
  );
}
