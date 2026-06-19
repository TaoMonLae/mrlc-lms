import React, { useState, useEffect } from 'react';
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
import { ProfilePhotoUploader } from '@/src/components/profile/ProfilePhotoUploader';

const teacherSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  address: z.string().min(5, 'Address is too short'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'VOLUNTEER']),
  joinedDate: z.string().min(1, 'Please select a joined date'),
  dateOfBirth: z.string().optional(),
  educationLevel: z.string().optional(),
  subjects: z.string().min(1, 'Please enter at least one subject'),
  notes: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

const EDUCATION_LEVELS = [
  'High School',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctorate (PhD)',
  'Teaching Certificate',
  'Diploma',
  'Other',
];

export default function TeacherNew() {
  const navigate = useNavigate();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [profilePhotoId, setProfilePhotoId] = useState<string | null>(null);
  
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
    const token = sessionStorage.getItem('auth_token');
    try {
      // Split full name into first and last name for the API
      const nameParts = data.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const payload = {
        ...data,
        firstName,
        lastName,
        profilePhotoId,
      };

      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add teacher');
      }
      const created = await res.json().catch(() => ({}));
      if (created?.tempPassword) {
        toast.success('Teacher added — share their temporary password', {
          description: `Login: ${data.email}  •  Temporary password: ${created.tempPassword}. They'll be asked to change it on first sign-in.`,
          duration: 30000,
        });
      } else {
        toast.success('Teacher added successfully');
      }
      navigate('/teachers');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add teacher');
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
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Fill in the details to register a new teacher in the system.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Personal Information</h2>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
              <Input id="fullName" {...register('fullName')} placeholder="e.g. Htet Wai Yan" />
              {errors.fullName && <p className="text-xs text-red-500 font-medium">{errors.fullName.message}</p>}
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
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} />
                {errors.dateOfBirth && <p className="text-xs text-red-500 font-medium">{errors.dateOfBirth.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Education Level</Label>
                <Select value={watch('educationLevel')} onValueChange={(val: any) => setValue('educationLevel', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.educationLevel && <p className="text-xs text-red-500 font-medium">{errors.educationLevel.message}</p>}
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

          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
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
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Profile Picture</h2>
            <ProfilePhotoUploader
              currentUrl={profilePhotoUrl}
              fallbackText="Photo"
              targetType="teacher"
              buttonLabel="Upload Photo"
              onUploaded={(url) => {
                setProfilePhotoUrl(url);
                // Extract the ID from the URL if it's in the format /uploads/teacher/{id}
                const match = url.match(/\/uploads\/teacher\/([a-f0-9]+)/);
                if (match) setProfilePhotoId(match[1]);
              }}
            />
            <p className="text-[10px] text-slate-500 text-center">JPG, PNG, WEBP, or SVG up to 5 MB.</p>
          </div>

          <div className="space-y-3">
             <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
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
