import { LoadError } from '../../components/ui/load-error';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
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
  TEACHER: 'Can work with assigned classes and students, record attendance, manage assessments, and create educational content',
  STUDENT: 'Can view their own grades, attendance, fees, and access educational materials',
  GUARDIAN: 'Can view Family Portal information for learners linked by school staff',
  STAFF: 'Basic access to view information and assist with administrative tasks',
  ACCOUNTANT: 'Can manage fees, payments, and financial records',
  CASE_WORKER: 'Can manage student cases, counseling records, and support services',
  LIBRARIAN: 'Can manage library resources, books, and digital content',
};

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Only letters, numbers, dots, underscores, and hyphens allowed'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN', 'STAFF', 'ACCOUNTANT', 'CASE_WORKER', 'LIBRARIAN']),
  status: z.enum(['ACTIVE', 'DISABLED']),
  teacherId: z.string().optional(),
  studentId: z.string().optional(),
  guardianStudentIds: z.array(z.string()).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface ProfileOption { id: string; label: string }

export default function UserEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [loadRevision, setLoadRevision] = useState(0);
  const [teachers, setTeachers] = useState<ProfileOption[]>([]);
  const [students, setStudents] = useState<ProfileOption[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      role: 'TEACHER',
      status: 'ACTIVE',
      teacherId: '',
      studentId: '',
      guardianStudentIds: [],
    }
  });

  useEffect(() => {
    setLoading(true); setLoadError('');
    const controller = new AbortController();
    const token = sessionStorage.getItem('auth_token');
    const auth = { Authorization: `Bearer ${token}` };

    // Load profile options for the linking dropdowns.
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
        label: `${s.preferredName || `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || 'Unnamed'}${s.studentCode ? ` (${s.studentCode})` : ''}`,
      }))))
      .catch(() => {});

    fetch(`/api/users/${id}`, { headers: auth, signal: controller.signal })
      .then(async r => { if (!r.ok) throw new Error('Unable to load this user. Please retry.'); return r.json(); })
      .then(u => {
        if (controller.signal.aborted) return;
        reset({
          name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
          username: u.username ?? u.email?.split('@')[0] ?? '',
          email: u.email ?? '',
          role: u.role ?? 'TEACHER',
          status: u.isActive ? 'ACTIVE' : 'DISABLED',
          teacherId: u.teacherProfile?.id ?? '',
          studentId: u.studentProfile?.id ?? '',
          guardianStudentIds: u.guardianLinks?.map((link: { studentId: string }) => link.studentId) ?? [],
        });
      })
      .catch(err => { if (!controller.signal.aborted) setLoadError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, reset, loadRevision]);

  const onSubmit = async (data: UserFormValues) => {
    const token = sessionStorage.getItem('auth_token');
    const [firstName, ...rest] = data.name.trim().split(' ');
    const lastName = rest.join(' ');
    // Send the profile link relevant to the role; clear the other so linkage
    // stays consistent. Empty string tells the server to unlink.
    const teacherId = data.role === 'TEACHER' ? (data.teacherId || '') : '';
    const studentId = data.role === 'STUDENT' ? (data.studentId || '') : '';
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ firstName, lastName, email: data.email, username: data.username, role: data.role, status: data.status, teacherId, studentId, guardianStudentIds: data.role === 'GUARDIAN' ? (data.guardianStudentIds || []) : [] }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update user');
      }
      toast.success('User account updated');
      navigate('/users');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user account');
    }
  };

  if (loadError) return <LoadError title="Unable to open user" message={loadError} onRetry={() => setLoadRevision(n => n + 1)} />;
  if (loading) return <p role="status">Loading user…</p>;

  return (
    <div className="space-y-6 max-w-[800px] mx-auto pb-10">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground hover:text-foreground" render={<Link to="/users" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Edit User Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Modify system account details and permissions.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-card border border-border rounded-sm p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Account Details</h3>
            
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
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-accent-purple" />
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
                    <SelectItem value="GUARDIAN">Parent / Guardian</SelectItem>
                    <SelectItem value="STAFF">Staff</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                    <SelectItem value="CASE_WORKER">Case Worker</SelectItem>
                    <SelectItem value="LIBRARIAN">Librarian</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-red-500 font-medium">{errors.role.message}</p>}
                {watch('role') && (
                  <p className="text-xs text-muted-foreground mt-1">
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

          <div className="pt-4 border-t border-border space-y-4">
             <h3 className="text-lg font-semibold text-foreground">Profile Linking (Optional)</h3>
             <p className="text-sm text-muted-foreground -mt-2">
               {watch('role') === 'GUARDIAN' ? 'Select each learner this adult is verified to support. Only school staff can change these links.' : `Connect this account to a ${watch('role') === 'STUDENT' ? 'student' : watch('role') === 'TEACHER' ? 'teacher' : 'student or teacher'} record.`}
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
             ) : watch('role') === 'GUARDIAN' ? (
               <fieldset className="space-y-3">
                 <legend className="text-sm font-semibold">Linked learners</legend>
                 <div className="max-h-56 space-y-2 overflow-y-auto border border-border p-3">
                   {students.map((student) => (
                     <label key={student.id} className="flex min-h-9 items-center gap-3 text-sm">
                       <input type="checkbox" className="size-4 accent-academic-teal" checked={(watch('guardianStudentIds') || []).includes(student.id)} onChange={(event) => {
                         const current = watch('guardianStudentIds') || [];
                         setValue('guardianStudentIds', event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id), { shouldDirty: true });
                       }} />
                       {student.label}
                     </label>
                   ))}
                   {!students.length && <p className="text-sm text-muted-foreground">No learners available.</p>}
                 </div>
               </fieldset>
             ) : (
               <p className="text-sm text-muted-foreground italic">Profile linking is available for teacher, student, and guardian accounts.</p>
             )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
           <Button type="button" variant="outline" onClick={() => navigate('/users')}>
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
