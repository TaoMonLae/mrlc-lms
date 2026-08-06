import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, BookOpenCheck, CalendarDays, ClipboardList, Loader2, Plus, RefreshCw, Save, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState } from '../../components/ui/empty-state';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { usePermissions } from '../../lib/permissions';
import { localToday } from '../../lib/dates';
import {
  MAX_GRADE_ITEM_MARKS,
  normalizeGradeItemTitle,
  parseCategoryWeight,
  parseGradeItemMaxMarks,
  parseGradeMarks,
} from '../../../shared/gradebook';

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
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const loadRequestRef = useRef(0);
  const subjectRequestRef = useRef(0);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // New grade item form
  const [newItem, setNewItem] = useState({ title: '', category: 'ASSIGNMENT', maxMarks: '100', date: localToday() });
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
    setClassesLoading(true);
    setClassesError(false);
    apiGet<any[]>('/api/classes').then((cs) => {
      const list = cs.map((c) => ({ id: c.id, name: c.name }));
      setClasses(list);
      if (list[0]) setClassId(list[0].id);
    }).catch(() => {
      setClassesError(true);
      toast.error('Failed to load classes');
    }).finally(() => setClassesLoading(false));
  }, []);

  // Subjects scoped to the selected class (direct assignments + exam-linked).
  useEffect(() => {
    const requestId = ++subjectRequestRef.current;
    if (!classId) { setSubjects([]); return; }
    apiGet<any>(`/api/classes/${classId}`)
      .then((klass) => {
        if (requestId !== subjectRequestRef.current) return;
        const map = new Map<string, string>();
        for (const cs of klass.subjects || []) {
          if (cs.subject?.id) map.set(cs.subject.id, cs.subject.name);
        }
        for (const e of klass.exams || []) {
          if (e.subject?.id) map.set(e.subject.id, e.subject.name);
        }
        setSubjects(Array.from(map.entries()).map(([id, name]) => ({ id, name })));
        setSubjectId((prev) => (prev !== 'all' && !map.has(prev) ? 'all' : prev));
      })
      .catch(() => {
        if (requestId === subjectRequestRef.current) setSubjects([]);
      });
  }, [classId]);

  const loadGradebook = useCallback(async () => {
    if (!classId) {
      setData(null);
      setLoading(false);
      return;
    }
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError(false);
    const params = new URLSearchParams({ classId, ...(subjectId !== 'all' ? { subjectId } : {}) });
    try {
      const d = await apiGet<Gradebook>(`/api/gradebook?${params}`);
      if (requestId === loadRequestRef.current) {
        setData(d);
        setWeights(d.weights || {});
        setActiveItemId((current) => d.items.some((item) => item.id === current) ? current : '');
      }
    } catch {
      if (requestId === loadRequestRef.current) {
        setLoadError(true);
        toast.error('Failed to load gradebook');
      }
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [classId, subjectId]);

  useEffect(() => { void loadGradebook(); }, [loadGradebook]);

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
  const parsedMaxMarks = parseGradeItemMaxMarks(newItem.maxMarks);
  const titleIsValid = normalizeGradeItemTitle(newItem.title) != null;
  const canCreateItem = Boolean(classId && titleIsValid && parsedMaxMarks != null && newItem.date);
  const invalidEntryIds = useMemo(() => {
    if (!activeItem) return new Set<string>();
    return new Set((data?.rows || [])
      .filter((row) => parseGradeMarks(entryMarks[row.studentId], activeItem.maxMarks) === undefined)
      .map((row) => row.studentId));
  }, [activeItem, data?.rows, entryMarks]);
  const weightsAreValid = Object.values(weights).every((weight) => parseCategoryWeight(weight) != null) && weightTotal > 0;
  const summaryColumnCount = (data?.categories.length ?? Object.keys(CATEGORY_LABELS).length) + 4;

  const changeClass = (nextClassId: string) => {
    loadRequestRef.current += 1;
    subjectRequestRef.current += 1;
    setClassId(nextClassId);
    setSubjectId('all');
    setSubjects([]);
    setActiveItemId('');
    setData(null);
  };

  const changeSubject = (nextSubjectId: string) => {
    loadRequestRef.current += 1;
    setSubjectId(nextSubjectId);
    setActiveItemId('');
  };

  const createItem = async () => {
    const title = normalizeGradeItemTitle(newItem.title);
    const maxMarks = parseGradeItemMaxMarks(newItem.maxMarks);
    if (!title) { toast.error('Enter a title of 120 characters or fewer'); titleInputRef.current?.focus(); return; }
    if (maxMarks == null) { toast.error(`Max marks must be greater than 0 and no more than ${MAX_GRADE_ITEM_MARKS.toLocaleString()}`); return; }
    if (!classId) { toast.error('Select a class first'); return; }
    setCreating(true);
    try {
      await apiSend('/api/grade-items', 'POST', {
        title, category: newItem.category,
        maxMarks, date: newItem.date,
        classId, subjectId: subjectId !== 'all' ? subjectId : null,
      });
      toast.success('Grade item added');
      setNewItem({ title: '', category: 'ASSIGNMENT', maxMarks: '100', date: localToday() });
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
    if (invalidEntryIds.size > 0) {
      toast.error(`Fix ${invalidEntryIds.size} mark ${invalidEntryIds.size === 1 ? 'value' : 'values'} before saving`);
      return;
    }
    setSavingEntry(true);
    try {
      const entries = (data?.rows || []).map((r) => ({
        studentId: r.studentId,
        marks: parseGradeMarks(entryMarks[r.studentId], activeItem.maxMarks) ?? null,
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
    if (!weightsAreValid) { toast.error('Each weight must be a whole number from 0 to 100, with at least one above 0'); return; }
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
    <div className="mx-auto max-w-[1440px] space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpenCheck className="h-5 w-5" />
            </span>
            Gradebook
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Assignments, quizzes, exams and weighted grades.</p>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
          <div className="space-y-1.5">
            <Label htmlFor="gradebook-class" className="text-xs text-muted-foreground">Class</Label>
            <Select value={classId} onValueChange={changeClass} disabled={classesLoading || classes.length === 0}>
              <SelectTrigger id="gradebook-class" aria-label="Filter gradebook by class" className="h-10 w-full sm:w-[220px]">
                <SelectValue placeholder={classesLoading ? 'Loading classes…' : 'Select a class'}>{classes.find((c) => c.id === classId)?.name || 'Select a class'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gradebook-subject" className="text-xs text-muted-foreground">Subject</Label>
            <Select value={subjectId} onValueChange={changeSubject} disabled={!classId}>
              <SelectTrigger id="gradebook-subject" aria-label="Filter gradebook by subject" className="h-10 w-full sm:w-[220px]">
                <SelectValue placeholder="All subjects">{subjectId === 'all' ? 'All Subjects' : (subjects.find((s) => s.id === subjectId)?.name || 'Subject')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {(classesError || (!classesLoading && classes.length === 0)) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100" role="status">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">{classesError ? 'Classes could not be loaded' : 'No classes are available'}</p>
            <p className="mt-0.5 text-sm opacity-80">{classesError ? 'Refresh the page and try again.' : 'Assign a class before creating grade items or entering marks.'}</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="summary" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-surface-raised dark:bg-surface-indigo">
        <div className="border-b border-slate-200 px-4 pt-2 dark:border-surface-raised sm:px-6">
          <TabsList variant="line" aria-label="Gradebook sections" className="h-12 w-full justify-start gap-1 overflow-x-auto">
            <TabsTrigger value="summary" className="h-10 flex-none rounded-lg px-3 font-semibold data-active:text-primary data-active:after:bg-primary focus-visible:border-transparent focus-visible:bg-primary/10 focus-visible:ring-0 focus-visible:outline-none">Summary</TabsTrigger>
            {canManage && <TabsTrigger value="entry" className="h-10 flex-none rounded-lg px-3 font-semibold data-active:text-primary data-active:after:bg-primary focus-visible:border-transparent focus-visible:bg-primary/10 focus-visible:ring-0 focus-visible:outline-none">Grade Entry</TabsTrigger>}
            {canManage && <TabsTrigger value="weights" className="h-10 flex-none rounded-lg px-3 font-semibold data-active:text-primary data-active:after:bg-primary focus-visible:border-transparent focus-visible:bg-primary/10 focus-visible:ring-0 focus-visible:outline-none">Categories &amp; Weights</TabsTrigger>}
          </TabsList>
        </div>

        {/* ── Summary ── */}
        <TabsContent value="summary" className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="px-6 py-4 min-w-[160px] sticky left-0 z-20 bg-slate-50 dark:bg-surface-raised">Student</th>
                  {data?.categories.map((c) => <th key={c} className="px-4 py-4 text-center">{CATEGORY_LABELS[c]}</th>)}
                  <th className="px-4 py-4 text-center">Overall</th>
                  <th className="px-4 py-4 text-center">Grade</th>
                  <th className="px-4 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading && (
                  <tr><td colSpan={summaryColumnCount} className="px-6 py-14 text-center text-slate-500"><Loader2 className="mr-2 inline size-4 animate-spin" />Loading gradebook…</td></tr>
                )}
                {!loading && loadError && (
                  <tr><td colSpan={summaryColumnCount}>
                    <EmptyState
                      icon={AlertTriangle}
                      title="Gradebook could not be loaded"
                      description="Check your connection and try loading this class again."
                      action={<Button variant="outline" onClick={() => void loadGradebook()}><RefreshCw className="size-4" />Try again</Button>}
                    />
                  </td></tr>
                )}
                {!loading && !loadError && classId && data && data.rows.length === 0 && (
                  <tr><td colSpan={summaryColumnCount}>
                    <EmptyState icon={Users} title="No learners in this class" description="Enrol learners in the selected class to start tracking grades." />
                  </td></tr>
                )}
                {!loading && !loadError && !classId && !classesLoading && (
                  <tr><td colSpan={summaryColumnCount}>
                    <EmptyState icon={BookOpenCheck} title="Select a class to begin" description="Choose a class above to view its grade summary." />
                  </td></tr>
                )}
                {!loading && !loadError && data?.rows.map((r) => (
                  <tr key={r.studentId} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-white sticky left-0 z-10 bg-white dark:bg-surface-indigo">
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
        <TabsContent value="entry" className="space-y-6 p-4 sm:p-6">
          <section aria-labelledby="add-grade-item-heading" className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-surface-raised dark:bg-surface-raised/30 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300"><Plus className="size-4" /></span>
              <div>
                <h3 id="add-grade-item-heading" className="font-semibold text-slate-900 dark:text-white">Add grade item</h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Create an assignment, quiz, or exam for the selected class and subject.</p>
              </div>
            </div>
            <form className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,2fr)_minmax(9rem,1fr)_minmax(8rem,.75fr)_minmax(9rem,.9fr)_auto]" onSubmit={(event) => { event.preventDefault(); void createItem(); }}>
              <div className="space-y-1.5">
                <Label htmlFor="grade-item-title">Title</Label>
                <Input
                  ref={titleInputRef}
                  id="grade-item-title"
                  value={newItem.title}
                  maxLength={120}
                  aria-invalid={newItem.title.length > 0 && !titleIsValid}
                  onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))}
                  placeholder="e.g. Algebra Quiz 1"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grade-item-category">Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem((current) => ({ ...current, category: value }))}>
                  <SelectTrigger id="grade-item-category" className="h-10 w-full"><SelectValue>{CATEGORY_LABELS[newItem.category]}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grade-item-max-marks">Max marks</Label>
                <Input
                  id="grade-item-max-marks"
                  type="number"
                  min="0.01"
                  max={MAX_GRADE_ITEM_MARKS}
                  step="any"
                  value={newItem.maxMarks}
                  aria-invalid={newItem.maxMarks.length > 0 && parsedMaxMarks == null}
                  onChange={(event) => setNewItem((current) => ({ ...current, maxMarks: event.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grade-item-date">Date</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input id="grade-item-date" type="date" value={newItem.date} onChange={(event) => setNewItem((current) => ({ ...current, date: event.target.value }))} className="h-10 pl-9" />
                </div>
              </div>
              <Button type="submit" size="lg" disabled={creating || !canCreateItem} className="mt-auto h-10 rounded-lg bg-teal-600 px-5 text-white hover:bg-teal-700 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300">
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {creating ? 'Adding…' : 'Add item'}
              </Button>
            </form>
          </section>

          <section aria-labelledby="enter-marks-heading" className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 space-y-1.5">
                <Label id="enter-marks-heading" htmlFor="grade-item-picker">Enter marks for</Label>
                <Select value={activeItemId} onValueChange={setActiveItemId} disabled={loading || !data?.items.length}>
                  <SelectTrigger id="grade-item-picker" className="h-10 w-full sm:w-[420px]">
                    <SelectValue placeholder="Select a grade item">
                      {activeItem ? `${CATEGORY_LABELS[activeItem.category]} · ${activeItem.title} (/${activeItem.maxMarks})` : 'Select a grade item'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {data?.items.map((item) => <SelectItem key={item.id} value={item.id}>{CATEGORY_LABELS[item.category]} · {item.title} (/{item.maxMarks})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {activeItem && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="destructive" onClick={() => void deleteItem(activeItem.id)}><Trash2 className="size-4" />Delete item</Button>
                  <Button type="button" onClick={() => void saveEntries()} disabled={savingEntry || invalidEntryIds.size > 0 || !data?.rows.length} className="bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300">
                    {savingEntry ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {savingEntry ? 'Saving…' : 'Save all marks'}
                  </Button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-200 py-14 text-center text-sm text-slate-500 dark:border-surface-raised"><Loader2 className="mr-2 inline size-4 animate-spin" />Loading grade items…</div>
            ) : loadError ? (
              <div className="rounded-xl border border-slate-200 dark:border-surface-raised"><EmptyState icon={AlertTriangle} title="Grade items could not be loaded" description="Try loading the selected class again." action={<Button variant="outline" onClick={() => void loadGradebook()}><RefreshCw className="size-4" />Try again</Button>} /></div>
            ) : !classId ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-surface-raised"><EmptyState icon={BookOpenCheck} title="Select a class first" description="Choose a class above before creating grade items or entering marks." /></div>
            ) : data?.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-surface-raised"><EmptyState icon={ClipboardList} title="No grade items yet" description="Create the first item above, then enter marks for the whole class." action={<Button variant="outline" onClick={() => titleInputRef.current?.focus()}><Plus className="size-4" />Create first item</Button>} /></div>
            ) : !activeItem ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-surface-raised"><EmptyState icon={ClipboardList} title="Choose a grade item" description="Select an assignment, quiz, or exam above to enter learner marks." /></div>
            ) : !data?.rows.length ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-surface-raised"><EmptyState icon={Users} title="No learners in this class" description="Enrol learners before entering marks for this item." /></div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-surface-raised">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-surface-raised/50">
                    <tr>
                      <th className="min-w-[220px] px-5 py-3">Learner</th>
                      <th className="w-[170px] px-4 py-3">Marks (/{activeItem.maxMarks})</th>
                      <th className="min-w-[280px] px-4 py-3">Teacher comment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.rows.map((row) => {
                      const markIsInvalid = invalidEntryIds.has(row.studentId);
                      return (
                        <tr key={row.studentId} className="hover:bg-slate-50/80 dark:hover:bg-surface-raised/30">
                          <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                            <span className="block">{row.name}</span>
                            <span className="font-mono text-xs font-normal text-slate-400">{row.code}</span>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Input
                              aria-label={`Marks for ${row.name}`}
                              aria-invalid={markIsInvalid}
                              type="number"
                              min={0}
                              max={activeItem.maxMarks}
                              step="any"
                              value={entryMarks[row.studentId] ?? ''}
                              onChange={(event) => setEntryMarks((current) => ({ ...current, [row.studentId]: event.target.value }))}
                              className="h-9"
                            />
                            {markIsInvalid && <p className="mt-1 text-xs text-red-600">Use 0–{activeItem.maxMarks}</p>}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Input
                              aria-label={`Comment for ${row.name}`}
                              value={entryComments[row.studentId] ?? ''}
                              maxLength={500}
                              onChange={(event) => setEntryComments((current) => ({ ...current, [row.studentId]: event.target.value }))}
                              placeholder="Optional feedback"
                              className="h-9"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </TabsContent>
        )}

        {/* ── Weights ── */}
        {canManage && (
        <TabsContent value="weights" className="p-4 sm:p-6">
          <section className="max-w-2xl rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-surface-raised dark:bg-surface-raised/30" aria-labelledby="category-weights-heading">
            <h3 id="category-weights-heading" className="font-semibold text-slate-900 dark:text-white">Category weights</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Set how much each category contributes to the overall grade. Categories without marks are automatically excluded and the remaining weights are normalized.</p>
            <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-700/70">
              {Object.keys(CATEGORY_LABELS).map((category) => {
                const weightIsInvalid = parseCategoryWeight(weights[category]) == null;
                return (
                  <div key={category} className="grid grid-cols-[1fr_7rem] items-center gap-4 py-3">
                    <Label htmlFor={`weight-${category}`} className="text-slate-700 dark:text-slate-200">{CATEGORY_LABELS[category]}</Label>
                    <div className="relative">
                      <Input
                        id={`weight-${category}`}
                        aria-invalid={weightIsInvalid}
                        aria-label={`${CATEGORY_LABELS[category]} weight percentage`}
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={weights[category] ?? 0}
                        onChange={(event) => setWeights((current) => ({ ...current, [category]: Number(event.target.value) }))}
                        className="h-9 pr-8 text-right"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`mt-4 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${weightTotal === 100 ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'}`}>
              <div>
                <p className="font-semibold">Total: {weightTotal}%</p>
                <p className="mt-0.5 text-xs opacity-80">{weightTotal === 100 ? 'Weights are balanced and ready to save.' : 'A 100% total is recommended; other positive totals will be normalized.'}</p>
              </div>
              <Button onClick={() => void saveWeights()} disabled={savingWeights || !weightsAreValid || !classId} className="bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-400 dark:text-slate-950 dark:hover:bg-teal-300">
                {savingWeights ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {savingWeights ? 'Saving…' : 'Save weights'}
              </Button>
            </div>
          </section>
        </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
