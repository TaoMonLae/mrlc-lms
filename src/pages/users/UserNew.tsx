import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ShieldAlert } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMIN: 'Full system access including user management, settings, and all features',
  TEACHER: 'Can manage classes, students, attendance, exams, and create educational content',
  STUDENT: 'Can view their own grades, attendance, fees, and access educational materials',
  STAFF: 'Basic access to view information and assist with administrative tasks',
  ACCOUNTANT: 'Can manage fees, payments, and financial records',
  CASE_WORKER: 'Can manage student cases, counseling records, and support services',
  LIBRARIAN: 'Can manage library resources, books, and digital content',
};

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT', 'STAFF', 'ACCOUNTANT', 'CASE_WORKER', 'LIBRARIAN']),
  status: z.enum(['ACTIVE', 'DISABLED']),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface ProfileOption { id: string; label: string }

export default function UserNew() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState<ProfileOption[]>([]);
  const [students, setStudents] = useState<ProfileOption[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    const auth = { Authorization: `Bearer ${token}` };
    fetch('/api/teachers', { headers: auth })
      .then(r => (r.ok ? r.json() : []))
      .then((list: any[]) => setTeachers(list.map((t) => ({
        id: t.id,
        label: `${`${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || 'Unnamed'}${t.teacherCode ? ` (${t.teacherCode})` : ''}`,
      }))))
      .catch(() => {});
    fetch('/api/students', { headers: auth })
      .then(r => (r.ok ? r.json() : []))
      .then((list: any[]) => setStudents(list.map((s) => ({
        id: s.id,
        label: `${`${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || 'Unnamed'}${s.studentCode ? ` (${s.studentCode})` : ''}`,
      }))))
      .catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      status: 'ACTIVE',
      role: 'TEACHER',
    }
  });

  const onSubmit = async (data: UserFormValues) => {
    try {
      const token = sessionStorage.getItem('auth_token');
      const [firstName, ...rest] = data.name.trim().split(' ');
      const lastName = rest.join(' ') || '';
      const teacherId = data.role === 'TEACHER' ? (data.teacherId || '') : '';
      const studentId = data.role === 'STUDENT' ? (data.studentId || '') : '';
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstName,
          lastName,
          email: data.email || `${data.username}@mrlc.edu`,
          password: data.password,
          role: data.role,
          status: data.status,
          teacherId,
          studentId,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to create user account');
      toast.success('User account created successfully');
      navigate('/users');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user account');
    }
  };

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/users" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create New User</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Set up a new system account and assign permissions.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Account Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...register('name')} placeholder="e.g. Full Name" />
                {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input id="username" {...register('username')} placeholder="e.g. jdoe" />
                {errors.username && <p className="text-xs text-red-500 font-medium">{errors.username.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...register('email')} placeholder="e.g. jdoe@school.edu" />
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password *</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-surface-raised space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-purple-600" />
              Role & Permissions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>System Role *</Label>
                <Select value={watch('role')} onValueChange={(val: any) => setValue('role', val)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrator</SelectItem>
                    <SelectItem value="TEACHER">Teacher</SelectItem>
                    <SelectItem value="STUDENT">Student</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="CASE_WORKER">Case Worker</SelectItem>
                    <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-red-500 font-medium">{errors.role.message}</p>}
                {watch('role') && (
                  <p className="text-xs text-slate-500 mt-1">
                    {ROLE_DESCRIPTIONS[watch('role')]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Account Status *</Label>
                <Select value={watch('status')} onValueChange={(val: any) => setValue('status', val)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status && <p className="text-xs text-red-500 font-medium">{errors.status.message}</p>}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-surface-raised space-y-4">
             <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Profile Linking (Optional)</h3>
             <p className="text-sm text-slate-500">
               Connect this account to a {watch('role') === 'STUDENT' ? 'student' : watch('role') === 'TEACHER' ? 'teacher' : 'student or teacher'} record so it appears in their profile.
             </p>
             {watch('role') === 'TEACHER' ? (
               <div className="space-y-2 max-w-sm">
                 <Label>Link to Teacher Profile</Label>
                 <Select value={watch('teacherId') || 'none'} onValueChange={(val: any) => setValue('teacherId', val === 'none' ? '' : val)}>
                   <SelectTrigger><SelectValue placeholder="Select a teacher" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">— Not linked —</SelectItem>
                     {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
             ) : watch('role') === 'STUDENT' ? (
               <div className="space-y-2 max-w-sm">
                 <Label>Link to Student Profile</Label>
                 <Select value={watch('studentId') || 'none'} onValueChange={(val: any) => setValue('studentId', val === 'none' ? '' : val)}>
                   <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                   <SelectContent>
                     <SelectItem value="none">— Not linked —</SelectItem>
                     {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>
             ) : (
               <p className="text-sm text-slate-400 italic">Profile linking is only available for Teacher and Student roles.</p>
             )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
           <Button type="button" variant="outline" onClick={() => navigate('/users')}>
             Cancel
           </Button>
           <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
             {isSubmitting ? 'Creating...' : (
               <>
                 <Save className="mr-2 h-4 w-4" />
                 Create Account
               </>
             )}
           </Button>
        </div>
      </form>
    </div>
  );
}
