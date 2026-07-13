import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type ExamRow = {
  id: string;
  title: string;
  status: string;
  class?: { name?: string } | null;
  subject?: { name?: string } | null;
  questions?: { id: string }[];
};

export default function ExamDataManagement() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<ExamRow | null>(null);
  const [titleConfirmation, setTitleConfirmation] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [current, archived] = await Promise.all([
        apiGet<ExamRow[]>('/api/exams'),
        apiGet<ExamRow[]>('/api/exams?archived=1'),
      ]);
      const unique = new Map<string, ExamRow>();
      [...current, ...archived].forEach((exam) => unique.set(exam.id, exam));
      setExams([...unique.values()].sort((a, b) => a.title.localeCompare(b.title)));
    } catch (err: any) {
      toast.error(err.message || 'Could not load exams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return exams;
    return exams.filter((exam) => [exam.title, exam.class?.name, exam.subject?.name, exam.status].some((value) => String(value || '').toLowerCase().includes(term)));
  }, [exams, query]);

  const closeDialog = () => {
    if (deleting) return;
    setTarget(null); setTitleConfirmation(''); setDeleteConfirmation('');
  };

  const confirmed = Boolean(target && titleConfirmation === target.title && deleteConfirmation === 'DELETE');
  const permanentlyDelete = async () => {
    if (!target || !confirmed) return;
    setDeleting(true);
    try {
      await apiSend(`/api/admin/exams/${target.id}`, 'DELETE', { title: titleConfirmation, confirmation: deleteConfirmation });
      setExams((rows) => rows.filter((exam) => exam.id !== target.id));
      toast.success(`“${target.title}” was permanently deleted`);
      setTarget(null); setTitleConfirmation(''); setDeleteConfirmation('');
    } catch (err: any) {
      toast.error(err.message || 'Could not permanently delete exam');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-5 sm:p-7 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Exam records</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Permanently remove an exam and all of its questions, attempts, answers, grading records, schedules, and integrity events.</p>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/20">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          <div><p className="text-sm font-bold text-red-900 dark:text-red-200">Permanent deletion cannot be undone</p><p className="mt-1 text-xs leading-relaxed text-red-700 dark:text-red-300">Use Archive from the Exams page when records should be preserved. This admin tool is only for records that must be completely removed.</p></div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by exam, class, subject, or status" className="pl-9" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-surface-raised">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading exams…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No matching exams.</div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-surface-raised">
            {filtered.map((exam) => (
              <div key={exam.id} className="flex flex-col gap-3 bg-white p-4 dark:bg-surface-indigo sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold text-slate-900 dark:text-white">{exam.title}</p><Badge variant="outline">{exam.status}</Badge></div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{exam.class?.name || 'No class'} · {exam.subject?.name || 'No subject'} · {exam.questions?.length || 0} questions</p>
                </div>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30" onClick={() => { setTarget(exam); setTitleConfirmation(''); setDeleteConfirmation(''); }}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete permanently
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {target && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-exam-title">
          <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900 dark:bg-surface-indigo">
            <div className="flex items-start gap-3"><div className="rounded-full bg-red-100 p-2 text-red-600 dark:bg-red-950/50 dark:text-red-400"><Trash2 className="h-5 w-5" /></div><div className="min-w-0 flex-1"><h3 id="delete-exam-title" className="text-lg font-bold text-slate-900 dark:text-white">Delete exam permanently?</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-300">This removes <strong>{target.title}</strong> and every student record connected to it.</p></div><button type="button" onClick={closeDialog} aria-label="Close" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-raised"><X className="h-5 w-5" /></button></div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Type the exact exam title:<Input className="mt-1.5" value={titleConfirmation} onChange={(event) => setTitleConfirmation(event.target.value)} autoComplete="off" /></label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Type <span className="font-mono font-bold text-red-600">DELETE</span>:<Input className="mt-1.5 font-mono" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" /></label>
            </div>

            <div className="mt-6 flex justify-end gap-2"><Button variant="outline" onClick={closeDialog} disabled={deleting}>Cancel</Button><Button onClick={permanentlyDelete} disabled={!confirmed || deleting} className="bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300">{deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Permanently delete</Button></div>
          </div>
        </div>
      )}
    </div>
  );
}
