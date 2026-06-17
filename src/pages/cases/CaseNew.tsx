import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  studentId: z.string().min(1, 'Student selection is required'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Provide a detailed description of the case'),
  type: z.enum(['ATTENDANCE', 'ACADEMIC', 'HEALTH', 'FAMILY', 'PROTECTION', 'BEHAVIOR', 'DOCUMENTATION', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  assignedToId: z.string().optional(),
});

type FormValues = z.infer<typeof caseSchema>;

export default function CaseNew() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/students', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setStudents(data);
        }
      } catch (err) {
        console.error('Error fetching students:', err);
      }
    };
    fetchStudents();
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      type: 'BEHAVIOR',
      priority: 'MEDIUM',
    }
  });

  const onSubmit = async (data: FormValues) => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: data.studentId,
          title: data.title,
          description: data.description,
          category: data.type,
          priority: data.priority
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create case');
      }

      toast.success('Case created successfully.');
      navigate('/cases');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create case');
    }
  };

  const selectedType = watch('type');

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/cases" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cases
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Open New Case</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Record a new student support or protection concern.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {selectedType === 'PROTECTION' && (
           <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-900 flex items-start gap-3">
             <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
             <div>
               <h3 className="font-semibold">Protection Case Guidelines</h3>
               <p className="text-sm mt-1">Protection cases involve severe safety concerns. Ensure all notes are strictly factual. This case will be flagged as Urgent by default and will notify designated Safeguarding Leads immediately.</p>
             </div>
           </div>
        )}

        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm p-6 space-y-6">
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="studentId">Student *</Label>
                <Select value={watch('studentId')} onValueChange={(val) => setValue('studentId', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => {
                      const firstName = student.user?.firstName || student.firstName || '';
                      const lastName = student.user?.lastName || student.lastName || '';
                      const studentCode = student.studentCode || student.studentId || '';
                      return (
                        <SelectItem key={student.id} value={student.id}>
                          {firstName} {lastName} ({studentCode})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.studentId && <p className="text-xs text-red-500 font-medium">{errors.studentId.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Case Title / Brief Summary *</Label>
                <Input id="title" {...register('title')} placeholder="e.g. Needs welfare check, absent 5 days" />
                {errors.title && <p className="text-xs text-red-500 font-medium">{errors.title.message}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea 
                  id="description" 
                  {...register('description')} 
                  placeholder="Provide all known context, observations, and factual details..." 
                  rows={5} 
                />
                <p className="text-xs text-slate-500">Do not include subjective opinions or diagnoses unless formally provided by a professional.</p>
                {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Case Type *</Label>
                <Select value={selectedType} onValueChange={(val: any) => {
                  setValue('type', val);
                  if (val === 'PROTECTION') setValue('priority', 'URGENT');
                }}>
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
                <Label>Assign To (Optional)</Label>
                <Select value={watch('assignedToId')} onValueChange={(val) => setValue('assignedToId', val === "none" ? undefined : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Leave Unassigned --</SelectItem>
                    <SelectItem value="u1">Admin User (Administrator)</SelectItem>
                    <SelectItem value="u2">Sarah Counselor (Case Worker)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

           </div>
        </div>

        <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={() => navigate('/cases')}>
               Cancel
             </Button>
             <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
               {isSubmitting ? 'Saving...' : (
                 <>
                   <Save className="mr-2 h-4 w-4" />
                   Create Case
                 </>
               )}
             </Button>
          </div>
      </form>
    </div>
  );
}
