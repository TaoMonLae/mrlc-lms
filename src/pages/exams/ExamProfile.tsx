import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, Edit, Play, Users, BarChart3, Clock, CheckCircle2, Settings, Trash2, BookOpenCheck, Loader2, ChevronDown, CalendarClock, Printer, ListChecks, Radio, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import './exam-profile.css';
import { toast } from 'sonner';
import { apiSend } from '../../lib/api';
import { apiGet } from '../../lib/api';
import { useAuth } from '../../providers/AuthProvider';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

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
  const { user } = useAuth();
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionRows, setPermissionRows] = useState<{ teacherUserId: string; name: string; allowed: boolean }[]>([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState('');

  const openPermissions = async () => {
    setPermissionOpen(true);
    setPermissionLoading(true);
    setPermissionError('');
    try { setPermissionRows(await apiGet(`/api/exams/${id}/answer-key-permissions`)); }
    catch (error: any) { setPermissionError(error.message || 'Could not load assigned teachers.'); }
    finally { setPermissionLoading(false); }
  };

  const changePermission = async (teacherUserId: string, allowed: boolean) => {
    setPermissionBusy(teacherUserId);
    setPermissionError('');
    try {
      await apiSend(`/api/exams/${id}/answer-key-permissions`, 'PUT', { teacherUserId, allowed });
      setPermissionRows(rows => rows.map(row => row.teacherUserId === teacherUserId ? { ...row, allowed } : row));
      toast.success(allowed ? 'Answer-key permission granted' : 'Answer-key permission revoked');
    } catch (error: any) { setPermissionError(error.message || 'Could not update permission.'); }
    finally { setPermissionBusy(null); }
  };

  const handleSyncGradebook = async () => {
    if (!confirm('Sync best exam scores into the gradebook for this class?')) return;
    setSyncing(true);
    try {
      const res = await apiSend<{ count: number }>(`/api/exams/${id}/sync-gradebook`, 'POST');
      toast.success(`Synced ${res?.count ?? 0} score(s) to gradebook`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to sync to gradebook');
    } finally {
      setSyncing(false);
    }
  };

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
          recentSubmissions: completed.slice(0, 8).map((a: any) => ({
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
        <span className="ml-3 text-muted-foreground">Loading exam...</span>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground hover:text-foreground" render={<Link to="/exams" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <div className="bg-card border border-border rounded-sm p-8 text-center text-muted-foreground">
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
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-muted-foreground hover:text-foreground" render={<Link to="/exams" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Exams
        </Button>
        <header className="exam-profile-header">
          <div className="exam-profile-title">
            <div className="exam-profile-eyebrow">EXAM OVERVIEW <Badge className={exam.status === 'PUBLISHED' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-100 text-amber-800 hover:bg-amber-100'}>{exam.status}</Badge></div>
            <h1>{exam.title}</h1>
            <p>{exam.className}<span aria-hidden="true">·</span>{exam.subject}</p>
          </div>
          <nav className="exam-commandbar" aria-label="Exam actions">
            <div className="exam-command-groups">
              <DropdownMenu>
                <DropdownMenuTrigger className="exam-command-trigger"><Settings size={16} />Manage exam<ChevronDown size={14} /></DropdownMenuTrigger>
                <DropdownMenuContent className="exam-command-menu" sideOffset={10}>
                  <div className="exam-menu-heading">EXAM WORKSPACE</div>
                  <DropdownMenuItem render={<Link to={`/exam2/${id}/author`} />} nativeButton={false}><Edit /><span><strong>Author content</strong><small>Question bank, content & rubrics</small></span></DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={`/exam2/${id}/schedule`} />} nativeButton={false}><CalendarClock /><span><strong>Schedule</strong><small>Availability, access & release</small></span></DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={`/exam2/${id}/print`} />} nativeButton={false}><Printer /><span><strong>Print exam</strong><small>Prepare a paper copy</small></span></DropdownMenuItem>
                  {user?.role === 'ADMIN' && ['PUBLISHED', 'ACTIVE', 'SCHEDULED', 'CLOSED'].includes(exam.status) && <DropdownMenuItem onClick={openPermissions}><KeyRound /><span><strong>Answer-key permissions</strong><small>Allow an assigned teacher to correct published answers</small></span></DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleDelete}><Trash2 /><span><strong>Archive</strong><small>Keep records, stop new attempts</small></span></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger className="exam-command-trigger"><ListChecks size={16} />Responses<ChevronDown size={14} /></DropdownMenuTrigger>
                <DropdownMenuContent className="exam-command-menu" sideOffset={10}>
                  <div className="exam-menu-heading">STUDENT RESPONSES</div>
                  <DropdownMenuItem render={<Link to={`/exam2/${id}/invigilator`} />} nativeButton={false}><Radio /><span><strong>Monitor attempts</strong><small>Follow students during the exam</small></span></DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={`/exams/${id}/results`} />} nativeButton={false}><ListChecks /><span><strong>Review student answers</strong><small>See correct, incorrect & partial responses</small></span></DropdownMenuItem>
                  <DropdownMenuItem render={<Link to={`/exam2/grading?examId=${id}`} />} nativeButton={false}><CheckCircle2 /><span><strong>Grade responses</strong><small>Award marks for written answers</small></span></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSyncGradebook} disabled={syncing}>{syncing ? <Loader2 className="animate-spin" /> : <BookOpenCheck />}<span><strong>{syncing ? 'Syncing…' : 'Sync to Gradebook'}</strong><small>Transfer each student’s best score</small></span></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="exam-command-primary">
              <Link className="exam-preview-link" to={`/exams/${id}/preview`}><Play size={15} />Preview</Link>
              <Link className="exam-studio-link" to={`/exams/${id}/studio`}><Edit size={16} />Open in Studio</Link>
            </div>
          </nav>
        </header>
      </div>

      <Dialog open={permissionOpen} onOpenChange={setPermissionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Answer-key permissions</DialogTitle>
          <DialogDescription>Choose which assigned teachers may correct the answer key after publication. Existing submitted answers are rescored when a key changes.</DialogDescription>
          {permissionLoading && <p role="status">Loading teachers…</p>}
          {permissionError && <p role="alert" className="text-sm text-destructive">{permissionError}</p>}
          {!permissionLoading && !permissionRows.length && <p className="text-sm text-muted-foreground">No active teachers are assigned to this class.</p>}
          <div className="space-y-2">
            {permissionRows.map(row => <div key={row.teacherUserId} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="font-medium">{row.name}</span>
              <Button variant={row.allowed ? 'outline' : 'default'} size="sm" disabled={permissionBusy !== null} onClick={() => changePermission(row.teacherUserId, !row.allowed)}>
                {permissionBusy === row.teacherUserId ? 'Saving…' : row.allowed ? 'Revoke' : 'Grant access'}
              </Button>
            </div>)}
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-card p-5 rounded-sm border border-border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{exam.submissions} <span className="text-sm font-normal text-muted-foreground">/ {exam.totalStudents}</span></p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Submitted</p>
          </div>
        </div>
        <div className="bg-card p-5 rounded-sm border border-border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{exam.avgScore}%</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Avg Score</p>
          </div>
        </div>
        <div className="bg-card p-5 rounded-sm border border-border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-aubergine-100 dark:bg-aubergine-900/30 flex items-center justify-center text-aubergine-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{exam.durationMinutes}m</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Duration</p>
          </div>
        </div>
        <div className="bg-card p-5 rounded-sm border border-border shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-lavender flex items-center justify-center text-accent-purple">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{exam.totalPoints}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">Total Points</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-sm overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="font-semibold text-foreground">Recent Submissions</h2>
              <Button variant="ghost" size="sm" render={<Link to={`/exams/${id}/results`} />} nativeButton={false}>Review all answers</Button>
            </div>
            <div className="p-0 overflow-x-auto">
               <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="px-6 py-3">Student</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Time Taken</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {exam.recentSubmissions.map(sub => (
                    <tr key={sub.id} className="hover:bg-muted/50">
                      <td className="px-6 py-3 font-medium text-foreground">
                        <Link to={`/students/${sub.studentId}`} className="hover:underline hover:text-aubergine-600">{sub.studentName}</Link>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">{sub.score !== null ? `${sub.score}` : 'Pending grading'}</td>
                      <td className="px-6 py-3 text-muted-foreground">{formatTime(sub.startedAt, sub.completedAt)}</td>
                      <td className="px-6 py-3 text-right">
                        <Button variant="ghost" size="sm" render={<Link to={`/exams/${id}/results?attemptId=${sub.id}`} />} nativeButton={false}>Review</Button>
                      </td>
                    </tr>
                  ))}
                  {exam.recentSubmissions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No submissions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-sm p-5 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4 flex items-center">
              <Settings className="h-4 w-4 mr-2" /> Properties
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Class Target</span>
                <span className="font-medium text-foreground">{exam.className}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject</span>
                <span className="font-medium text-foreground">{exam.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium text-foreground">{exam.type}</span>
              </div>
               <div className="flex justify-between">
                <span className="text-muted-foreground">Timer</span>
                <span className="font-medium text-foreground">{exam.durationMinutes ? `${exam.durationMinutes} min` : 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
