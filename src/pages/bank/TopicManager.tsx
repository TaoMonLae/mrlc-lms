import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { ArrowLeft, Plus, Trash2, FolderTree } from 'lucide-react';

export default function TopicManager() {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [f, setF] = useState<any>({ name: '', code: '', subjectId: '', parentId: '' });

  const load = () => apiGet('/api/question-topics').then(setTopics).catch(() => setTopics([]));
  useEffect(() => { load(); apiGet('/api/subjects').then((d) => setSubjects(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  const add = async () => {
    if (!f.name) return toast.error('Name required');
    try { await apiSend('/api/question-topics', 'POST', f); setF({ name: '', code: '', subjectId: '', parentId: '' }); load(); }
    catch (e: any) { toast.error(e.message); }
  };
  const del = async (id: string) => { if (!confirm('Delete topic? Questions keep their content but lose this topic.')) return; await apiSend(`/api/question-topics/${id}`, 'DELETE'); load(); };

  const roots = topics.filter((t) => !t.parentId);
  const childrenOf = (id: string) => topics.filter((t) => t.parentId === id);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2 text-slate-500" onClick={() => navigate('/bank')}><ArrowLeft className="h-4 w-4 mr-1" /> Bank</Button>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><FolderTree className="h-6 w-6 text-aubergine-600" /> Topics & Subtopics</h1>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Code</Label><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
          <div><Label>Subject</Label><select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-sm" value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })}><option value="">—</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><Label>Parent (for subtopic)</Label><select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-sm" value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}><option value="">None (top-level)</option>{roots.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        </div>
        <Button onClick={add} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add topic</Button>
      </div>

      <div className="space-y-2">
        {roots.map((t) => (
          <div key={t.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-slate-900 dark:text-white">{t.name} {t.code && <span className="text-xs text-slate-400">({t.code})</span>}</p>
              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => del(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            {childrenOf(t.id).map((c) => (
              <div key={c.id} className="flex items-center justify-between pl-4 mt-2 border-l-2 border-slate-100 dark:border-surface-raised">
                <p className="text-sm text-slate-600 dark:text-slate-300">{c.name}</p>
                <Button variant="ghost" size="icon" className="text-red-400 h-7 w-7" onClick={() => del(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        ))}
        {roots.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-8 text-center text-slate-500">No topics yet.</div>}
      </div>
    </div>
  );
}
