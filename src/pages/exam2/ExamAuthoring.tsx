import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Layers, FileText, Group, ListChecks, Plus, Trash2, Save, PencilRuler } from 'lucide-react';

type Tab = 'sections' | 'passages' | 'groups' | 'rubrics' | 'questions';
const STIMULUS_TYPES = ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'TABLE', 'CHART', 'DOCUMENT'];

export default function ExamAuthoring() {
  const { examId } = useParams();
  const [tab, setTab] = useState<Tab>('sections');
  const [sections, setSections] = useState<any[]>([]);
  const [stimuli, setStimuli] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [rubrics, setRubrics] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  const reload = useCallback(async () => {
    const [s, st, g, r, q] = await Promise.all([
      apiGet(`/api/exams/${examId}/sections`).catch(() => []),
      apiGet(`/api/exams/${examId}/stimuli`).catch(() => []),
      apiGet(`/api/exams/${examId}/question-groups`).catch(() => []),
      apiGet(`/api/exams/${examId}/rubrics`).catch(() => []),
      apiGet(`/api/exams/${examId}/questions`).catch(() => []),
    ]);
    setSections(s || []); setStimuli(st || []); setGroups(g || []); setRubrics(r || []); setQuestions(q || []);
  }, [examId]);
  useEffect(() => { reload(); }, [reload]);

  const TABS: [Tab, string, any][] = [
    ['sections', 'Sections', Layers], ['passages', 'Passages', FileText],
    ['groups', 'Question Groups', Group], ['rubrics', 'Rubrics', ListChecks], ['questions', 'Organize Questions', PencilRuler],
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Exam Authoring</h1>
          <p className="text-sm text-slate-500 mt-1">Build sections, passages, grouped questions and grading rubrics.</p>
        </div>
        <Link to={`/exam2/${examId}/schedule`} className="text-aubergine-600 text-sm font-semibold">Scheduling →</Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-surface-raised">
        {TABS.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${tab === k ? 'border-aubergine-600 text-aubergine-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'sections' && <Sections examId={examId!} rows={sections} reload={reload} />}
      {tab === 'passages' && <Passages examId={examId!} rows={stimuli} reload={reload} />}
      {tab === 'groups' && <Groups examId={examId!} rows={groups} sections={sections} stimuli={stimuli} reload={reload} />}
      {tab === 'rubrics' && <Rubrics examId={examId!} rows={rubrics} questions={questions} reload={reload} />}
      {tab === 'questions' && <Organize questions={questions} sections={sections} groups={groups} stimuli={stimuli} reload={reload} />}
    </div>
  );
}

function Card({ children }: { children: any }) {
  return <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5 space-y-3">{children}</div>;
}

// ── Sections ────────────────────────────────────────────────────────────────
function Sections({ examId, rows, reload }: any) {
  const [f, setF] = useState<any>({ title: '', instructions: '', timeLimitMinutes: '', shuffleQuestions: false });
  const add = async () => { if (!f.title) return toast.error('Title required'); await apiSend(`/api/exams/${examId}/sections`, 'POST', { ...f, orderIndex: rows.length }); setF({ title: '', instructions: '', timeLimitMinutes: '', shuffleQuestions: false }); reload(); };
  const del = async (id: string) => { if (!confirm('Delete section?')) return; await apiSend(`/api/sections/${id}`, 'DELETE'); reload(); };
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800 dark:text-white">New section</h3>
        <Input placeholder="Section title (e.g. Section 1: Reading)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <textarea className="w-full min-h-[60px] rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas p-2 text-sm" placeholder="Instructions" value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} />
        <div className="flex items-center gap-4">
          <div className="flex-1"><Label>Time limit (min)</Label><Input type="number" value={f.timeLimitMinutes} onChange={(e) => setF({ ...f, timeLimitMinutes: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm font-medium mt-5"><input type="checkbox" checked={f.shuffleQuestions} onChange={(e) => setF({ ...f, shuffleQuestions: e.target.checked })} /> Shuffle</label>
        </div>
        <Button onClick={add} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add section</Button>
      </Card>
      {rows.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4">
          <div><p className="font-bold text-slate-900 dark:text-white">{s.title}</p><p className="text-xs text-slate-500">{[s.timeLimitMinutes ? `${s.timeLimitMinutes}m` : null, s.shuffleQuestions ? 'shuffled' : null].filter(Boolean).join(' · ') || s.instructions || '—'}</p></div>
          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      {rows.length === 0 && <Empty label="No sections yet." />}
    </div>
  );
}

// ── Passages / stimuli ──────────────────────────────────────────────────────
function Passages({ examId, rows, reload }: any) {
  const [f, setF] = useState<any>({ type: 'TEXT', title: '', content: '', mediaUrl: '' });
  const add = async () => { await apiSend(`/api/exams/${examId}/stimuli`, 'POST', f); setF({ type: 'TEXT', title: '', content: '', mediaUrl: '' }); reload(); };
  const del = async (id: string) => { if (!confirm('Delete passage?')) return; await apiSend(`/api/stimuli/${id}`, 'DELETE'); reload(); };
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800 dark:text-white">New passage / media</h3>
        <div className="flex gap-3">
          <select className="h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            {STIMULUS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </div>
        {f.type === 'TEXT' || f.type === 'TABLE' || f.type === 'CHART'
          ? <textarea className="w-full min-h-[120px] rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas p-2 text-sm font-mono" placeholder={f.type === 'TEXT' ? 'Passage text…' : 'Data (JSON / CSV)'} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} />
          : <Input placeholder="Media URL" value={f.mediaUrl} onChange={(e) => setF({ ...f, mediaUrl: e.target.value })} />}
        <Button onClick={add} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add passage</Button>
      </Card>
      {rows.map((s: any) => (
        <div key={s.id} className="flex items-center justify-between bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4">
          <div className="min-w-0"><div className="flex items-center gap-2"><Badge variant="outline" className="text-[9px]">{s.type}</Badge><p className="font-bold text-slate-900 dark:text-white truncate">{s.title || 'Untitled'}</p></div><p className="text-xs text-slate-500 truncate mt-1">{s.content || s.mediaUrl || '—'}</p></div>
          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      {rows.length === 0 && <Empty label="No passages yet." />}
    </div>
  );
}

// ── Question groups ─────────────────────────────────────────────────────────
function Groups({ examId, rows, sections, stimuli, reload }: any) {
  const [f, setF] = useState<any>({ title: '', instructions: '', sectionId: '', stimulusId: '' });
  const add = async () => { await apiSend(`/api/exams/${examId}/question-groups`, 'POST', { ...f, orderIndex: rows.length }); setF({ title: '', instructions: '', sectionId: '', stimulusId: '' }); reload(); };
  const del = async (id: string) => { if (!confirm('Delete group?')) return; await apiSend(`/api/question-groups/${id}`, 'DELETE'); reload(); };
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800 dark:text-white">New question group</h3>
        <Input placeholder="Group title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Section</Label><select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={f.sectionId} onChange={(e) => setF({ ...f, sectionId: e.target.value })}><option value="">—</option>{sections.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
          <div><Label>Shared passage</Label><select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={f.stimulusId} onChange={(e) => setF({ ...f, stimulusId: e.target.value })}><option value="">—</option>{stimuli.map((s: any) => <option key={s.id} value={s.id}>{s.title || s.type}</option>)}</select></div>
        </div>
        <Button onClick={add} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add group</Button>
      </Card>
      {rows.map((g: any) => (
        <div key={g.id} className="flex items-center justify-between bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4">
          <div><p className="font-bold text-slate-900 dark:text-white">{g.title || 'Untitled group'}</p><p className="text-xs text-slate-500">{g.stimulus ? `Passage: ${g.stimulus.title || g.stimulus.type}` : 'No passage linked'}</p></div>
          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => del(g.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      {rows.length === 0 && <Empty label="No question groups yet." />}
    </div>
  );
}

// ── Rubrics ─────────────────────────────────────────────────────────────────
function Rubrics({ examId, rows, questions, reload }: any) {
  const [f, setF] = useState<any>({ title: '', questionId: '', criteria: [{ label: '', maxScore: '' }] });
  const setCrit = (i: number, patch: any) => setF((o: any) => ({ ...o, criteria: o.criteria.map((c: any, idx: number) => idx === i ? { ...c, ...patch } : c) }));
  const add = async () => {
    if (!f.title) return toast.error('Title required');
    await apiSend(`/api/exams/${examId}/rubrics`, 'POST', { ...f, criteria: f.criteria.filter((c: any) => c.label).map((c: any) => ({ ...c, maxScore: Number(c.maxScore) || 0 })) });
    setF({ title: '', questionId: '', criteria: [{ label: '', maxScore: '' }] }); reload();
  };
  const del = async (id: string) => { if (!confirm('Delete rubric?')) return; await apiSend(`/api/rubrics/${id}`, 'DELETE'); reload(); };
  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-bold text-sm uppercase tracking-widest text-slate-800 dark:text-white">New rubric</h3>
        <Input placeholder="Rubric title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div><Label>Attach to question (optional)</Label>
          <select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={f.questionId} onChange={(e) => setF({ ...f, questionId: e.target.value })}>
            <option value="">Exam-wide</option>
            {questions.map((q: any) => <option key={q.id} value={q.id}>{(q.text || '').slice(0, 60)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Criteria</Label>
          {f.criteria.map((c: any, i: number) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Criterion label" value={c.label} onChange={(e) => setCrit(i, { label: e.target.value })} />
              <Input type="number" className="w-24" placeholder="Max" value={c.maxScore} onChange={(e) => setCrit(i, { maxScore: e.target.value })} />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setF({ ...f, criteria: [...f.criteria, { label: '', maxScore: '' }] })}><Plus className="h-3 w-3 mr-1" /> Add criterion</Button>
        </div>
        <Button onClick={add} className="bg-primary text-primary-foreground"><Save className="h-4 w-4 mr-1" /> Save rubric</Button>
      </Card>
      {rows.map((r: any) => (
        <div key={r.id} className="flex items-center justify-between bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4">
          <div><p className="font-bold text-slate-900 dark:text-white">{r.title} <span className="text-xs font-normal text-slate-400">/ {r.maxScore} pts</span></p><p className="text-xs text-slate-500">{(r.criteria || []).map((c: any) => `${c.label} (${c.maxScore})`).join(' · ') || 'No criteria'}</p></div>
          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => del(r.id)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      {rows.length === 0 && <Empty label="No rubrics yet." />}
    </div>
  );
}

// ── Organize questions (assign section/group/stimulus + scoring config) ──────
function Organize({ questions, sections, groups, stimuli, reload }: any) {
  const save = async (q: any, patch: any) => { await apiSend(`/api/questions/${q.id}`, 'PATCH', patch); toast.success('Saved'); reload(); };
  if (!questions.length) return <Empty label="This exam has no questions yet. Add questions in the exam editor first." />;
  return (
    <div className="space-y-3">
      {questions.map((q: any) => (
        <div key={q.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{(q.text || '').slice(0, 120)} <span className="text-xs text-slate-400">({q.points} pts)</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select className="h-9 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-xs" defaultValue={q.sectionId || ''} onChange={(e) => save(q, { sectionId: e.target.value })}>
              <option value="">No section</option>{sections.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <select className="h-9 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-xs" defaultValue={q.groupId || ''} onChange={(e) => save(q, { groupId: e.target.value })}>
              <option value="">No group</option>{groups.map((g: any) => <option key={g.id} value={g.id}>{g.title || 'Group'}</option>)}
            </select>
            <select className="h-9 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-xs" defaultValue={q.stimulusId || ''} onChange={(e) => save(q, { stimulusId: e.target.value })}>
              <option value="">No passage</option>{stimuli.map((s: any) => <option key={s.id} value={s.id}>{s.title || s.type}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={q.partialCredit} onChange={(e) => save(q, { partialCredit: e.target.checked })} /> Partial credit</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={q.caseSensitive} onChange={(e) => save(q, { caseSensitive: e.target.checked })} /> Case-sensitive</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" defaultChecked={q.requiresManualGrading} onChange={(e) => save(q, { requiresManualGrading: e.target.checked })} /> Manual grading</label>
            <span className="flex items-center gap-1.5">Neg. <input type="number" className="w-16 h-7 rounded border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-1" defaultValue={q.negativePoints ?? ''} onBlur={(e) => save(q, { negativePoints: e.target.value })} /></span>
            <span className="flex items-center gap-1.5">Tol. <input type="number" className="w-16 h-7 rounded border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-1" defaultValue={q.numericTolerance ?? ''} onBlur={(e) => save(q, { numericTolerance: e.target.value })} /></span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-8 text-center text-slate-500 text-sm">{label}</div>;
}
