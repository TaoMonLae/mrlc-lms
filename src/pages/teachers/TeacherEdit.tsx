import React, { useEffect } from 'react';
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
import { ProfilePhotoUploader } from '@/src/components/profile/ProfilePhotoUploader';

const teacherSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  address: z.string().min(5, 'Address is too short'),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'VOLUNTEER']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  joinedDate: z.string().min(1, 'Please select a joined date'),
  subjects: z.string().min(1, 'Please enter at least one subject'),
  notes: z.string().optional(),
});

type TeacherFormValues = z.infer<typeof teacherSchema>;

export default function TeacherEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profilePhotoUrl, setProfilePhotoUrl] = React.useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: 'MALE',
      email: '',
      phone: '',
      address: '',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      joinedDate: '',
      subjects: '',
      notes: '',
    }
  });

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : []))
      .then((teachers) => {
        const teacher = Array.isArray(teachers) ? teachers.find((item: any) => item.id === id) : null;
        if (!teacher) return;
        setProfilePhotoUrl(teacher.profilePhotoUrl || teacher.user?.profilePhotoUrl || null);
        reset({
          firstName: teacher.user?.firstName || teacher.firstName || '',
          lastName: teacher.user?.lastName || teacher.lastName || '',
          gender: teacher.gender || 'MALE',
          email: teacher.user?.email || teacher.email || '',
          phone: teacher.phone || '',
          address: teacher.address || '',
          employmentType: teacher.employmentType || 'FULL_TIME',
          status: teacher.status || 'ACTIVE',
          joinedDate: teacher.joinedDate ? String(teacher.joinedDate).split('T')[0] : '',
          subjects: Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : teacher.subjects || '',
          notes: teacher.notes || '',
        });
      })
      .catch(() => {});
  }, [id, reset]);

  const onSubmit = async (data: TeacherFormValues) => {
    try {
      toast.success('Teacher profile updated');
      navigate(`/teachers/${id}`);
    } catch (error) {
      toast.error('Failed to update teacher');
    }
  };

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to={`/teachers/${id}`} />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Profile
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Edit Teacher Profile</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Update account information and professional details for faculty members.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-red-500 font-medium">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} />
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
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Residential Address</Label>
              <Textarea id="address" {...register('address')} rows={3} />
              {errors.address && <p className="text-xs text-red-500 font-medium">{errors.address.message}</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Professional Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={watch('status')} onValueChange={(val: any) => setValue('status', val)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-red-500 font-medium">{errors.status.message}</p>}
              </div>
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
            </div>
             <div className="space-y-2">
              <Label htmlFor="subjects">Subjects (Comma separated)</Label>
              <Input id="subjects" {...register('subjects')} />
              {errors.subjects && <p className="text-xs text-red-500 font-medium">{errors.subjects.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes/Remarks</Label>
              <Textarea id="notes" {...register('notes')} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Profile Picture</h2>
            <ProfilePhotoUploader
              currentUrl={profilePhotoUrl}
              fallbackText={`${watch('firstName')?.[0] || ''}${watch('lastName')?.[0] || ''}`}
              targetType="teacher"
              targetId={id}
              onUploaded={setProfilePhotoUrl}
              imageClassName="w-full aspect-square rounded-lg"
            />
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider font-bold">Current Photo</p>
          </div>

          <div className="space-y-3">
             <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
               {isSubmitting ? 'Updating...' : (
                 <>
                   <Save className="mr-2 h-4 w-4" />
                   Save Changes
                 </>
               )}
             </Button>
             <Button type="button" variant="outline" className="w-full" onClick={() => navigate(`/teachers/${id}`)}>
               Discard Changes
             </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
