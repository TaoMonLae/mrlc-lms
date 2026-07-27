import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpenCheck, CalendarDays, Paperclip, Plus, Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '../../lib/permissions';
import { apiGet, apiSend } from '../../lib/api';
import { formatDateOnly, localToday } from '../../lib/dates';
import { HOMEWORK_FILE_ACCEPT, removeUnusedHomeworkMedia, uploadHomeworkFile } from '../../lib/homeworkMedia';

interface HomeworkRow {
  id: string;
  title: string;
  dueDate: string;
  maxMarks: number | null;
  status: string;
  attachmentUrl?: string | null;
  class: { id: string; name: string; _count: { students: number } };
  subject?: { id: string; name: string } | null;
  submissions: { id: string; status: string; submittedAt: string }[];
}

export default function HomeworkList() {
  const { isAdmin } = usePermissions();
  const location = useLocation();
  // Arrives here from "Assign as Homework" on a News article — see
  // NewsFeed.tsx / ArticleReader.tsx, which navigate with this shape.
  const prefill = (location.state as { prefill?: { title: string; instructions: string; attachmentUrl: string } } | null)?.prefill;
  const [rows, setRows] = useState<HomeworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [showForm, setShowForm] = useState(!!prefill);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'past-due'>('all');
  const stagedUpload = useRef('');
  const [form, setForm] = useState({
    title: prefill?.title || '', instructions: prefill?.instructions || '', classId: '', subjectId: '',
    dueDate: localToday(), maxMarks: '', attachmentUrl: prefill?.attachmentUrl || '',
  });

  const load = () => {
    setLoading(true);
    setLoadError('');
    apiGet<HomeworkRow[]>('/api/homework')
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((e: any) => {
        const message = e?.message || 'Failed to load homework';
        setRows([]);
        setLoadError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (isAdmin) {
      apiGet<any[]>('/api/classes')
        .then((d) => setClasses((d || []).map((c: any) => ({ id: c.id, name: c.name }))))
        .catch((e: any) => toast.error(e?.message || 'Failed to load classes'));
    } else {
      apiGet<any[]>('/api/teacher/classes')
        .then((d) => setClasses((d || []).map((c: any) => ({ id: c.classInfo?.id ?? c.id, name: c.classInfo?.name ?? c.name }))))
        .catch((e: any) => toast.error(e?.message || 'Failed to load classes'));
    }
    apiGet<any[]>('/api/subjects')
      .then((d) => setSubjects((d || []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch((e: any) => toast.error(e?.message || 'Failed to load subjects'));
    return () => {
      if (stagedUpload.current) void removeUnusedHomeworkMedia(stagedUpload.current).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadAttachment = async (file: File) => {
    setUploading(true);
    try {
      const uploaded = await uploadHomeworkFile(file);
      const previous = stagedUpload.current;
      stagedUpload.current = uploaded.url;
      setForm((f) => ({ ...f, attachmentUrl: uploaded.url }));
      if (previous && previous !== uploaded.url) await removeUnusedHomeworkMedia(previous).catch(() => {});
      toast.success('Attachment uploaded');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async () => {
    const uploaded = stagedUpload.current;
    stagedUpload.current = '';
    setForm((current) => ({ ...current, attachmentUrl: '' }));
    if (uploaded) await removeUnusedHomeworkMedia(uploaded).catch(() => {});
  };

  const closeForm = () => {
    void removeAttachment();
    setShowForm(false);
    setForm({ title: '', instructions: '', classId: '', subjectId: '', dueDate: localToday(), maxMarks: '', attachmentUrl: '' });
  };

  const create = async () => {
    if (!form.title.trim() || !form.classId || !form.dueDate) {
      toast.error('Title, class and due date are required');
      return;
    }
    if (form.maxMarks !== '' && (!Number.isFinite(Number(form.maxMarks)) || Number(form.maxMarks) <= 0)) {
      toast.error('Max marks must be a number greater than 0');
      return;
    }
    setSaving(true);
    try {
      await apiSend('/api/homework', 'POST', {
        title: form.title, instructions: form.instructions || null, classId: form.classId,
        subjectId: form.subjectId || null, dueDate: form.dueDate,
        maxMarks: form.maxMarks || null, attachmentUrl: form.attachmentUrl || null,
      });
      stagedUpload.current = '';
      toast.success('Homework assigned');
      setShowForm(false);
      setForm({ title: '', instructions: '', classId: '', subjectId: '', dueDate: localToday(), maxMarks: '', attachmentUrl: '' });
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to create homework');
    } finally {
      setSaving(false);
    }
  };

  const summarize = (r: HomeworkRow) => {
    const total = r.class._count.students;
    const submitted = r.submissions.filter((s) => s.status !== 'REDO').length;
    const marked = r.submissions.filter((s) => s.status === 'MARKED').length;
    return { total, submitted, marked };
  };

  const filteredRows = useMemo(() => rows.filter((row) => {
    const searchText = `${row.title} ${row.class.name} ${row.subject?.name ?? ''}`.toLowerCase();
    if (query.trim() && !searchText.includes(query.trim().toLowerCase())) return false;
    const pastDue = row.status === 'OPEN' && row.dueDate.slice(0, 10) < localToday();
    if (filter === 'open' && row.status !== 'OPEN') return false;
    if (filter === 'closed' && row.status !== 'CLOSED') return false;
    if (filter === 'past-due' && !pastDue) return false;
    return true;
  }), [filter, query, rows]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <BookOpenCheck className="h-6 w-6 text-aubergine-600" /> Homework
          </h1>
          <p className="mt-1 text-sm text-slate-500">Assign work, collect submissions, and mark them — with optional scores.</p>
        </div>
        <Button onClick={() => showForm ? closeForm() : setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" /> {showForm ? 'Cancel' : 'Assign Homework'}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Title *</Label>
              <Input maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Fractions worksheet p. 12-13" />
            </div>
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={form.subjectId || 'none'} onValueChange={(v) => setForm({ ...form, subjectId: v === 'none' ? '' : v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No subject</SelectItem>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date *</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Max marks <span className="text-xs text-slate-400">(leave blank for check-off only)</span></Label>
              <Input type="number" min="1" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} placeholder="e.g. 20" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Instructions</Label>
              <Textarea rows={3} maxLength={20000} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="What should students do?" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>
                {form.attachmentUrl.startsWith('/news/')
                  ? 'Linked News article'
                  : form.attachmentUrl.startsWith('/elibrary/')
                  ? 'Linked E-Book'
                  : 'Worksheet attachment'}
              </Label>
              <div className="flex items-center gap-3">
                {form.attachmentUrl.startsWith('/news/') || form.attachmentUrl.startsWith('/elibrary/') ? (
                  <Button type="button" variant="outline" size="sm" onClick={removeAttachment}>
                    {form.attachmentUrl.startsWith('/elibrary/') ? 'Remove book link' : 'Remove article link'}
                  </Button>
                ) : (
                  <input type="file" accept={HOMEWORK_FILE_ACCEPT} className="max-w-full text-sm" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; e.currentTarget.value = ''; if (f) uploadAttachment(f); }} />
                )}
                {form.attachmentUrl && (
                  <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-aubergine-600 underline">
                    <Paperclip className="h-3 w-3" />
                    {form.attachmentUrl.startsWith('/news/')
                      ? 'view article'
                      : form.attachmentUrl.startsWith('/elibrary/')
                      ? 'open book'
                      : 'attached'}
                  </a>
                )}
                {form.attachmentUrl.startsWith('/uploads/homework-media/') && (
                  <Button type="button" variant="ghost" size="sm" onClick={removeAttachment} disabled={uploading} aria-label="Remove attachment">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={create} disabled={saving || uploading}>
              {saving ? 'Assigning…' : <><Upload className="mr-2 h-4 w-4" /> Assign to class</>}
            </Button>
          </div>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search homework, class or subject" />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All homework</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="past-due">Past due</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {loading ? (
        <p className="py-14 text-center text-sm text-slate-500">Loading homework…</p>
      ) : loadError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-10 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <p className="text-sm text-rose-700 dark:text-rose-300">{loadError}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={load}>Try again</Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-surface-raised">
          No homework assigned yet. Use “Assign Homework” to create the first one.
        </p>
      ) : (
        <div className="space-y-3">
          {filteredRows.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400 dark:border-surface-raised">No homework matches these filters.</p>
          )}
          {filteredRows.map((r) => {
            const { total, submitted, marked } = summarize(r);
            // Compare calendar dates (not instants) so a homework due "today"
            // doesn't flip to overdue at UTC midnight, hours before the end
            // of the day in the user's own timezone (e.g. Myanmar, UTC+6:30).
            const overdue = r.dueDate.slice(0, 10) < localToday() && r.status === 'OPEN';
            return (
              <Link key={r.id} to={`/teacher/homework/${r.id}`}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-aubergine-300 dark:border-surface-raised dark:bg-surface-indigo sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold text-slate-900 dark:text-white">{r.title}</h3>
                    {r.status === 'CLOSED' && <Badge variant="secondary">Closed</Badge>}
                    {overdue && <Badge className="bg-rose-500 text-white">Past due</Badge>}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>{r.class.name}</span>
                    {r.subject && <span>· {r.subject.name}</span>}
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> due {formatDateOnly(r.dueDate)}</span>
                    {r.maxMarks != null && <span>· {r.maxMarks} marks</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-slate-900 dark:text-white">{submitted}/{total}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Submitted</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-emerald-600">{marked}</p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">Marked</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
