import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Clock, CheckCircle2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { apiSend } from '../../lib/api';

type ExamListRow = {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalPoints: number;
  status: string;
  className: string;
};

export default function ExamsList() {
  const [exams, setExams] = useState<ExamListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const handleArchive = async (exam: ExamListRow) => {
    if (!confirm(`Archive "${exam.title}"? It will be hidden and can no longer be started, but the exam and all attempts are preserved. You can restore it from "Show archived".`)) return;
    try {
      await apiSend(`/api/exams/${exam.id}`, 'DELETE');
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
      toast.success('Exam archived');
    } catch (e: any) {
      toast.error(e.message || 'Failed to archive exam');
    }
  };

  const handleRestore = async (exam: ExamListRow) => {
    try {
      await apiSend(`/api/exams/${exam.id}/restore`, 'POST');
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
      toast.success('Exam restored to draft');
    } catch (e: any) {
      toast.error(e.message || 'Failed to restore exam');
    }
  };

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/exams${showArchived ? '?archived=1' : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            toast.error('You do not have permission to view exams');
          } else {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to fetch exams');
          }
          return;
        }
        const data = await res.json();
        setExams((Array.isArray(data) ? data : []).map((e: any) => ({
          id: e.id,
          title: e.title || 'Untitled',
          subject: e.subject?.name || '—',
          durationMinutes: e.durationMinutes || 0,
          totalPoints: e.totalMarks ?? (e.questions || []).reduce((sum: number, q: any) => sum + (q.points || 0), 0),
          status: e.status || (e.type === 'MOCK' ? 'DRAFT' : 'PUBLISHED'),
          className: e.class?.name || '—',
        })));
      } catch (error: any) {
        console.error('Error fetching exams:', error);
        toast.error(error?.message || 'Failed to load exams');
      } finally {
        setLoading(false);
      }
    };
    fetchExams();
  }, [showArchived]);

  const filteredExams = exams.filter(e => {
    const q = searchTerm.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q) || e.className.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Exams</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage assessments, quizzes, and standard tests.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className={showArchived ? 'border-aubergine-400 text-aubergine-600' : ''} onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Show active' : 'Show archived'}
          </Button>
          {!showArchived && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/exams/new" />} nativeButton={false}>
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search exams by title, subject..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading exams...</span>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center">
          <p className="text-lg font-medium text-slate-900 dark:text-white">No exams found</p>
          <p className="text-sm text-slate-500">{searchTerm ? 'Try adjusting your search.' : 'Create your first exam to get started.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map(exam => (
            <div key={exam.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm flex flex-col hover:border-aubergine-200 dark:hover:border-aubergine-900/50 transition-colors">
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
                      <DropdownMenuItem render={<Link to={`/exam2/${exam.id}/author`} />} nativeButton={false}>Author content</DropdownMenuItem>
                      <DropdownMenuItem render={<Link to={`/exam2/${exam.id}/schedule`} />} nativeButton={false}>Schedule &amp; release</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem render={<Link to={`/exams/${exam.id}/preview`} />} nativeButton={false}>Preview</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {showArchived ? (
                        <DropdownMenuItem className="text-emerald-600" onClick={() => handleRestore(exam)}>Restore exam</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="text-red-600" onClick={() => handleArchive(exam)}>Archive exam</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{exam.title}</h3>
                <p className="text-slate-500 text-sm mb-4">{exam.subject}</p>

                <div className="space-y-2 mt-auto">
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                    <Clock className="mr-2 h-4 w-4 text-slate-400" />
                    {exam.durationMinutes} Minutes
                  </div>
                  <div className="flex items-center text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="mr-2 h-4 w-4 text-slate-400" />
                    {exam.totalPoints} Points Total
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-surface-raised/50 p-4 border-t border-slate-100 dark:border-surface-raised flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">{exam.className}</span>
                <Button variant="ghost" size="sm" className="text-aubergine-600 hover:text-aubergine-700 hover:bg-aubergine-50 dark:hover:bg-aubergine-900/20" render={<Link to={`/exams/${exam.id}`} />} nativeButton={false}>
                  Manage <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
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
