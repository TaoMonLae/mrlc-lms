import React, { useState } from 'react';
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
  UserCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { type Teacher, type TeacherActivity } from '../../types/teacher';

const MOCK_TEACHER: Teacher | null = import.meta.env.DEV ? {
  id: 't1',
  teacherId: 'TCH-001',
  firstName: 'Htet',
  lastName: 'Wai Yan',
  gender: 'MALE',
  email: 'htetwaiyan@lms.edu',
  phone: '09772123456',
  address: 'No 12., Inya Lake Rd, Kamayut Tsp, Yangon, Myanmar',
  subjects: ['Mathematics', 'Physics', 'Advanced Algebra'],
  assignedClasses: [
    { id: 'c1', name: 'GED Math Prep', subject: 'Math', schedule: 'Mon/Wed 9:00 AM' },
    { id: 'c4', name: 'Standard X (Maths)', subject: 'Math', schedule: 'Fri 10:30 AM' }
  ],
  employmentType: 'FULL_TIME',
  status: 'ACTIVE',
  joinedDate: '2023-01-15',
  photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Htet',
  notes: 'Highly experienced in GED preparation. Lead instructor for STEM department.',
  userId: undefined, // No user account yet
} : null;

const MOCK_ACTIVITIES: TeacherActivity[] = import.meta.env.DEV ? [
  { id: 'a1', type: 'ASSIGN_CLASS', description: 'Assigned to "Standard X (Maths)"', timestamp: '2024-05-10T10:00:00Z' },
  { id: 'a2', type: 'PROFILE_UPDATE', description: 'Updated profile information', timestamp: '2024-05-08T15:30:00Z' },
  { id: 'a3', type: 'REPORT_SUBMIT', description: 'Submitted monthly attendance report', timestamp: '2024-04-30T09:15:00Z' },
] : [];

export default function TeacherProfile() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  if (!MOCK_TEACHER) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/teachers" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teachers
        </Button>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 text-center text-slate-500">
          Teacher profile data is not available from the live API yet.
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
            <img src={MOCK_TEACHER.photoUrl} alt={MOCK_TEACHER.firstName} className="h-20 w-20 rounded-2xl border-4 border-white dark:border-surface-raised shadow-md" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{MOCK_TEACHER.firstName} {MOCK_TEACHER.lastName}</h1>
                <Badge className="bg-emerald-500">{MOCK_TEACHER.status}</Badge>
              </div>
              <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                <span className="font-mono text-xs">{MOCK_TEACHER.teacherId}</span>
                <span className="text-slate-300">•</span>
                <span>{MOCK_TEACHER.employmentType.replace('_', ' ')}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link to={`/teachers/${id}/edit`} />} nativeButton={false}>
            <Edit className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
          {!MOCK_TEACHER.userId ? (
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
                  <span className="font-medium text-slate-900 dark:text-white">{MOCK_TEACHER.gender}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50 dark:border-surface-raised">
                  <span className="text-slate-500">Joined Date</span>
                  <span className="font-medium text-slate-900 dark:text-white">{new Date(MOCK_TEACHER.joinedDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-50 dark:border-surface-raised">
                  <span className="text-slate-500">Employment</span>
                  <span className="font-medium text-slate-900 dark:text-white">{MOCK_TEACHER.employmentType.replace('_', ' ')}</span>
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
                    <p className="font-semibold text-slate-900 dark:text-white">{MOCK_TEACHER.email}</p>
                    <p className="text-[10px] text-slate-500">Official Work Email</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-surface-raised/30 rounded-lg">
                  <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{MOCK_TEACHER.phone}</p>
                    <p className="text-[10px] text-slate-500">Personal Contact Number</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-surface-raised/30 rounded-lg">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white leading-relaxed">{MOCK_TEACHER.address}</p>
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
               "{MOCK_TEACHER.notes}"
             </div>
          </section>
        </TabsContent>

        <TabsContent value="classes" className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {MOCK_TEACHER.assignedClasses.map(cls => (
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
             {MOCK_TEACHER.assignedClasses.length === 0 && (
               <div className="col-span-full py-20 text-center text-slate-500">
                 <p>No classes assigned yet.</p>
               </div>
             )}
           </div>
        </TabsContent>

        <TabsContent value="subjects" className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-wrap gap-2">
            {MOCK_TEACHER.subjects.map(s => (
              <div key={s} className="px-4 py-3 bg-slate-50 dark:bg-surface-raised rounded-xl border border-slate-100 dark:border-surface-raised flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-aubergine-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">{s}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="space-y-8 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
            {MOCK_ACTIVITIES.map(act => (
              <div key={act.id} className="relative pl-12">
                <div className={`absolute left-0 top-0 h-9 w-9 rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm ${
                  act.type === 'LOGIN' ? 'bg-blue-500' :
                  act.type === 'ASSIGN_CLASS' ? 'bg-emerald-500' :
                  act.type === 'PROFILE_UPDATE' ? 'bg-amber-500' : 'bg-slate-500'
                }`}>
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-50 dark:bg-surface-raised/30 p-4 rounded-xl border border-slate-100 dark:border-surface-raised">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{act.description}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {new Date(act.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
