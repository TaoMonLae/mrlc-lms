import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Lock } from 'lucide-react';
import { manualGradeScores } from '../../../shared/examGrading';

const emptyForm = { score: '', overallComment: '', scoreOverride: '', overrideReason: '', secondMarkerScore: '', moderationComment: '' };
export default function RubricGrading() {
  const { attemptId, questionId } = useParams();
  const [params] = useSearchParams();
  const back = `/exam2/grading?${params.toString()}`;
  const [item, setItem] = useState<any>(null);
  const [crit, setCrit] = useState<Record<string, number | string>>({});
  const [form, setForm] = useState<any>(emptyForm);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setItem(null); setError(''); setCrit({}); setForm(emptyForm); setDirty(false); setSavedMessage('');
    const qs = new URLSearchParams({ status: 'ALL' });
    if (params.get('examId')) qs.set('examId', params.get('examId')!);
    apiGet(`/api/grading/queue?${qs}`, { signal: controller.signal }).then((rows: any[]) => {
      if (controller.signal.aborted) return;
      const found = rows.find(r => r.attemptId === attemptId && r.questionId === questionId);
      if (!found) throw new Error('This response is unavailable or you no longer have access to mark it.');
      setItem(found);
      setForm(Object.fromEntries(Object.keys(emptyForm).map(key => [key, found[key] ?? ''])));
      setCrit(found.criterionScores || {});
    }).catch(e => { if (!controller.signal.aborted) setError(e.message || 'Could not load this response.'); });
    return () => controller.abort();
  }, [attemptId, questionId, retry, params]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const criteria = item?.rubric?.criteria || [];
  const locked = item?.isFinalized;
  const maxPoints = item?.answer?.maxPoints ?? item?.question?.points ?? 0;
  const change = (key: string, value: string) => { setForm((current: any) => ({ ...current, [key]: value })); setDirty(true); setSavedMessage(''); };
  const save = async (status: string, finalize = false) => {
    if (saving.current || locked) return;
    let scores;
    try { scores = manualGradeScores({ ...form, status, criterionScores: crit }, maxPoints, criteria); }
    catch (e: any) { toast.error(e.message); return; }
    if (finalize && !confirm('Finalize locks this grade and updates the attempt total. Continue?')) return;
    saving.current = true; setBusy(true);
    try {
      const saved = await apiSend(`/api/grading/${attemptId}/${questionId}`, 'POST', { ...form, ...scores, status, rubricId: item.rubric?.id || null });
      setItem((current: any) => ({ ...current, ...saved }));
      setDirty(false);
      setSavedMessage(status === 'IN_REVIEW' ? 'Draft saved. You can return to finish marking.' : 'Grade saved. Finalize when marking is complete.');
      if (finalize) {
        await apiSend(`/api/grading/${saved.id}/finalize`, 'POST');
        setItem((current: any) => ({ ...current, isFinalized: true, status: 'FINALIZED' }));
        setSavedMessage('Grade finalized and locked. Return to the queue to mark the next response.');
      }
      toast.success(finalize ? 'Grade finalized' : 'Saved');
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
    finally { saving.current = false; setBusy(false); }
  };
  const numberField = (key: string, label: string) => <div className="space-y-2"><Label htmlFor={key}>{label}</Label><Input id={key} type="number" min={0} max={maxPoints} step="any" value={form[key]} onChange={e => change(key, e.target.value)} /></div>;
  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10 text-foreground">
      <Button variant="ghost" disabled={busy} render={<Link to={back} onClick={e => { if (busy || (dirty && !confirm('Leave without saving your marking changes?'))) e.preventDefault(); }} />} nativeButton={false}>Back to grading queue</Button>
      {error ? <div role="alert" className="rounded-lg border border-destructive/40 p-5"><p>{error}</p><Button variant="outline" className="mt-3" onClick={() => setRetry(n => n + 1)}>Retry</Button></div> : !item ? <p role="status" className="py-16 text-center text-muted-foreground">Loading response…</p> : <>
        <header className="space-y-1"><p className="text-sm text-muted-foreground">{item.attempt?.exam?.title}</p><h1 className="text-2xl font-bold">Grade response</h1><p>{[item.attempt?.student?.user?.firstName, item.attempt?.student?.user?.lastName].filter(Boolean).join(' ') || item.attempt?.student?.studentCode || 'Student'} · {maxPoints} points available</p></header>
        <section className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div><h2 className="text-sm font-semibold text-muted-foreground mb-2">Question</h2><p className="whitespace-pre-wrap break-words">{item.question?.text || 'Question unavailable'}</p>{item.question?.passageText && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.question.passageText}</p>}{item.question?.imageUrl && <img src={item.question.imageUrl} alt="Question illustration" className="mt-3 max-h-80 max-w-full object-contain" />}</div>
          <div className="border-t border-border pt-4"><h2 className="text-sm font-semibold text-muted-foreground mb-2">Student answer</h2><p className="whitespace-pre-wrap break-words">{item.answer?.answerText || 'No written answer submitted.'}</p></div>
        </section>
        {locked && <div className="flex items-center gap-2 text-sm rounded-lg bg-muted p-3"><Lock className="h-4 w-4" /> This grade is finalized and locked.</div>}
        <fieldset disabled={locked || busy} className="space-y-5 border border-border rounded-lg bg-card p-5 min-w-0">
          <legend className="px-2 font-semibold">Marking</legend>
          {criteria.length ? <div className="space-y-3"><h2 className="font-semibold">{item.rubric.title}</h2>{criteria.map((c: any) => <div key={c.id} className="flex items-center justify-between gap-4 rounded-md border border-border p-3"><div><Label htmlFor={`criterion-${c.id}`}>{c.label} · {c.maxScore} points</Label>{c.description && <p className="text-sm text-muted-foreground mt-1">{c.description}</p>}</div><Input id={`criterion-${c.id}`} type="number" className="w-24 shrink-0" min={0} max={c.maxScore} step="any" value={crit[c.id] ?? ''} onChange={e => { setCrit(p => ({ ...p, [c.id]: e.target.value })); setDirty(true); setSavedMessage(''); }} /></div>)}<p className="text-sm text-muted-foreground">Mark every criterion to save a grade. Leave unfinished marks blank when saving a draft.</p></div> : numberField('score', `Score (out of ${maxPoints})`)}
          <div className="space-y-2"><Label htmlFor="overallComment">Feedback for the student</Label><textarea id="overallComment" className="w-full min-h-28 rounded-md border border-input bg-background p-3 text-sm" placeholder="Explain what went well and what to work on next." value={form.overallComment} onChange={e => change('overallComment', e.target.value)} /></div>
          <details open={Boolean(form.scoreOverride !== '' || form.secondMarkerScore !== '' || form.moderationComment)}><summary className="cursor-pointer text-sm font-medium">Moderation and score override</summary><div className="grid sm:grid-cols-2 gap-4 mt-4">{numberField('scoreOverride', 'Score override')}<div className="space-y-2"><Label htmlFor="overrideReason">Override reason</Label><Input id="overrideReason" value={form.overrideReason} onChange={e => change('overrideReason', e.target.value)} /></div>{numberField('secondMarkerScore', 'Second marker score')}<div className="space-y-2"><Label htmlFor="moderationComment">Moderation note</Label><Input id="moderationComment" value={form.moderationComment} onChange={e => change('moderationComment', e.target.value)} /></div></div></details>
          <p className="text-sm text-muted-foreground">Save a draft to continue later. Finalizing locks the mark and updates the attempt total; releasing results is a separate step.</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => save('IN_REVIEW')}>Save draft</Button><Button onClick={() => save('GRADED')}>Save grade</Button><Button variant="outline" onClick={() => save('GRADED', true)}><Lock className="h-4 w-4 mr-1" /> Finalize</Button></div>
        </fieldset>
        <p role="status" className="text-sm text-muted-foreground">{busy ? 'Saving…' : dirty ? 'Unsaved marking changes' : savedMessage}</p>
      </>}
    </div>
  );
}
