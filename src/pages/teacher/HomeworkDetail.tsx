import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ClipboardList, Lock, LockOpen, Newspaper, Paperclip, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { apiGet, apiSend } from '../../lib/api';

interface Submission {
  id: string;
  studentId: string;
  text?: string | null;
  attachmentUrl?: string | null;
  submittedAt: string;
  status: 'SUBMITTED' | 'MARKED' | 'REDO';
  score?: number | null;
  feedback?: string | null;
}

interface Detail {
  id: string;
  title: string;
  instructions?: string | null;
  attachmentUrl?: string | null;
  dueDate: string;
  maxMarks: number | null;
  status: string;
  gradeItemId?: string | null;
  subject?: { name: string } | null;
  class: { id: string; name: string; students: { id: string; studentCode: string; user?: { firstName?: string; lastName?: string } | null }[] };
  submissions: Submission[];
}

export default function HomeworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    apiGet<Detail>(`/api/homework/${id}`)
      .then(setData)
      .catch((e: any) => toast.error(e?.message || 'Failed to load homework'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const subFor = (studentId: string) => data?.submissions.find((s) => s.studentId === studentId) ?? null;

  const mark = async (studentId: string, status: 'MARKED' | 'REDO') => {
    const d = drafts[studentId] || { score: '', feedback: '' };
    if (status === 'MARKED' && d.score && data?.maxMarks != null && Number(d.score) > data.maxMarks) {
      toast.error(`Score cannot exceed ${data.maxMarks}`);
      return;
    }
    setBusy(studentId);
    try {
      await apiSend(`/api/homework/${id}/mark`, 'POST', {
        studentId, status, score: status === 'MARKED' && d.score !== '' ? Number(d.score) : null, feedback: d.feedback || null,
      });
      toast.success(status === 'MARKED' ? 'Marked' : 'Sent back for redo');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark');
    } finally {
      setBusy(null);
    }
  };

  const toggleClosed = async () => {
    if (!data) return;
    try {
      await apiSend(`/api/homework/${id}`, 'PUT', { status: data.status === 'CLOSED' ? 'OPEN' : 'CLOSED' });
      toast.success(data.status === 'CLOSED' ? 'Reopened for submissions' : 'Closed to new submissions');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const syncGradebook = async () => {
    try {
      const r = await apiSend<{ count: number }>(`/api/homework/${id}/sync-gradebook`, 'POST');
      toast.success(`${r.count} score(s) synced to the gradebook`);
      load();
    } catch (e: any) { toast.error(e.message || 'Failed to sync'); }
  };

  const remove = async () => {
    if (!confirm('Delete this homework and all its submissions?')) return;
    try {
      await apiSend(`/api/homework/${id}`, 'DELETE');
      toast.success('Homework deleted');
      navigate('/teacher/homework');
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); }
  };

  if (loading) return <p className="py-14 text-center text-sm text-slate-500">Loading…</p>;
  if (!data) return <p className="py-14 text-center text-sm text-slate-500">Homework not found.</p>;

  const scoredCount = data.submissions.filter((s) => s.status === 'MARKED' && s.score != null).length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500" render={<Link to="/teacher/homework" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> All Homework
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              {data.title}
              {data.status === 'CLOSED' && <Badge variant="secondary">Closed</Badge>}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {data.class.name}{data.subject ? ` · ${data.subject.name}` : ''} · due {new Date(data.dueDate).toLocaleDateString()}
              {data.maxMarks != null ? ` · out of ${data.maxMarks}` : ' · check-off (no marks)'}
            </p>
            {data.instructions && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{data.instructions}</p>}
            {data.attachmentUrl && (
              <a href={data.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-aubergine-600 underline">
                {data.attachmentUrl.startsWith('/news/') ? <><Newspaper className="h-3.5 w-3.5" /> Linked News article</> : <><Paperclip className="h-3.5 w-3.5" /> Worksheet attachment</>}
              </a>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={toggleClosed}>
              {data.status === 'CLOSED' ? <><LockOpen className="mr-2 h-4 w-4" /> Reopen</> : <><Lock className="mr-2 h-4 w-4" /> Close</>}
            </Button>
            {data.maxMarks != null && (
              <Button variant="outline" size="sm" onClick={syncGradebook} disabled={scoredCount === 0} title={scoredCount === 0 ? 'Mark some submissions with scores first' : undefined}>
                <ClipboardList className="mr-2 h-4 w-4" /> Sync to Gradebook{data.gradeItemId ? ' ✓' : ''}
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-rose-600" onClick={remove}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-surface-raised/50">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Submission</th>
              {data.maxMarks != null && <th className="px-4 py-3 w-24">Score</th>}
              <th className="px-4 py-3">Feedback</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.class.students.map((st) => {
              const sub = subFor(st.id);
              const name = `${st.user?.firstName ?? ''} ${st.user?.lastName ?? ''}`.trim() || st.studentCode;
              const d = drafts[st.id] ?? { score: sub?.score != null ? String(sub.score) : '', feedback: sub?.feedback ?? '' };
              const late = sub && new Date(sub.submittedAt) > new Date(data.dueDate);
              return (
                <tr key={st.id} className="align-top hover:bg-slate-50 dark:hover:bg-surface-raised/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900 dark:text-white">{name}</p>
                    <p className="font-mono text-[11px] text-slate-400">{st.studentCode}</p>
                    {sub?.status === 'MARKED' && <Badge className="mt-1 bg-emerald-500 text-white">Marked</Badge>}
                    {sub?.status === 'REDO' && <Badge className="mt-1 bg-amber-500 text-white">Redo</Badge>}
                    {sub?.status === 'SUBMITTED' && <Badge className="mt-1" variant="secondary">Submitted{late ? ' · late' : ''}</Badge>}
                    {!sub && <Badge className="mt-1" variant="outline">Missing</Badge>}
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    {sub ? (
                      <div className="space-y-1">
                        {sub.text && <p className="whitespace-pre-wrap break-words text-xs text-slate-600 dark:text-slate-300">{sub.text}</p>}
                        {sub.attachmentUrl && (
                          <a href={sub.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-aubergine-600 underline">
                            <Paperclip className="h-3 w-3" /> View attachment
                          </a>
                        )}
                        <p className="text-[10px] text-slate-400">{new Date(sub.submittedAt).toLocaleString()}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No submission yet (mark anyway if handed in on paper)</span>
                    )}
                  </td>
                  {data.maxMarks != null && (
                    <td className="px-4 py-3">
                      <Input
                        type="number" min="0" max={data.maxMarks} className="h-8 w-20"
                        value={d.score}
                        placeholder="—"
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [st.id]: { ...d, score: e.target.value } }))}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Input
                      className="h-8"
                      value={d.feedback}
                      placeholder="Optional feedback"
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [st.id]: { ...d, feedback: e.target.value } }))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 text-emerald-600" disabled={busy === st.id} onClick={() => mark(st.id, 'MARKED')}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-amber-600" disabled={busy === st.id || !sub} onClick={() => mark(st.id, 'REDO')} title="Send back for redo">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.class.students.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">No students in this class.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
