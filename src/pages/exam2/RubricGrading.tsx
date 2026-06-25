import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Lock } from 'lucide-react';

/** Grade a single manual answer against an optional rubric, with override,
 *  second marker, moderation and finalization lock. */
export default function RubricGrading() {
  const { attemptId, questionId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<any>(null);
  const [crit, setCrit] = useState<Record<string, number>>({});
  const [form, setForm] = useState<any>({ score: '', overallComment: '', scoreOverride: '', overrideReason: '', secondMarkerScore: '', moderationComment: '' });

  useEffect(() => {
    apiGet(`/api/grading/queue?`).then((rows: any[]) => {
      const found = (rows || []).find((r) => r.attemptId === attemptId && r.questionId === questionId);
      setItem(found || { attemptId, questionId });
      if (found) {
        setForm({ score: found.score ?? '', overallComment: found.overallComment ?? '', scoreOverride: found.scoreOverride ?? '', overrideReason: found.overrideReason ?? '', secondMarkerScore: found.secondMarkerScore ?? '', moderationComment: found.moderationComment ?? '' });
        if (found.criterionScores) setCrit(found.criterionScores);
      }
    }).catch(() => setItem({ attemptId, questionId }));
  }, [attemptId, questionId]);

  if (!item) return <div className="py-20 text-center text-slate-500">Loading…</div>;
  const criteria = item.rubric?.criteria || [];
  const locked = item.isFinalized;

  const save = async (status: string) => {
    try {
      const critTotal = Object.values(crit).reduce((a: number, b: any) => a + Number(b || 0), 0);
      await apiSend(`/api/grading/${attemptId}/${questionId}`, 'POST', {
        ...form, status, criterionScores: criteria.length ? crit : undefined,
        score: criteria.length ? critTotal : (form.score === '' ? null : Number(form.score)),
        scoreOverride: form.scoreOverride === '' ? null : Number(form.scoreOverride),
        secondMarkerScore: form.secondMarkerScore === '' ? null : Number(form.secondMarkerScore),
        rubricId: item.rubric?.id,
      });
      toast.success('Saved');
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  const finalize = async () => {
    if (!confirm('Finalize locks this grade and updates the attempt total. Continue?')) return;
    await save('GRADED');
    try {
      if (!item.id) { const rows = await apiGet(`/api/grading/queue?`); const g = (rows || []).find((r: any) => r.attemptId === attemptId && r.questionId === questionId); item.id = g?.id; }
      await apiSend(`/api/grading/${item.id}/finalize`, 'POST');
      toast.success('Finalized & locked');
      navigate('/exam2/grading');
    } catch (e: any) { toast.error(e.message || 'Finalize failed'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Grade Response</h1>
      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Student answer</p>
        <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{item.answer?.answerText || '— no answer —'}</p>
      </div>

      {locked && <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 bg-slate-100 dark:bg-surface-raised rounded-lg p-3"><Lock className="h-4 w-4" /> This grade is finalized and locked.</div>}

      <fieldset disabled={locked} className="space-y-4">
        {criteria.length > 0 ? (
          <div className="space-y-3">
            {criteria.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between gap-4 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-lg p-3">
                <div><p className="font-semibold text-sm text-slate-800 dark:text-white">{c.label}</p>{c.description && <p className="text-xs text-slate-500">{c.description}</p>}</div>
                <Input type="number" className="w-24" max={c.maxScore} placeholder={`/${c.maxScore}`} value={crit[c.id] ?? ''} onChange={(e) => setCrit((p) => ({ ...p, [c.id]: Number(e.target.value) }))} />
              </div>
            ))}
          </div>
        ) : (
          <div><Label>Score</Label><Input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
        )}
        <div><Label>Overall comment</Label><textarea className="w-full min-h-[80px] rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas p-2 text-sm" value={form.overallComment} onChange={(e) => setForm({ ...form, overallComment: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Score override</Label><Input type="number" value={form.scoreOverride} onChange={(e) => setForm({ ...form, scoreOverride: e.target.value })} /></div>
          <div><Label>Override reason</Label><Input value={form.overrideReason} onChange={(e) => setForm({ ...form, overrideReason: e.target.value })} /></div>
          <div><Label>Second marker score</Label><Input type="number" value={form.secondMarkerScore} onChange={(e) => setForm({ ...form, secondMarkerScore: e.target.value })} /></div>
          <div><Label>Moderation note</Label><Input value={form.moderationComment} onChange={(e) => setForm({ ...form, moderationComment: e.target.value })} /></div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save('IN_REVIEW')}>Save draft</Button>
          <Button onClick={() => save('GRADED')} className="bg-primary text-primary-foreground">Save grade</Button>
          <Button onClick={finalize} className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 ml-auto"><Lock className="h-4 w-4 mr-1" /> Finalize</Button>
        </div>
      </fieldset>
    </div>
  );
}
