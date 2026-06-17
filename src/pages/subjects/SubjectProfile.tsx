import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Book, 
  Archive,
  BookOpen,
  Users,
  GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const MOCK_SUBJECT = {
  id: 's1',
  name: 'Mathematical Reasoning',
  code: 'GED-MATH',
  level: 'Advanced',
  description: 'GED Mathematical Reasoning focuses on quantitative problem solving and algebraic problem solving. Students will cover number operations, geometry, data analysis, and basic algebra concepts necessary for passing the GED math exam.',
  status: 'ACTIVE',
};

const MOCK_CLASSES = [
  { id: 'c1', name: 'GED Morning', term: 'Fall 2025' },
  { id: 'c2', name: 'GED Evening', term: 'Fall 2025' },
];

const MOCK_TEACHERS = [
  { id: 't1', name: 'Htet Wai Yan', employmentType: 'FULL_TIME' },
];

const MOCK_EXAMS = [
  { id: 'e1', title: 'Math Midterm', date: '2025-10-15', status: 'COMPLETED' },
  { id: 'e2', title: 'Math Final Practice', date: '2025-12-01', status: 'SCHEDULED' },
];

export default function SubjectProfile() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Hardcoded for demo - should come from auth
  const userRole = 'ADMIN';

  const handleArchive = () => {
    toast.success('Subject has been archived.');
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/subjects" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subjects
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{MOCK_SUBJECT.name}</h1>
            <Badge className={MOCK_SUBJECT.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-500'}>
              {MOCK_SUBJECT.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-2 font-medium">
            <span>{MOCK_SUBJECT.code}</span>
            <span className="text-slate-300">•</span>
            <span>{MOCK_SUBJECT.level}</span>
          </p>
        </div>
        {userRole === 'ADMIN' && (
          <div className="flex gap-2">
            <Button variant="outline" render={<Link to={`/subjects/${id}/edit`} />} nativeButton={false}>
              <Edit className="mr-2 h-4 w-4" /> Edit Subject
            </Button>
            <Button variant="secondary" className="text-amber-600 bg-amber-50 hover:bg-amber-100" onClick={handleArchive}>
               <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_CLASSES.length}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Assigned Classes</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
             <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_TEACHERS.length}</p>
             <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Assigned Teachers</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-aubergine-100 dark:bg-aubergine-900/30 flex items-center justify-center text-aubergine-600">
            <Book className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_EXAMS.length}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Related Exams</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm">
        <div className="px-6 pt-4 overflow-x-auto">
          <TabsList className="bg-transparent border-b border-slate-100 dark:border-surface-raised w-full justify-start rounded-none h-12 gap-6 min-w-[500px]">
            <TabsTrigger value="overview" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Overview</TabsTrigger>
            <TabsTrigger value="classes" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Classes</TabsTrigger>
            <TabsTrigger value="teachers" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Teachers</TabsTrigger>
            <TabsTrigger value="exams" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Exams</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="prose dark:prose-invert max-w-none">
             <h3>Syllabus / Description</h3>
             <p className="text-slate-600 dark:text-slate-300">{MOCK_SUBJECT.description}</p>
          </div>
        </TabsContent>

        <TabsContent value="classes" className="p-0 animate-in fade-in slide-in-from-bottom-2">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
                <tr>
                  <th className="px-6 py-4">Class Name</th>
                  <th className="px-6 py-4">Term</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {MOCK_CLASSES.map(cls => (
                 <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      <Link to={`/classes/${cls.id}`} className="hover:underline hover:text-aubergine-600">{cls.name}</Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{cls.term}</td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="sm" className="text-destructive">Unassign</Button>
                    </td>
                 </tr>
               ))}
               {MOCK_CLASSES.length === 0 && (
                 <tr>
                   <td colSpan={3} className="py-8 text-center text-slate-500">No classes assigned to this subject.</td>
                 </tr>
               )}
             </tbody>
           </table>
        </TabsContent>

        <TabsContent value="teachers" className="p-0 animate-in fade-in slide-in-from-bottom-2">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
                <tr>
                  <th className="px-6 py-4">Teacher</th>
                  <th className="px-6 py-4">Employment</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {MOCK_TEACHERS.map(teacher => (
                 <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      <Link to={`/teachers/${teacher.id}`} className="hover:underline hover:text-aubergine-600">{teacher.name}</Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{teacher.employmentType.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="sm" className="text-destructive">Remove</Button>
                    </td>
                 </tr>
               ))}
               {MOCK_TEACHERS.length === 0 && (
                 <tr>
                   <td colSpan={3} className="py-8 text-center text-slate-500">No teachers assigned to teach this subject.</td>
                 </tr>
               )}
             </tbody>
           </table>
        </TabsContent>

        <TabsContent value="exams" className="p-0 animate-in fade-in slide-in-from-bottom-2">
           <table className="w-full text-left text-sm">
             <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
                <tr>
                  <th className="px-6 py-4">Exam Title</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
               {MOCK_EXAMS.map(exam => (
                 <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                      <Link to={`/exams/${exam.id}/results`} className="hover:underline hover:text-aubergine-600">{exam.title}</Link>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(exam.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Badge variant={exam.status === 'COMPLETED' ? 'default' : 'outline'} className={exam.status === 'COMPLETED' ? 'bg-emerald-500' : ''}>
                        {exam.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <Button variant="ghost" size="sm">View</Button>
                    </td>
                 </tr>
               ))}
               {MOCK_EXAMS.length === 0 && (
                 <tr>
                   <td colSpan={4} className="py-8 text-center text-slate-500">No exams created for this subject yet.</td>
                 </tr>
               )}
             </tbody>
           </table>
        </TabsContent>
      </Tabs>
    </div>
  );
}
