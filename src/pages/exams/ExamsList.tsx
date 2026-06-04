import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus, Search, MoreHorizontal, Clock, Calendar, CheckCircle2, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const MOCK_EXAMS = [
  { id: 'e1', title: 'GED Math Midterm', subject: 'Math', durationMinutes: 60, totalPoints: 100, status: 'PUBLISHED', classId: 'c1', className: 'Pre-GED Foundation' },
  { id: 'e2', title: 'GED RLA Practice Test 1', subject: 'English', durationMinutes: 90, totalPoints: 150, status: 'DRAFT', classId: 'c2', className: 'GED Level A' },
  { id: 'e3', title: 'Social Studies Final', subject: 'Social Studies', durationMinutes: 120, totalPoints: 200, status: 'CLOSED', classId: 'c3', className: 'GED Level B' },
];

export default function ExamsList() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Exams</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Manage assessments, quizzes, and standard tests.</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto" render={<Link to="/exams/new" />} nativeButton={false}>
          <Plus className="mr-2 h-4 w-4" />
          Create Exam
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search exams by title, subject..." className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_EXAMS.map(exam => (
          <div key={exam.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col hover:border-orange-200 dark:hover:border-orange-900/50 transition-colors">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <Badge variant={exam.status === 'PUBLISHED' ? 'default' : exam.status === 'DRAFT' ? 'secondary' : 'outline'}
                  className={
                    exam.status === 'PUBLISHED' ? 'bg-emerald-500 hover:bg-emerald-600' :
                    exam.status === 'DRAFT' ? 'bg-amber-100 text-amber-800 hover:bg-amber-100' : ''
                  }
                >
                  {exam.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />} nativeButton={true}>
                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem render={<Link to={`/exams/${exam.id}`} />} nativeButton={false}>View Dashboard</DropdownMenuItem>
                    <DropdownMenuItem render={<Link to={`/exams/${exam.id}/edit`} />} nativeButton={false}>Edit Exam</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem render={<Link to={`/exams/${exam.id}/take`} />} nativeButton={false}>Preview (Take Exam)</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{exam.title}</h3>
              <p className="text-slate-500 text-sm mb-4">{exam.subject}</p>
              
              <div className="space-y-2 mt-auto">
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <Clock className="mr-2 h-4 w-4 text-slate-400" />
                  {exam.durationMinutes} Minutes
                </div>
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-slate-400" />
                  {exam.totalPoints} Points Total
                </div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-500 font-medium">{exam.className}</span>
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20" render={<Link to={`/exams/${exam.id}`} />} nativeButton={false}>
                Manage <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArrowRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  )
}
