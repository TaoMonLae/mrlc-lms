import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Users,
  BookOpen,
  Clock,
  CheckCircle2,
  Calendar,
  MoreVertical,
  Archive,
  GraduationCap,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '../../lib/permissions';
import { toast } from 'sonner';

const MOCK_CLASS = {
  id: 'c1',
  name: 'Pre-GED',
  level: 'Foundation',
  academicYear: '2025-2026',
  description: 'Foundation class for students preparing for GED. Focuses on core subjects like basic mathematics, reading comprehension, and fundamental writing skills.',
  classTeacherId: 't1',
  classTeacherName: 'Tao Mon Lae',
  status: 'ACTIVE',
  studentCount: 45,
  attendanceAvg: 92,
  activeExams: 2,
};

const MOCK_TEACHERS = [
  { id: 't1', name: 'Tao Mon Lae', role: 'Main Teacher', subject: 'Maths' },
  { id: 't2', name: 'Aye Myat Thu', role: 'Assistant', subject: 'English' },
];

const MOCK_STUDENTS = [
  { id: 's1', name: 'Min Khant Aung', studentId: 'STD-2024-001', attendance: '95%' },
  { id: 's2', name: 'Zun Pwint Phyu', studentId: 'STD-2024-002', attendance: '88%' },
];

const MOCK_SUBJECTS = ['Mathematics', 'English', 'Science', 'Social Studies'];

export default function ClassProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { hasPermission } = usePermissions();
  const canManageClass = hasPermission('manage_classes');

  const handleArchive = () => {
    toast.success('Class has been archived.');
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/classes" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{MOCK_CLASS.name}</h1>
            <Badge className={MOCK_CLASS.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-500'}>
              {MOCK_CLASS.status}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-2 font-medium">
            <span>{MOCK_CLASS.level}</span>
            <span className="text-slate-300">•</span>
            <span>{MOCK_CLASS.academicYear}</span>
          </p>
        </div>
        {canManageClass && (
          <div className="flex gap-2">
            <Button variant="outline" render={<Link to={`/classes/${id}/edit`} />} nativeButton={false}>
              <Edit className="mr-2 h-4 w-4" /> Edit Class
            </Button>
            <Button variant="secondary" className="text-amber-600 bg-amber-50 hover:bg-amber-100" onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" /> Archive
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_CLASS.studentCount}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Students</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_CLASS.attendanceAvg}%</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Attendance</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-aubergine-100 dark:bg-aubergine-900/30 flex items-center justify-center text-aubergine-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{MOCK_CLASS.activeExams}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Active Exams</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <Link to={`/teachers/${MOCK_CLASS.classTeacherId}`} className="text-sm font-bold text-slate-900 dark:text-white hover:underline truncate inline-block max-w-[100px]">{MOCK_CLASS.classTeacherName}</Link>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Main Teacher</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm">
        <div className="px-6 pt-4 overflow-x-auto">
          <TabsList className="bg-transparent border-b border-slate-100 dark:border-surface-raised w-full justify-start rounded-none h-12 gap-6 min-w-[600px]">
            <TabsTrigger value="overview" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Overview</TabsTrigger>
            <TabsTrigger value="students" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Students</TabsTrigger>
            <TabsTrigger value="teachers" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Teachers</TabsTrigger>
            <TabsTrigger value="subjects" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Subjects</TabsTrigger>
            <TabsTrigger value="attendance" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Attendance</TabsTrigger>
            <TabsTrigger value="exams" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Exams</TabsTrigger>
            <TabsTrigger value="timetable" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Timetable</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="prose dark:prose-invert max-w-none">
            <h3>Description</h3>
            <p className="text-slate-600 dark:text-slate-300">{MOCK_CLASS.description}</p>
          </div>
        </TabsContent>

        <TabsContent value="students" className="p-0 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 border-b border-slate-200 dark:border-surface-raised flex justify-end">
            <Button size="sm"><Users className="w-4 h-4 mr-2" /> Assign Students</Button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Attendance</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_STUDENTS.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    <Link to={`/students/${student.id}`} className="hover:underline hover:text-aubergine-600">{student.name}</Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono">{student.studentId}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">{student.attendance}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-destructive">Remove</Button>
                  </td>
                </tr>
              ))}
              {MOCK_STUDENTS.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">No students assigned.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="teachers" className="p-0 animate-in fade-in slide-in-from-bottom-2">
          <div className="p-4 border-b border-slate-200 dark:border-surface-raised flex justify-end">
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Assign Teacher</Button>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
              <tr>
                <th className="px-6 py-4">Teacher</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_TEACHERS.map(teacher => (
                <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    <Link to={`/teachers/${teacher.id}`} className="hover:underline hover:text-aubergine-600">{teacher.name}</Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{teacher.role}</td>
                  <td className="px-6 py-4"><Badge variant="secondary">{teacher.subject}</Badge></td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" className="text-destructive">Remove</Button>
                  </td>
                </tr>
              ))}
              {MOCK_TEACHERS.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">No teachers assigned.</td>
                </tr>
              )}
            </tbody>
          </table>
        </TabsContent>

        <TabsContent value="subjects" className="p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Assigned Subjects</h3>
            <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-2" /> Add Subject</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {MOCK_SUBJECTS.map(s => (
              <Badge key={s} variant="outline" className="px-3 py-1.5 text-sm font-medium border-slate-200">
                {s}
              </Badge>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center py-10">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">Attendance Records</p>
            <p className="text-slate-500 text-sm mb-6">View and manage daily attendance for this class.</p>
            <Button render={<Link to="/attendance" />} nativeButton={false}>Go to Attendance Module</Button>
          </div>
        </TabsContent>

        <TabsContent value="exams" className="p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center py-10">
            <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">Exams & Assessments</p>
            <p className="text-slate-500 text-sm mb-6">Manage assignments, quizzes, and exams for this class.</p>
            <Button render={<Link to="/exams" />} nativeButton={false}>Go to Exams Module</Button>
          </div>
        </TabsContent>

        <TabsContent value="timetable" className="p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center py-10">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">Class Timetable</p>
            <p className="text-slate-500 text-sm">Timetable management coming soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
