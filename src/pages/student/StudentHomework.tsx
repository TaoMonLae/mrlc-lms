import { useEffect, useState } from 'react';
import { BookOpenCheck, Camera, CheckCircle2, Clock, Paperclip, RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend, authHeaders } from '../../lib/api';

interface MySubmission {
  id: string;
  text?: string | null;
  attachmentUrl?: string | null;
  submittedAt: string;
  status: 'SUBMITTED' | 'MARKED' | 'REDO';
  score?: number | null;
  feedback?: string | null;
}

interface HomeworkItem {
  id: string;
  title: string;
  instructions?: string | null;
  attachmentUrl?: string | null;
  subjectName?: string | null;
  teacherName?: string | null;
  dueDate: string;
  maxMarks: number | null;
  status: string;
  mySubmission: MySubmission | null;
}

export default function StudentHomework() {
  const [items, setItems] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    apiGet<HomeworkItem[]>('/api/student/homework')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch((e: any) => toast.error(e?.message || 'Failed to load homework'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const startSubmit = (item: HomeworkItem) => {
    setOpenId(item.id);
    setText(item.mySubmission?.text ?? '');
    setAttachmentUrl(item.mySubmission?.attachmentUrl ?? '');
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/homework-media', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setAttachmentUrl(data.url);
      toast.success('File attached');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (id: string) => {
    if (!text.trim() && !attachmentUrl) { toast.error('Write something or attach a photo of your work'); return; }
    setSubmitting(true);
    try {
      await apiSend(`/api/homework/${id}/submit`, 'POST', { text: text.trim() || null, attachmentUrl: attachmentUrl || null });
      toast.success('Homework submitted!');
      setOpenId(null);
      load();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const stateBadge = (item: HomeworkItem) => {
    const s = item.mySubmission;
    const overdue = new Date(item.dueDate) < new Date();
    if (s?.status === 'MARKED') return <Badge className="bg-emerald-500 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Marked{s.score != null && item.maxMarks != null ? ` ${s.score}/${item.maxMarks}` : ''}</Badge>;
    if (s?.status === 'REDO') return <Badge className="bg-amber-500 text-white"><RotateCcw className="mr-1 h-3 w-3" /> Redo requested</Badge>;
    if (s) return <Badge variant="secondary">Submitted</Badge>;
    if (item.status === 'CLOSED') return <Badge variant="outline">Closed</Badge>;
    if (overdue) return <Badge className="bg-rose-500 text-white">Overdue</Badge>;
    return <Badge variant="outline">To do</Badge>;
  };

  const pending = items.filter((i) => !i.mySubmission || i.mySubmission.status === 'REDO');
  const done = items.filter((i) => i.mySubmission && i.mySubmission.status !== 'REDO');

  const renderCard = (item: HomeworkItem) => {
    const canSubmit = item.status === 'OPEN' && item.mySubmission?.status !== 'MARKED';
    const isOpen = openId === item.id;
    return (
      <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900 dark:text-white">{item.title}</h3>
              {stateBadge(item)}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
              {item.subjectName && <span>{item.subjectName}</span>}
              {item.teacherName && <span>· {item.teacherName}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> due {new Date(item.dueDate).toLocaleDateString()}</span>
              {item.maxMarks != null && <span>· out of {item.maxMarks}</span>}
            </p>
            {item.instructions && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{item.instructions}</p>}
            {item.attachmentUrl && (
              <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-aubergine-600 underline">
                <Paperclip className="h-3 w-3" /> Worksheet
              </a>
            )}
            {item.mySubmission?.feedback && (
              <p className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-surface-raised dark:text-slate-300">
                <span className="font-semibold">Teacher feedback:</span> {item.mySubmission.feedback}
              </p>
            )}
          </div>
          {canSubmit && !isOpen && (
            <Button size="sm" onClick={() => startSubmit(item)}>
              <Send className="mr-2 h-3.5 w-3.5" /> {item.mySubmission ? 'Resubmit' : 'Submit'}
            </Button>
          )}
        </div>

        {isOpen && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-surface-raised">
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your answer, or add a note about your attached work…" />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-surface-raised dark:text-slate-300 dark:hover:bg-surface-raised">
                <Camera className="h-4 w-4" />
                {uploading ? 'Uploading…' : 'Photo / file of your work'}
                <input type="file" accept="image/*,.pdf,.doc,.docx" capture="environment" className="hidden" disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
              </label>
              {attachmentUrl && (
                <a href={attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-aubergine-600 underline">
                  <Paperclip className="h-3 w-3" /> attached
                </a>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpenId(null)} disabled={submitting}>Cancel</Button>
                <Button size="sm" onClick={() => submit(item.id)} disabled={submitting || uploading}>
                  {submitting ? 'Submitting…' : 'Turn in'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          <BookOpenCheck className="h-6 w-6 text-aubergine-600" /> My Homework
        </h1>
        <p className="mt-1 text-sm text-slate-500">Submit your work by typing an answer or photographing your paper work.</p>
      </div>

      {loading ? (
        <p className="py-14 text-center text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-surface-raised">
          No homework yet. Enjoy the free time!
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">To do ({pending.length})</h2>
              {pending.sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map(renderCard)}
            </section>
          )}
          {done.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Submitted &amp; marked</h2>
              {done.map(renderCard)}
            </section>
          )}
        </>
      )}
    </div>
  );
}
