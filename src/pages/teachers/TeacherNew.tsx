import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, UserPlus, Image as ImageIcon } from 'lucide-react';
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

const teacherSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  address: z.string().min(5, 'Address is too short'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'VOLUNTEER']),
  joinedDate: z.string().min(1, 'Please select a joined date'),
  subjects: z.string().min(1, 'Please enter at least one subject'),
  notes: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

export default function TeacherNew() {
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      gender: 'MALE',
      employmentType: 'FULL_TIME',
      joinedDate: new Date().toISOString().split('T')[0]
    }
  });

  const onSubmit = async (data: TeacherFormValues) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('New teacher data:', data);
      toast.success('Teacher added successfully');
      navigate('/teachers');
    } catch (error) {
      toast.error('Failed to add teacher');
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/teachers" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teachers
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Add New Teacher</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Fill in the details to register a new teacher in the system.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} placeholder="e.g. Htet" />
                {errors.firstName && <p className="text-xs text-red-500 font-medium">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} placeholder="e.g. Wai Yan" />
                {errors.lastName && <p className="text-xs text-red-500 font-medium">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={watch('gender')} onValueChange={(val: any) => setValue('gender', val)}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-red-500 font-medium">{errors.gender.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="joinedDate">Joined Date</Label>
                <Input id="joinedDate" type="date" {...register('joinedDate')} />
                {errors.joinedDate && <p className="text-xs text-red-500 font-medium">{errors.joinedDate.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register('email')} placeholder="teacher@lms.edu" />
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...register('phone')} placeholder="09..." />
                {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Residential Address</Label>
              <Textarea id="address" {...register('address')} placeholder="Full address..." />
              {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Professional Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={watch('employmentType')} onValueChange={(val: any) => setValue('employmentType', val)}>
                  <SelectTrigger id="employmentType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="VOLUNTEER">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
                {errors.employmentType && <p className="text-xs text-red-500 font-medium">{errors.employmentType.message}</p>}
              </div>
               <div className="space-y-2">
                <Label htmlFor="subjects">Subjects (Comma separated)</Label>
                <Input id="subjects" {...register('subjects')} placeholder="Mathematics, Science, English" />
                {errors.subjects && <p className="text-xs text-red-500 font-medium">{errors.subjects.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes/Remarks</Label>
              <Textarea id="notes" {...register('notes')} placeholder="Optional notes about the teacher..." />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Profile Picture</h2>
            <div className="aspect-square w-full rounded-lg border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
               <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
               <p className="text-xs">Drag & drop or click to upload</p>
               <Button variant="ghost" size="sm" type="button" className="mt-4 text-xs">Browse Files</Button>
            </div>
            <p className="text-[10px] text-slate-500 text-center">JPG, PNG or SVG. Max size 2MB.</p>
          </div>

          <div className="space-y-3">
             <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={isSubmitting}>
               {isSubmitting ? 'Adding...' : (
                 <>
                   <UserPlus className="mr-2 h-4 w-4" />
                   Add Teacher
                 </>
               )}
             </Button>
             <Button type="button" variant="outline" className="w-full" onClick={() => navigate('/teachers')}>
               Cancel
             </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
