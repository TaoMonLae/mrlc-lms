import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, Plus, Save, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { usePermissions } from '../../lib/permissions';

const CATEGORY_LABELS: Record<string, string> = {
  ASSIGNMENT: 'Assignment',
  QUIZ: 'Quiz',
  MIDTERM: 'Midterm',
  FINAL: 'Final',
  MOCK_GED: 'Mock GED',
};

type Item = { id: string; title: string; category: string; maxMarks: number; date: string; subjectId: string | null };
type Row = {
  studentId: string; name: string; code: string;
  grades: Record<string, { marks: number | null; comment: string | null }>;
  categoryAverages: Record<string, number>;
  overall: number | null; letter: string | null; warning: boolean;
};
type Gradebook = { items: Item[]; weights: Record<string, number>; rows: Row[]; categories: string[] };

const letterColor = (l: string | null) => {
  if (!l) return 'bg-slate-100 text-slate-500';
  if (l === 'A+' || l === 'A') return 'bg-emerald-100 text-emerald-700';
  if (l === 'B') return 'bg-blue-100 text-blue-700';
  if (l === 'C') return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
};

export default function GradebookPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_grades');

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('all');
  const [data, setData] = useState<Gradebook | null>(null);
  const [loading, setLoading] = useState(false);

  // New grade item form
  const [newItem, setNewItem] = useState({ title: '', category: 'ASSIGNMENT', maxMarks: '100', date: new Date().toISOString().slice(0, 10) });
  const [creating, setCreating] = useState(false);

  // Bulk entry
  const [activeItemId, setActiveItemId] = useState('');
  const [entryMarks, setEntryMarks] = useState<Record<string, string>>({});
  const [entryComments, setEntryComments] = useState<Record<string, string>>({});
  const [savingEntry, setSavingEntry] = useState(false);

  // Weights editor
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [savingWeights, setSavingWeights] = useState(false);

  useEffect(() => {
    apiGet<any[]>('/api/classes').then((cs) => {
      const list = cs.map((c) => ({ id: c.id, name: c.name }));
      setClasses(list);
      if (list[0]) setClassId(list[0].id);
    }).catch(() => {});
    apiGet<any[]>('/api/subjects').then((ss) => setSubjects(ss.map((s) => ({ id: s.id, name: s.name })))).catch(() => {});
  }, []);

  const loadGradebook = () => {
    if (!classId) return;
    setLoading(true);
    const params = new URLSearchParams({ classId, ...(subjectId !== 'all' ? { subjectId } : {}) });
    apiGet<Gradebook>(`/api/gradebook?${params}`)
      .then((d) => {
        setData(d);
        setWeights(d.weights || {});
        // Seed bulk-entry fields if an item is active.
        if (activeItemId && !d.items.find((i) => i.id === activeItemId)) setActiveItemId('');
      })
      .catch(() => toast.error('Failed to load gradebook'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadGradebook(); /* eslint-disable-next-line */ }, [classId, subjectId]);

  // When the active item changes, seed marks/comments from existing data.
  useEffect(() => {
    if (!data || !activeItemId) { setEntryMarks({}); setEntryComments({}); return; }
    const m: Record<string, string> = {};
    const c: Record<string, string> = {};
    for (const row of data.rows) {
      const g = row.grades[activeItemId];
      m[row.studentId] = g?.marks != null ? String(g.marks) : '';
      c[row.studentId] = g?.comment || '';
    }
    setEntryMarks(m);
    setEntryComments(c);
  }, [activeItemId, data]);

  const activeItem = data?.items.find((i) => i.id === activeItemId);
  const weightTotal = useMemo(() => Object.values(weights).reduce((a, b) => a + (Number(b) || 0), 0), [weights]);

  const createItem = async () => {
    if (!newItem.title.trim()) { toast.error('Enter a title'); return; }
    setCreating(true);
    try {
      await apiSend('/api/grade-items', 'POST', {
        title: newItem.title.trim(), category: newItem.category,
        maxMarks: Number(newItem.maxMarks) || 100, date: newItem.date,
        classId, subjectId: subjectId !== 'all' ? subjectId : null,
      });
      toast.success('Grade item added');
      setNewItem({ title: '', category: 'ASSIGNMENT', maxMarks: '100', date: new Date().toISOString().slice(0, 10) });
      loadGradebook();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add grade item');
    } finally {
      setCreating(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this grade item and all its marks?')) return;
    try {
      await apiSend(`/api/grade-items/${id}`, 'DELETE');
      toast.success('Grade item deleted');
      if (activeItemId === id) setActiveItemId('');
      loadGradebook();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  const saveEntries = async () => {
    if (!activeItem) return;
    setSavingEntry(true);
    try {
      const entries = (data?.rows || []).map((r) => ({
        studentId: r.studentId,
        marks: entryMarks[r.studentId] === '' || entryMarks[r.studentId] == null ? null : Number(entryMarks[r.studentId]),
        comment: entryComments[r.studentId] || '',
      }));
      const res = await apiSend<{ changed: number }>('/api/grades/bulk', 'POST', { gradeItemId: activeItem.id, entries });
      toast.success(`Saved (${res?.changed ?? 0} changed)`);
      loadGradebook();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save grades');
    } finally {
      setSavingEntry(false);
    }
  };

  const saveWeights = async () => {
    setSavingWeights(true);
    try {
      await apiSend('/api/category-weights', 'PUT', { classId, weights });
      toast.success('Weights saved');
      loadGradebook();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save weights');
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpenCheck className="h-6 w-6 text-aubergine-600" /> Gradebook
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Assignments, quizzes, exams and weighted grades.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Class">{classes.find((c) => c.id === classId)?.name || 'Class'}</SelectValue></SelectTrigger>
            <SelectContent>
              {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Subject">{subjectId === 'all' ? 'All Subjects' : (subjects.find((s) => s.id === subjectId)?.name || 'Subject')}</SelectValue></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="summary" className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm">
        <div className="px-6 pt-4 overflow-x-auto">
          <TabsList className="bg-transparent border-b border-slate-100 dark:border-surface-raised w-full justify-start rounded-none h-12 gap-6">
            <TabsTrigger value="summary" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Summary</TabsTrigger>
            {canManage && <TabsTrigger value="entry" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Grade Entry</TabsTrigger>}
            {canManage && <TabsTrigger value="weights" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Categories &amp; Weights</TabsTrigger>}
          </TabsList>
        </div>

        {/* ── Summary ── */}
        <TabsContent value="summary" className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-4 min-w-[200px]">Student</th>
                  {data?.categories.map((c) => <th key={c} className="px-4 py-4 text-center">{CATEGORY_LABELS[c]}</th>)}
                  <th className="px-4 py-4 text-center">Overall</th>
                  <th className="px-4 py-4 text-center">Grade</th>
                  <th className="px-4 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">Loading…</td></tr>}
                {!loading && (data?.rows.length ?? 0) === 0 && <tr><td colSpan={9} className="px-6 py-8 text-center text-slate-500">No students or grades yet.</td></tr>}
                {!loading && data?.rows.map((r) => (
                  <tr key={r.studentId} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                      <Link to={`/gradebook/students/${r.studentId}`} className="hover:text-aubergine-600 hover:underline">{r.name}</Link>
                      <span className="text-xs text-slate-400 font-mono ml-1">{r.code}</span>
                    </td>
                    {data.categories.map((c) => (
                      <td key={c} className="px-4 py-3 text-center text-slate-600 dark:text-slate-300">{r.categoryAverages[c] != null ? `${r.categoryAverages[c]}%` : '—'}</td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">{r.overall != null ? `${r.overall}%` : '—'}</td>
                    <td className="px-4 py-3 text-center"><Badge className={`${letterColor(r.letter)} border-0`}>{r.letter || '—'}</Badge></td>
                    <td className="px-4 py-3 text-center">
                      {r.warning ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><AlertTriangle className="h-3.5 w-3.5" /> Warning</span>
                      ) : r.overall != null ? <span className="text-xs text-emerald-600 font-semibold">On track</span> : <span className="text-xs text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ── Grade Entry ── */}
        {canManage && (
        <TabsContent value="entry" className="p-6 space-y-6">
          {/* Add item */}
          <div className="bg-slate-50 dark:bg-surface-raised/30 border border-slate-200 dark:border-surface-raised rounded-xl p-4">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">Add Grade Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Title</Label>
                <Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} placeholder="e.g. Algebra Quiz 1" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                  <SelectTrigger><SelectValue>{CATEGORY_LABELS[newItem.category]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Max Marks</Label>
                <Input type="number" value={newItem.maxMarks} onChange={(e) => setNewItem({ ...newItem, maxMarks: e.target.value })} />
              </div>
              <Button onClick={createItem} disabled={creating || !classId} className="bg-primary text-primary-foreground">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Add
              </Button>
            </div>
          </div>

          {/* Pick item + bulk entry */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="shrink-0">Enter marks for:</Label>
              <Select value={activeItemId} onValueChange={setActiveItemId}>
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder="Select a grade item">
                    {activeItem ? `${CATEGORY_LABELS[activeItem.category]} · ${activeItem.title} (/${activeItem.maxMarks})` : 'Select a grade item'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {data?.items.map((i) => <SelectItem key={i.id} value={i.id}>{CATEGORY_LABELS[i.category]} · {i.title} (/{i.maxMarks})</SelectItem>)}
                </SelectContent>
              </Select>
              {activeItem && (
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteItem(activeItem.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete item
                </Button>
              )}
              <div className="flex-1" />
              {activeItem && (
                <Button onClick={saveEntries} disabled={savingEntry} className="bg-primary text-primary-foreground">
                  {savingEntry ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save All
                </Button>
              )}
            </div>

            {activeItem ? (
              <div className="overflow-x-auto border border-slate-200 dark:border-surface-raised rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                    <tr>
                      <th className="px-6 py-3 min-w-[200px]">Student</th>
                      <th className="px-4 py-3 w-[140px]">Marks (/{activeItem.maxMarks})</th>
                      <th className="px-4 py-3">Comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data?.rows.map((r) => (
                      <tr key={r.studentId}>
                        <td className="px-6 py-2 font-medium text-slate-900 dark:text-white">{r.name} <span className="text-xs text-slate-400 font-mono ml-1">{r.code}</span></td>
                        <td className="px-4 py-2">
                          <Input
                            type="number" min={0} max={activeItem.maxMarks}
                            value={entryMarks[r.studentId] ?? ''}
                            onChange={(e) => setEntryMarks({ ...entryMarks, [r.studentId]: e.target.value })}
                            className="h-9"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            value={entryComments[r.studentId] ?? ''}
                            onChange={(e) => setEntryComments({ ...entryComments, [r.studentId]: e.target.value })}
                            placeholder="Optional teacher comment"
                            className="h-9"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Add a grade item above, then pick it here to enter marks for the whole class.</p>
            )}
          </div>
        </TabsContent>
        )}

        {/* ── Weights ── */}
        {canManage && (
        <TabsContent value="weights" className="p-6 space-y-4 max-w-xl">
          <p className="text-sm text-slate-500">Set how much each category contributes to the overall grade. Only categories that have grades are counted (weights are normalized).</p>
          {Object.keys(CATEGORY_LABELS).map((c) => (
            <div key={c} className="flex items-center gap-4">
              <Label className="w-32">{CATEGORY_LABELS[c]}</Label>
              <Input
                type="number" min={0} max={100}
                value={weights[c] ?? 0}
                onChange={(e) => setWeights({ ...weights, [c]: Number(e.target.value) })}
                className="w-28"
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
          ))}
          <div className={`text-sm font-semibold ${weightTotal === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
            Total: {weightTotal}% {weightTotal !== 100 && '(weights are normalized, but 100% is recommended)'}
          </div>
          <Button onClick={saveWeights} disabled={savingWeights} className="bg-primary text-primary-foreground">
            {savingWeights ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save Weights
          </Button>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
