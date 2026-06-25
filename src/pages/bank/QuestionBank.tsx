import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Library, Plus, Search, CheckCircle2, Archive, Pencil, FolderTree } from 'lucide-react';

const DIFFICULTY = ['EASY', 'MEDIUM', 'HARD'];
const STATUS = ['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'RETIRED', 'ARCHIVED'];
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600', UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700', RETIRED: 'bg-slate-200 text-slate-500', ARCHIVED: 'bg-red-100 text-red-700',
};

export default function QuestionBank() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [f, setF] = useState<any>({ q: '', topicId: '', difficulty: '', status: '', page: 1 });

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
    try { const r = await apiGet(`/api/question-bank?${params}`); setItems(r.items || []); setTotal(r.total || 0); }
    catch { setItems([]); }
  }, [f]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { apiGet('/api/question-topics').then(setTopics).catch(() => setTopics([])); }, []);

  const approve = async (id: string) => { try { await apiSend(`/api/question-bank/${id}/approve`, 'POST'); toast.success('Approved'); load(); } catch (e: any) { toast.error(e.message); } };
  const archive = async (id: string) => { if (!confirm('Archive this question?')) return; try { await apiSend(`/api/question-bank/${id}/archive`, 'POST'); toast.success('Archived'); load(); } catch (e: any) { toast.error(e.message); } };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Library className="h-6 w-6 text-aubergine-600" /> Question Bank</h1>
          <p className="text-sm text-slate-500 mt-1">{total} reusable questions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/bank/topics')}><FolderTree className="h-4 w-4 mr-1" /> Topics</Button>
          <Button className="bg-primary text-primary-foreground" onClick={() => navigate('/bank/new')}><Plus className="h-4 w-4 mr-1" /> New question</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input className="pl-9" placeholder="Search text…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} />
        </div>
        <select className="h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={f.topicId} onChange={(e) => setF({ ...f, topicId: e.target.value, page: 1 })}>
          <option value="">All topics</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <select className="h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-sm" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value, page: 1 })}>
            <option value="">Difficulty</option>{DIFFICULTY.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })}>
            <option value="">Status</option>{STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((q) => (
          <div key={q.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge className={`${STATUS_COLOR[q.status] || ''} text-[9px]`}>{q.status}</Badge>
                {q.difficulty && <Badge variant="outline" className="text-[9px]">{q.difficulty}</Badge>}
                <Badge variant="outline" className="text-[9px]">{q.type}</Badge>
                {q.topic && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{q.topic.name}</span>}
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 line-clamp-2">{q.text}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/bank/${q.id}`)}><Pencil className="h-3.5 w-3.5" /></Button>
              {q.status !== 'APPROVED' && q.status !== 'ARCHIVED' && <Button variant="outline" size="sm" className="h-8 text-emerald-600" onClick={() => approve(q.id)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>}
              {q.status !== 'ARCHIVED' && <Button variant="outline" size="sm" className="h-8 text-red-500" onClick={() => archive(q.id)}><Archive className="h-3.5 w-3.5" /></Button>}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-10 text-center text-slate-500">No questions match.</div>}
      </div>

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>Prev</Button>
          <span className="text-sm text-slate-500 self-center">Page {f.page}</span>
          <Button variant="outline" size="sm" disabled={f.page * 50 >= total} onClick={() => setF({ ...f, page: f.page + 1 })}>Next</Button>
        </div>
      )}
    </div>
  );
}
