import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Users } from 'lucide-react';
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
import { TeacherAssignSelect } from '@/src/components/classes/TeacherAssignSelect';

const classSchema = z.object({
  name: z.string().min(2, 'Class name must be at least 2 characters'),
  level: z.string().min(2, 'Level is required'),
  academicYear: z.string().min(4, 'Academic year is required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']),
});

type ClassFormValues = z.infer<typeof classSchema>;

export default function ClassNew() {
  const navigate = useNavigate();
  const [teacherIds, setTeacherIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      level: '',
      academicYear: '',
      description: '',
      status: 'ACTIVE',
    }
  });

  const onSubmit = async (data: ClassFormValues) => {
    const token = sessionStorage.getItem('auth_token');
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create class');
      }
      const created = await res.json().catch(() => null);
      // Assign any selected teachers to the new class.
      if (created?.id && teacherIds.length) {
        await Promise.all(
          teacherIds.map((teacherId) =>
            fetch(`/api/classes/${created.id}/teachers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ teacherId }),
            })
          )
        );
      }
      toast.success('Class created successfully');
      navigate('/classes');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create class');
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/classes" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create New Class</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Define a new academic class, its level, and year.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Class Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g. GED Prep Morning" />
            {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Academic Level</Label>
              <Select value={watch('level')} onValueChange={(val: any) => setValue('level', val)}>
                <SelectTrigger id="level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`).map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                  <SelectItem value="GED">GED</SelectItem>
                  <SelectItem value="IGCSE">IGCSE</SelectItem>
                </SelectContent>
              </Select>
              {errors.level && <p className="text-xs text-red-500 font-medium">{errors.level.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input id="academicYear" {...register('academicYear')} placeholder="e.g. 2025-2026" />
              {errors.academicYear && <p className="text-xs text-red-500 font-medium">{errors.academicYear.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              {...register('description')} 
              placeholder="Optional details about the curriculum or schedule..." 
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

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-surface-raised">
            <Label className="flex items-center gap-2"><Users className="h-4 w-4 text-aubergine-600" /> Assigned Teachers</Label>
            <TeacherAssignSelect value={teacherIds} onChange={setTeacherIds} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
           <Button type="button" variant="outline" onClick={() => navigate('/classes')}>
             Cancel
           </Button>
           <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
             {isSubmitting ? 'Creating...' : (
               <>
                 <Plus className="mr-2 h-4 w-4" />
                 Create Class
               </>
             )}
           </Button>
        </div>
      </form>
    </div>
  );
}
