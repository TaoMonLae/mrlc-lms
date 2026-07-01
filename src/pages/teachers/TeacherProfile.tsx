import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
  Briefcase,
  BookOpen,
  Activity,
  UserCircle,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { type Teacher, type TeacherActivity } from '../../types/teacher';

const handlePrint = () => {
  window.print();
};

export default function TeacherProfile() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!id) return;
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/teachers/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          if (res.status === 404) {
            setTeacher(null);
          } else if (res.status === 401 || res.status === 403) {
            toast.error('You do not have permission to view teacher profiles');
          } else {
            throw new Error('Failed to fetch teacher');
          }
          return;
        }
        const t = await res.json();
        setTeacher({
          ...t,
          firstName: t.user?.firstName || '',
          lastName: t.user?.lastName || '',
          email: t.user?.email || '',
          photoUrl: t.profilePhotoUrl || t.user?.profilePhotoUrl || '',
          teacherId: t.teacherCode || `TCH-${String(t.id).slice(0, 4).toUpperCase()}`,
          status: t.user?.isActive === false ? 'INACTIVE' : 'ACTIVE',
          joinedDate: t.hireDate || t.createdAt,
          notes: t.specialization || '',
          assignedClasses: (t.classes || []).map((ct: any) => ({
            id: ct.class?.id || ct.classId,
            name: ct.class?.name || '—',
            schedule: ct.class?.academicYear || '',
            subject: ct.class?.level || '',
          })),
          subjects: (t.subjects || []).map((st: any) => st.subject?.name).filter(Boolean),
        });
      } catch (error) {
        console.error('Error fetching teacher:', error);
        toast.error('Failed to load teacher profile');
      } finally {
        setLoading(false);
      }
    };
    fetchTeacher();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/teachers" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teachers
        </Button>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading teacher profile...</span>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/teachers" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teachers
        </Button>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 text-center text-slate-500">
          Teacher profile not found.
        </div>
      </div>
    );
  }

  const handleCreateAccount = () => {
    setIsCreatingAccount(true);
    setTimeout(() => {
      toast.success('Login account created successfully');
      setIsCreatingAccount(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/teachers" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Teachers
          </Button>
          <div className="flex items-center gap-4">
            <UserAvatar name={`${teacher.firstName} ${teacher.lastName}`} src={teacher.photoUrl} rounded="2xl" className="h-20 w-20 border-4 border-white dark:border-surface-raised shadow-md text-2xl" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{teacher.firstName} {teacher.lastName}</h1>
                <Badge className="bg-emerald-500">{teacher.status}</Badge>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                <span className="font-mono text-xs">{teacher.teacherId}</span>
                <span className="text-slate-300">•</span>
                <span>{(teacher.employmentType || 'FULL_TIME').replace('_', ' ')}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Print PDF
          </Button>
          <Button variant="outline" render={<Link to={`/teachers/${id}/edit`} />} nativeButton={false}>
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
          {!teacher.userId ? (
            <Button onClick={handleCreateAccount} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isCreatingAccount}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {isCreatingAccount ? 'Creating...' : 'Create Account'}
            </Button>
          ) : (
            <Button variant="secondary" className="text-blue-600 bg-blue-50 hover:bg-blue-100">
               <UserCircle className="mr-2 h-4 w-4" /> Manage Account
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm">
        <div className="px-6 pt-4">
          <TabsList className="bg-transparent border-b border-slate-100 dark:border-surface-raised w-full justify-start rounded-none h-12 gap-6">
            <TabsTrigger value="overview" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Overview</TabsTrigger>
            <TabsTrigger value="classes" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Assigned Classes</TabsTrigger>
            <TabsTrigger value="subjects" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Subjects</TabsTrigger>
            <TabsTrigger value="activity" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Activity Logs</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-aubergine-500" /> Basic Details
              </h3>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-50 dark:border-surface-raised">
                  <span className="text-slate-500">Gender</span>
                  <span className="font-medium text-slate-900 dark:text-white">{teacher.gender || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50 dark:border-surface-raised">
                  <span className="text-slate-500">Joined Date</span>
                  <span className="font-medium text-slate-900 dark:text-white">{teacher.joinedDate ? new Date(teacher.joinedDate).toLocaleDateString() : '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50 dark:border-surface-raised">
                  <span className="text-slate-500">Employment</span>
                  <span className="font-medium text-slate-900 dark:text-white">{(teacher.employmentType || 'FULL_TIME').replace('_', ' ')}</span>
                </div>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-aubergine-500" /> Contact Info
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-surface-raised/30 rounded-lg">
                  <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{teacher.email}</p>
                    <p className="text-[10px] text-slate-500">Official Work Email</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-surface-raised/30 rounded-lg">
                  <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{teacher.phone || '—'}</p>
                    <p className="text-[10px] text-slate-500">Personal Contact Number</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-surface-raised/30 rounded-lg">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">{teacher.address || '—'}</p>
                    <p className="text-[10px] text-slate-500">Permanent Residence</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="space-y-4">
             <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
               <Activity className="h-4 w-4 text-aubergine-500" /> Professional Notes
             </h3>
             <div className="p-4 bg-slate-50 dark:bg-surface-raised/30 rounded-xl text-slate-600 dark:text-slate-300 text-sm leading-relaxed border border-slate-100 dark:border-surface-raised italic">
               {teacher.notes || teacher.description || "No notes available."}
             </div>
          </section>
        </TabsContent>

        <TabsContent value="classes" className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {(teacher.assignedClasses || []).map((cls: any) => (
               <div key={cls.id} className="p-5 border border-slate-200 dark:border-surface-raised rounded-xl hover:border-aubergine-300 transition-colors bg-white dark:bg-surface-indigo shadow-sm flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="h-10 w-10 bg-slate-50 dark:bg-surface-raised rounded-lg flex items-center justify-center text-slate-500">
                     <BookOpen className="h-5 w-5" />
                   </div>
                   <div>
                     <h4 className="font-bold text-slate-900 dark:text-white">{cls.name}</h4>
                     <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                       <Clock className="h-3 w-3" /> {cls.schedule}
                     </p>
                   </div>
                 </div>
                 <Badge variant="secondary">{cls.subject}</Badge>
               </div>
             ))}
             {(!teacher.assignedClasses || teacher.assignedClasses.length === 0) && (
               <div className="col-span-full py-20 text-center text-slate-500">
                 <p>No classes assigned yet.</p>
               </div>
             )}
           </div>
        </TabsContent>

        <TabsContent value="subjects" className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-wrap gap-2">
            {(teacher.subjects || []).map((s: string, idx: number) => (
              <div key={idx} className="px-4 py-3 bg-slate-50 dark:bg-surface-raised rounded-xl border border-slate-100 dark:border-surface-raised flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-aubergine-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">{s}</span>
              </div>
            ))}
            {(!teacher.subjects || teacher.subjects.length === 0) && (
              <p className="text-slate-500">No subjects assigned.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center py-8 text-slate-500">
            <Activity className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p>Activity tracking will be implemented soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
