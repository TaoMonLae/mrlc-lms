import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, ClipboardList, Lock, LockOpen, Newspaper, Paperclip, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiSend } from '../../lib/api';
import { formatDateOnly } from '../../lib/dates';

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
  subject?: { id: string; name: string } | null;
  class: { id: string; name: string; students: { id: string; studentCode: string; user?: { firstName?: string; lastName?: string } | null }[] };
  submissions: Submission[];
}

export default function HomeworkDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState<'status' | 'sync' | 'delete' | null>(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'submitted' | 'marked' | 'redo' | 'missing'>('all');
  const [editForm, setEditForm] = useState({ title: '', subjectId: '', dueDate: '', maxMarks: '', instructions: '' });

  const load = () => {
    setLoading(true);
    setLoadError('');
    apiGet<Detail>(`/api/homework/${id}`)
      .then(setData)
      .catch((e: any) => {
        const message = e?.message || 'Failed to load homework';
        setLoadError(message);
        setData(null);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);
  useEffect(() => {
    apiGet<any[]>('/api/subjects')
      .then((d) => setSubjects((d || []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch((e: any) => toast.error(e?.message || 'Failed to load subjects'));
  }, []);

  const startEdit = () => {
    if (!data) return;
    setEditForm({
      title: data.title,
      subjectId: data.subject?.id ?? '',
      dueDate: data.dueDate.slice(0, 10),
      maxMarks: data.maxMarks != null ? String(data.maxMarks) : '',
      instructions: data.instructions ?? '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editForm.title.trim() || !editForm.dueDate) { toast.error('Title and due date are required'); return; }
    if (editForm.maxMarks !== '' && (!Number.isFinite(Number(editForm.maxMarks)) || Number(editForm.maxMarks) <= 0)) {
      toast.error('Max marks must be a number greater than 0');
      return;
    }
    if (data?.gradeItemId && editForm.maxMarks === '') {
      toast.error('Max marks cannot be removed after syncing to the gradebook');
      return;
    }
    setSaving(true);
    try {
      await apiSend(`/api/homework/${id}`, 'PUT', {
        title: editForm.title,
        subjectId: editForm.subjectId || null,
        dueDate: editForm.dueDate,
        maxMarks: editForm.maxMarks === '' ? null : editForm.maxMarks,
        instructions: editForm.instructions || null,
      });
      toast.success('Homework updated');
      setEditing(false);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update homework');
    } finally {
      setSaving(false);
    }
  };

  const subFor = (studentId: string) => data?.submissions.find((s) => s.studentId === studentId) ?? null;

  const mark = async (studentId: string, status: 'MARKED' | 'REDO') => {
    const d = drafts[studentId] || { score: '', feedback: '' };
    if (status === 'MARKED' && d.score !== '') {
      const score = Number(d.score);
      if (!Number.isFinite(score) || score < 0) { toast.error('Enter a valid score of 0 or more'); return; }
      if (data?.maxMarks != null && score > data.maxMarks) { toast.error(`Score cannot exceed ${data.maxMarks}`); return; }
    }
    setBusy(studentId);
    try {
      await apiSend(`/api/homework/${id}/mark`, 'POST', {
        studentId, status, score: status === 'MARKED' && d.score !== '' ? Number(d.score) : null, feedback: d.feedback || null,
      });
      toast.success(status === 'MARKED' ? 'Marked' : 'Sent back for redo');
      setDrafts((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark');
    } finally {
      setBusy(null);
    }
  };

  const toggleClosed = async () => {
    if (!data) return;
    setActionBusy('status');
    try {
      await apiSend(`/api/homework/${id}`, 'PUT', { status: data.status === 'CLOSED' ? 'OPEN' : 'CLOSED' });
      toast.success(data.status === 'CLOSED' ? 'Reopened for submissions' : 'Closed to new submissions');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setActionBusy(null); }
  };

  const syncGradebook = async () => {
    setActionBusy('sync');
    try {
      const r = await apiSend<{ count: number }>(`/api/homework/${id}/sync-gradebook`, 'POST');
      toast.success(`${r.count} score(s) synced to the gradebook`);
      load();
    } catch (e: any) { toast.error(e.message || 'Failed to sync'); }
    finally { setActionBusy(null); }
  };

  const remove = async () => {
    if (!confirm('Delete this homework and all its submissions?')) return;
    setActionBusy('delete');
    try {
      await apiSend(`/api/homework/${id}`, 'DELETE');
      toast.success('Homework deleted');
      navigate('/teacher/homework');
    } catch (e: any) { toast.error(e.message || 'Failed to delete'); setActionBusy(null); }
  };

  if (loading) return <p className="py-14 text-center text-sm text-slate-500">Loading…</p>;
  if (!data) return (
    <div className="py-14 text-center text-sm text-slate-500">
      <p>{loadError || 'Homework not found.'}</p>
      {loadError && <Button variant="outline" size="sm" className="mt-3" onClick={load}>Try again</Button>}
    </div>
  );

  const scoredCount = data.submissions.filter((s) => s.status === 'MARKED' && s.score != null).length;
  const submittedCount = data.submissions.filter((s) => s.status === 'SUBMITTED').length;
  const markedCount = data.submissions.filter((s) => s.status === 'MARKED').length;
  const redoCount = data.submissions.filter((s) => s.status === 'REDO').length;
  const filteredStudents = data.class.students.filter((student) => {
    const submission = subFor(student.id);
    const name = `${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''} ${student.studentCode}`.toLowerCase();
    if (studentQuery.trim() && !name.includes(studentQuery.trim().toLowerCase())) return false;
    if (studentFilter === 'missing') return !submission;
    if (studentFilter !== 'all') return submission?.status.toLowerCase() === studentFilter;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div>
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500" render={<Link to="/teacher/homework" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" /> All Homework
        </Button>
        {editing ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Title *</Label>
                <Input maxLength={200} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={editForm.subjectId || 'none'} onValueChange={(v) => setEditForm({ ...editForm, subjectId: v === 'none' ? '' : v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No subject</SelectItem>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date *</Label>
                <Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Max marks <span className="text-xs text-slate-400">(leave blank for check-off only)</span></Label>
                <Input type="number" min="1" value={editForm.maxMarks} onChange={(e) => setEditForm({ ...editForm, maxMarks: e.target.value })} placeholder="e.g. 20" />
                {data.gradeItemId && <p className="text-xs text-slate-400">Required because this homework is linked to the gradebook.</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Instructions</Label>
                <Textarea rows={3} maxLength={20000} value={editForm.instructions} onChange={(e) => setEditForm({ ...editForm, instructions: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                <X className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button size="sm" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                {data.title}
                {data.status === 'CLOSED' && <Badge variant="secondary">Closed</Badge>}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {data.class.name}{data.subject ? ` · ${data.subject.name}` : ''} · due {formatDateOnly(data.dueDate)}
                {data.maxMarks != null ? ` · out of ${data.maxMarks}` : ' · check-off (no marks)'}
              </p>
              {data.instructions && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{data.instructions}</p>}
              {data.attachmentUrl && (
                <a href={data.attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-aubergine-600 underline">
                  {data.attachmentUrl.startsWith('/news/') ? (
                    <><Newspaper className="h-3.5 w-3.5" /> Linked News article</>
                  ) : data.attachmentUrl.startsWith('/elibrary/') ? (
                    <><BookOpen className="h-3.5 w-3.5" /> Linked E-Book</>
                  ) : (
                    <><Paperclip className="h-3.5 w-3.5" /> Worksheet attachment</>
                  )}
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={startEdit} disabled={actionBusy !== null}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={toggleClosed} disabled={actionBusy !== null}>
                {data.status === 'CLOSED' ? <><LockOpen className="mr-2 h-4 w-4" /> Reopen</> : <><Lock className="mr-2 h-4 w-4" /> Close</>}
              </Button>
              {data.maxMarks != null && (
                <Button variant="outline" size="sm" onClick={syncGradebook} disabled={(scoredCount === 0 && !data.gradeItemId) || actionBusy !== null} title={scoredCount === 0 && !data.gradeItemId ? 'Mark some submissions with scores first' : undefined}>
                  <ClipboardList className="mr-2 h-4 w-4" /> {actionBusy === 'sync' ? 'Syncing…' : `Sync to Gradebook${data.gradeItemId ? ' ✓' : ''}`}
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-rose-600" onClick={remove} disabled={actionBusy !== null}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Submitted', submittedCount, 'text-sky-600'],
          ['Marked', markedCount, 'text-emerald-600'],
          ['Redo', redoCount, 'text-amber-600'],
          ['Missing', data.class.students.length - data.submissions.length, 'text-rose-600'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input className="flex-1" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Search student name or code" />
        <Select value={studentFilter} onValueChange={(value) => setStudentFilter(value as typeof studentFilter)}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All students</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="marked">Marked</SelectItem>
            <SelectItem value="redo">Redo</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
        <table className="min-w-[760px] w-full text-left text-sm">
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
            {filteredStudents.map((st) => {
              const sub = subFor(st.id);
              const name = `${st.user?.firstName ?? ''} ${st.user?.lastName ?? ''}`.trim() || st.studentCode;
              const d = drafts[st.id] ?? { score: sub?.score != null ? String(sub.score) : '', feedback: sub?.feedback ?? '' };
              // Compare calendar dates, not instants — a submission made
              // later in the day on the due date shouldn't be flagged
              // "late" just because it's past UTC midnight (see dates.ts).
              const late = sub && toLocalDateString(new Date(sub.submittedAt)) > data.dueDate.slice(0, 10);
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
                      maxLength={5000}
                      placeholder="Optional feedback"
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [st.id]: { ...d, feedback: e.target.value } }))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 text-emerald-600" disabled={busy !== null} onClick={() => mark(st.id, 'MARKED')}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-amber-600" disabled={busy !== null || !sub} onClick={() => mark(st.id, 'REDO')} title="Send back for redo">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredStudents.length === 0 && (
              <tr><td colSpan={data.maxMarks != null ? 5 : 4} className="px-4 py-10 text-center text-slate-500">
                {data.class.students.length === 0 ? 'No students in this class.' : 'No students match these filters.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
