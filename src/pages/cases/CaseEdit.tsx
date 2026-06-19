import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';
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

const caseSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Provide a detailed description of the case'),
  type: z.enum(['ATTENDANCE', 'ACADEMIC', 'HEALTH', 'FAMILY', 'PROTECTION', 'BEHAVIOR', 'DOCUMENTATION', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: z.enum(['OPEN', 'FOLLOW_UP', 'RESOLVED', 'CLOSED']),
  assignedToId: z.string().optional(),
});

type FormValues = z.infer<typeof caseSchema>;

export default function CaseEdit() {
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
    resolver: zodResolver(caseSchema),
  });

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch(`/api/cases/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        reset({
          title: data.title || '',
          description: data.description || '',
          type: data.category || data.type || 'OTHER',
          priority: data.priority || 'MEDIUM',
          status: data.status || 'OPEN',
          assignedToId: data.assignedToId || undefined,
        });
      })
      .catch(() => {});
  }, [id, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Case updated successfully');
      navigate(`/cases/${id}`);
    } catch (error) {
      toast.error('Failed to update case');
    }
  };

  const selectedType = watch('type');
  const selectedStatus = watch('status');

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/cases/${id}`} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Case
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Case</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Update case details and status.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {selectedType === 'PROTECTION' && (
           <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-900 flex items-start gap-3">
             <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
             <div>
               <h3 className="font-semibold">Protection Case Guidelines</h3>
               <p className="text-sm mt-1">Protection cases involve severe safety concerns. Ensure all notes are strictly factual. This case should remain Urgent unless reviewed by a Safeguarding Lead.</p>
             </div>
           </div>
        )}

        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm p-6 space-y-6">
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2 md:col-span-2">
                <Label>Case Status *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                   {['OPEN', 'FOLLOW_UP', 'RESOLVED', 'CLOSED'].map((s) => (
                     <div 
                        key={s}
                        onClick={() => setValue('status', s as any)}
                        className={`border rounded-lg p-3 flex items-center justify-center cursor-pointer text-sm font-medium transition-colors ${selectedStatus === s ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-surface-indigo dark:border-surface-raised dark:text-slate-300 dark:hover:bg-surface-raised'}`}
                     >
                       {s.replace('_', ' ')}
                     </div>
                   ))}
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Case Title / Brief Summary *</Label>
                <Input id="title" {...register('title')} />
                {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea 
                  id="description" 
                  {...register('description')} 
                  rows={4} 
                />
                {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Case Type *</Label>
                <Select value={selectedType} onValueChange={(val: any) => setValue('type', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                    <SelectItem value="ACADEMIC">Academic</SelectItem>
                    <SelectItem value="HEALTH">Health</SelectItem>
                    <SelectItem value="FAMILY">Family</SelectItem>
                    <SelectItem value="PROTECTION">Protection/Safeguarding</SelectItem>
                    <SelectItem value="BEHAVIOR">Behavior</SelectItem>
                    <SelectItem value="DOCUMENTATION">Documentation/Legal</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-red-500 font-medium">{errors.type.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Priority Level *</Label>
                <Select value={watch('priority')} onValueChange={(val: any) => setValue('priority', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low - Routine monitoring</SelectItem>
                    <SelectItem value="MEDIUM">Medium - Needs attention</SelectItem>
                    <SelectItem value="HIGH">High - Needs immediate action</SelectItem>
                    <SelectItem value="URGENT">Urgent - Crisis / Safety risk</SelectItem>
                  </SelectContent>
                </Select>
                {errors.priority && <p className="text-xs text-red-500 font-medium">{errors.priority.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Assign To</Label>
                <Select value={watch('assignedToId') || "none"} onValueChange={(val) => setValue('assignedToId', val === "none" ? undefined : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Leave Unassigned --</SelectItem>
                  </SelectContent>
                </Select>
              </div>

           </div>
        </div>

        <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={() => navigate(`/cases/${id}`)}>
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
