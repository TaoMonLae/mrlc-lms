import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { ArrowLeft, Plus, Trash2, Save, Eye } from 'lucide-react';

const TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'];
const DIFFICULTY = ['EASY', 'MEDIUM', 'HARD'];
const CHOICE_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE'];

export default function QuestionEditor() {
  const { id } = useParams();
  const editing = id && id !== 'new';
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [preview, setPreview] = useState(false);
  const [f, setF] = useState<any>({
    text: '', type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM', defaultPoints: 1, estimatedTimeSeconds: 60,
    subjectId: '', topicId: '', subtopic: '', explanation: '', language: '', tags: '',
    partialCredit: false, caseSensitive: false, requiresManualGrading: false, correctAnswer: '',
    options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
  });

  useEffect(() => {
    apiGet('/api/subjects').then((d) => setSubjects(Array.isArray(d) ? d : [])).catch(() => {});
    apiGet('/api/question-topics').then(setTopics).catch(() => {});
    if (editing) apiGet(`/api/question-bank/${id}`).then((q) => setF({
      text: q.text || '', type: q.type, difficulty: q.difficulty || 'MEDIUM', defaultPoints: q.defaultPoints ?? q.points ?? 1,
      estimatedTimeSeconds: q.estimatedTimeSeconds ?? 60, subjectId: q.subjectId || '', topicId: q.topicId || '',
      subtopic: q.subtopic || '', explanation: q.explanation || '', language: q.language || '', tags: (q.tags || []).join(', '),
      partialCredit: q.partialCredit, caseSensitive: q.caseSensitive, requiresManualGrading: q.requiresManualGrading,
      correctAnswer: q.correctAnswer || '', status: q.status,
      options: (q.optionRows || []).length ? q.optionRows.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect, weight: o.weight })) : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
    })).catch(() => toast.error('Could not load question'));
  }, [id, editing]);

  const setOpt = (i: number, patch: any) => setF((o: any) => ({ ...o, options: o.options.map((x: any, idx: number) => idx === i ? { ...x, ...patch } : x) }));
  const isChoice = CHOICE_TYPES.includes(f.type);

  const save = async () => {
    if (!f.text) return toast.error('Question text required');
    const payload = {
      ...f, defaultPoints: Number(f.defaultPoints) || 1, estimatedTimeSeconds: Number(f.estimatedTimeSeconds) || null,
      tags: f.tags ? f.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      options: isChoice ? f.options.filter((o: any) => o.text) : [],
    };
    try {
      const saved = editing ? await apiSend(`/api/question-bank/${id}`, 'PUT', payload) : await apiSend('/api/question-bank', 'POST', payload);
      toast.success('Saved'); navigate(`/bank/${saved.id}`);
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-12">
      <Button variant="ghost" size="sm" className="-ml-2 text-slate-500" onClick={() => navigate('/bank')}><ArrowLeft className="h-4 w-4 mr-1" /> Bank</Button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{editing ? 'Edit question' : 'New question'}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview(!preview)}><Eye className="h-4 w-4 mr-1" /> {preview ? 'Edit' : 'Preview'}</Button>
          <Button className="bg-primary text-primary-foreground" onClick={save}><Save className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </div>

      {preview ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 space-y-3">
          <p className="text-base font-medium text-slate-900 dark:text-white whitespace-pre-wrap">{f.text || '(no text)'}</p>
          {isChoice && f.options.filter((o: any) => o.text).map((o: any, i: number) => (
            <div key={i} className={`px-4 py-2 rounded-lg border ${o.isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-surface-raised'}`}>{o.text}{o.isCorrect && ' ✓'}</div>
          ))}
          {f.explanation && <p className="text-xs text-slate-500 italic">Explanation: {f.explanation}</p>}
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5 space-y-4">
          <div><Label>Question text</Label><textarea className="w-full min-h-[100px] rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas p-2 text-sm" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Type</Label><select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-sm" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select></div>
            <div><Label>Difficulty</Label><select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-sm" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>{DIFFICULTY.map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            <div><Label>Points</Label><Input type="number" value={f.defaultPoints} onChange={(e) => setF({ ...f, defaultPoints: e.target.value })} /></div>
            <div><Label>Time (s)</Label><Input type="number" value={f.estimatedTimeSeconds} onChange={(e) => setF({ ...f, estimatedTimeSeconds: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Subject</Label><select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-sm" value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })}><option value="">—</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><Label>Topic</Label><select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-2 text-sm" value={f.topicId} onChange={(e) => setF({ ...f, topicId: e.target.value })}><option value="">—</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div><Label>Subtopic</Label><Input value={f.subtopic} onChange={(e) => setF({ ...f, subtopic: e.target.value })} /></div>
          </div>

          {isChoice ? (
            <div className="space-y-2">
              <Label>Options (tick correct)</Label>
              {f.options.map((o: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="checkbox" checked={o.isCorrect} onChange={(e) => setOpt(i, { isCorrect: e.target.checked })} />
                  <Input placeholder={`Option ${i + 1}`} value={o.text} onChange={(e) => setOpt(i, { text: e.target.value })} />
                  {f.partialCredit && <Input type="number" className="w-20" placeholder="wt" value={o.weight ?? ''} onChange={(e) => setOpt(i, { weight: e.target.value })} />}
                  <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => setF({ ...f, options: f.options.filter((_: any, idx: number) => idx !== i) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setF({ ...f, options: [...f.options, { text: '', isCorrect: false }] })}><Plus className="h-3 w-3 mr-1" /> Add option</Button>
            </div>
          ) : (
            <div><Label>Accepted answer(s)</Label><Input placeholder="Comma-separated for short answer" value={f.correctAnswer} onChange={(e) => setF({ ...f, correctAnswer: e.target.value })} /></div>
          )}

          <div><Label>Explanation (shown after release)</Label><textarea className="w-full min-h-[60px] rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas p-2 text-sm" value={f.explanation} onChange={(e) => setF({ ...f, explanation: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tags (comma)</Label><Input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></div>
            <div><Label>Language</Label><Input value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} /></div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.partialCredit} onChange={(e) => setF({ ...f, partialCredit: e.target.checked })} /> Partial credit</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.caseSensitive} onChange={(e) => setF({ ...f, caseSensitive: e.target.checked })} /> Case-sensitive</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.requiresManualGrading} onChange={(e) => setF({ ...f, requiresManualGrading: e.target.checked })} /> Manual grading</label>
          </div>
        </div>
      )}
    </div>
  );
}
