import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { CalendarClock, Save, ShieldCheck } from 'lucide-react';

const dtLocal = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 16) : '');

export default function ExamScheduling() {
  const { examId } = useParams();
  const [s, setS] = useState<any>(null);
  const [p, setP] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet(`/api/exams/${examId}/schedule`).then(setS).catch(() => setS({}));
    apiGet(`/api/exams/${examId}/result-policy`).then((r) => setP(r || { releaseMode: 'IMMEDIATE', showScore: true, showPassFail: true, showTeacherFeedback: true })).catch(() => setP({ releaseMode: 'IMMEDIATE' }));
  }, [examId]);

  const field = (k: string, v: any) => setS((o: any) => ({ ...o, [k]: v }));
  const pol = (k: string, v: any) => setP((o: any) => ({ ...o, [k]: v }));

  const saveAll = async () => {
    setSaving(true);
    try {
      await apiSend(`/api/exams/${examId}/schedule`, 'PUT', s);
      await apiSend(`/api/exams/${examId}/result-policy`, 'PUT', p);
      toast.success('Schedule & result policy saved');
    } catch (e: any) { toast.error(e.message || 'Save failed'); } finally { setSaving(false); }
  };

  if (!s || !p) return <div className="py-20 text-center text-slate-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><CalendarClock className="h-6 w-6 text-aubergine-600" /> Exam Scheduling</h1>
          <p className="text-sm text-slate-500 mt-1">Availability window, attempt rules, security and result release.</p>
        </div>
        <Button onClick={saveAll} disabled={saving} className="bg-primary text-primary-foreground"><Save className="h-4 w-4 mr-1" /> {saving ? 'Saving…' : 'Save'}</Button>
      </div>

      <section className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-widest">Availability</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Available from</Label><Input type="datetime-local" value={dtLocal(s.availableFrom)} onChange={(e) => field('availableFrom', e.target.value || null)} /></div>
          <div><Label>Available until</Label><Input type="datetime-local" value={dtLocal(s.availableUntil)} onChange={(e) => field('availableUntil', e.target.value || null)} /></div>
          <div><Label>Duration (minutes)</Label><Input type="number" value={s.durationMinutes ?? ''} onChange={(e) => field('durationMinutes', e.target.value)} /></div>
          <div><Label>Grace period (minutes)</Label><Input type="number" value={s.gracePeriodMinutes ?? 0} onChange={(e) => field('gracePeriodMinutes', e.target.value)} /></div>
          <div><Label>Attempt limit</Label><Input type="number" value={s.attemptLimit ?? 1} onChange={(e) => field('attemptLimit', e.target.value)} /></div>
          <div><Label>Pass mark</Label><Input type="number" value={s.passMark ?? ''} onChange={(e) => field('passMark', e.target.value)} /></div>
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          {[['allowLateStart', 'Allow late start'], ['shuffleQuestions', 'Shuffle questions'], ['shuffleOptions', 'Shuffle options'], ['negativeMarking', 'Negative marking'], ['requiresInvigilator', 'Requires invigilator']].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={!!s[k]} onChange={(e) => field(k, e.target.checked)} /> {label}
            </label>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Access</h2>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!s.requiresAccessCode} onChange={(e) => field('requiresAccessCode', e.target.checked)} /> Require access code</label>
        {s.requiresAccessCode && <div><Label>Set / change code</Label><Input placeholder={s.hasAccessCode ? '•••••• (leave blank to keep)' : 'Enter code'} onChange={(e) => field('accessCode', e.target.value)} /></div>}
      </section>

      {/* Result-release settings */}
      <section className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-widest">Result Release</h2>
        <div>
          <Label>Release mode</Label>
          <select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={p.releaseMode} onChange={(e) => pol('releaseMode', e.target.value)}>
            <option value="IMMEDIATE">Immediately after submit</option>
            <option value="SCHEDULED">At a scheduled time</option>
            <option value="AFTER_GRADING">Only after manual grading</option>
            <option value="HIDDEN">Hidden (never)</option>
          </select>
        </div>
        {p.releaseMode === 'SCHEDULED' && <div><Label>Release at</Label><Input type="datetime-local" value={dtLocal(p.releaseAt)} onChange={(e) => pol('releaseAt', e.target.value || null)} /></div>}
        <div className="flex flex-wrap gap-4 pt-2">
          {[['showScore', 'Show score'], ['showPassFail', 'Show pass/fail'], ['showCorrectAnswers', 'Show correct answers'], ['showExplanations', 'Show explanations'], ['showTeacherFeedback', 'Show feedback']].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input type="checkbox" checked={!!p[k]} onChange={(e) => pol(k, e.target.checked)} /> {label}
            </label>
          ))}
        </div>
      </section>

      <div className="flex gap-3 text-sm">
        <Link className="text-aubergine-600 font-semibold" to={`/exam2/${examId}/invigilator`}>Invigilator dashboard →</Link>
        <Link className="text-aubergine-600 font-semibold" to={`/exam2/${examId}/analytics`}>Analytics →</Link>
        <Link className="text-aubergine-600 font-semibold" to={`/exam2/${examId}/print`}>Print export →</Link>
      </div>
    </div>
  );
}
