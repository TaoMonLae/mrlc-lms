import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Play, Users, BarChart3, Clock, CheckCircle2, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiSend } from '../../lib/api';

type SubmissionRow = {
  id: string;
  studentName: string;
  studentId: string;
  score: number | null;
  completedAt: string | null;
  startedAt: string | null;
};

type ExamData = {
  id: string;
  title: string;
  subject: string;
  className: string;
  type: string;
  durationMinutes: number;
  totalPoints: number;
  status: string;
  submissions: number;
  totalStudents: number;
  avgScore: number;
  recentSubmissions: SubmissionRow[];
};

const fullName = (u: any) => `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || 'Unknown';

export default function ExamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);

  const handleDelete = async () => {
    if (!confirm('Archive this exam? It will be hidden from lists and can no longer be started, but the exam and all student attempts are preserved. You can restore it later.')) return;
    try {
      await apiSend(`/api/exams/${id}`, 'DELETE');
      toast.success('Exam archived');
      navigate('/exams');
    } catch (e: any) {
      toast.error(e.message || 'Failed to archive exam');
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchExam = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch(`/api/exams/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 404) {
            setExam(null);
          } else if (res.status === 401 || res.status === 403) {
            toast.error('You do not have permission to view this exam');
          } else {
            throw new Error('Failed to fetch exam');
          }
          return;
        }
        const data = await res.json();
        const attempts = data.attempts || [];
        const completed = attempts.filter((a: any) => a.isCompleted);
        const scored = completed.filter((a: any) => typeof a.score === 'number');
        const avgScore = scored.length
          ? Math.round(scored.reduce((s: number, a: any) => {
              const total = data.totalMarks || 100;
              return s + ((a.score / total) * 100);
            }, 0) / scored.length)
          : 0;
        const totalPoints = data.totalMarks ?? (data.questions || []).reduce((s: number, q: any) => s + (q.points || 0), 0);
        setExam({
          id: data.id,
          title: data.title || 'Untitled',
          subject: data.subject?.name || '—',
          className: data.class?.name || '—',
          type: data.type || '—',
          durationMinutes: data.durationMinutes || 0,
          totalPoints,
          status: data.status || (data.type === 'MOCK' ? 'DRAFT' : 'PUBLISHED'),
          submissions: completed.length,
          totalStudents: data.class?._count?.students ?? attempts.length,
          avgScore,
          recentSubmissions: attempts.slice(0, 8).map((a: any) => ({
            id: a.id,
            studentName: fullName(a.student?.user),
            studentId: a.studentId,
            score: typeof a.score === 'number' ? a.score : null,
            completedAt: a.completedAt || null,
            startedAt: a.startedAt || null,
          })),
        });
      } catch (error) {
        console.error('Error fetching exam:', error);
        toast.error('Failed to load exam');
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading exam...</span>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/exams" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 text-center text-slate-500">
          Exam not found.
        </div>
      </div>
    );
  }

  const formatTime = (start: string | null, end: string | null) => {
    if (!start || !end) return '—';
    const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
    return mins >= 0 ? `${mins}m` : '—';
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/exams" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{exam.title}</h1>
            <Badge className={exam.status === 'PUBLISHED' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>{exam.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link to={`/exams/${id}/edit`} />} nativeButton={false}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" render={<Link to={`/exam2/${id}/author`} />} nativeButton={false}>
              Author content
            </Button>
            <Button variant="outline" render={<Link to={`/exam2/${id}/schedule`} />} nativeButton={false}>
              Schedule
            </Button>
            <Button variant="secondary" className="text-aubergine-600 bg-aubergine-50 hover:bg-aubergine-100 dark:bg-aubergine-900/20 dark:hover:bg-aubergine-900/40" render={<Link to={`/exams/${id}/preview`} />} nativeButton={false}>
              <Play className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Archive
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{exam.submissions} <span className="text-sm font-normal text-slate-500">/ {exam.totalStudents}</span></p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Submitted</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{exam.avgScore}%</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Avg Score</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-aubergine-100 dark:bg-aubergine-900/30 flex items-center justify-center text-aubergine-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{exam.durationMinutes}m</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Duration</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{exam.totalPoints}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Total Points</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-surface-raised flex justify-between items-center">
              <h2 className="font-semibold text-slate-900 dark:text-white">Recent Submissions</h2>
              <Button variant="ghost" size="sm" render={<Link to={`/exam2/${id}/analytics`} />} nativeButton={false}>View All Results</Button>
            </div>
            <div className="p-0">
               <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
                  <tr>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Time Taken</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {exam.recentSubmissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                        <Link to={`/students/${sub.studentId}`} className="hover:underline hover:text-aubergine-600">{sub.studentName}</Link>
                      </td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{sub.score !== null ? `${sub.score}` : 'In progress'}</td>
                      <td className="px-6 py-3 text-slate-500">{formatTime(sub.startedAt, sub.completedAt)}</td>
                      <td className="px-6 py-3 text-right">
                        <Button variant="ghost" size="sm" render={<Link to={`/exam2/${id}/analytics`} />} nativeButton={false}>View</Button>
                      </td>
                    </tr>
                  ))}
                  {exam.recentSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No submissions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
              <Settings className="h-4 w-4 mr-2" /> Properties
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Class Target</span>
                <span className="font-medium text-slate-900 dark:text-white">{exam.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subject</span>
                <span className="font-medium text-slate-900 dark:text-white">{exam.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-900 dark:text-white">{exam.type}</span>
              </div>
               <div className="flex justify-between">
                <span className="text-slate-500">Timer</span>
                <span className="font-medium text-slate-900 dark:text-white">{exam.durationMinutes ? `${exam.durationMinutes} min` : 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
