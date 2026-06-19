import React from 'react';
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

export default function UserNew() {
  const navigate = useNavigate();
  
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
             <p className="text-sm text-slate-500">Link this user account to an existing profile in the system to enable relevant features.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherId">Link to Teacher Profile</Label>
                  <Input id="teacherId" {...register('teacherId')} placeholder="Teacher ID (e.g. t1)" disabled={watch('role') !== 'TEACHER'} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studentId">Link to Student Profile</Label>
                  <Input id="studentId" {...register('studentId')} placeholder="Student ID (e.g. s1)" disabled={watch('role') !== 'STUDENT'} />
                </div>
             </div>
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
