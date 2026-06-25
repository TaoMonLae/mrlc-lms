import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authHeaders } from '../../lib/api';
import { Clock, Save, Flag, Pause, Send, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Server-authoritative exam player.
 *  - Autosaves every 8s, on navigation, on pause and on submit.
 *  - Recovers full state on mount (refresh / reconnection safe).
 *  - The countdown is seeded from the server's remainingSeconds + serverTime and
 *    is re-synced on every save; the browser timer is display-only.
 *  - Handles SESSION_CONFLICT (another session) and TIME_EXPIRED (auto-submit).
 */
type Q = { id: string; text: string; type: string; points: number; options: any; partialCredit?: boolean };
type Answer = { answerText?: string; selectedOptions?: string[]; flaggedForReview?: boolean };

export default function ExamPlayer() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [savedAt, setSavedAt] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [blocked, setBlocked] = useState<string>('');
  const dirty = useRef<Set<string>>(new Set());
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const post = useCallback(async (path: string, body?: any) => {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }, []);

  // ── load / recover state ───────────────────────────────────────────────────
  const loadState = useCallback(async () => {
    const res = await fetch(`/api/attempts/${attemptId}/state`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBlocked(data.error || 'Could not load attempt'); setLoading(false); return; }
    if (data.autoSubmitted) { toast.info('Time expired — your attempt was submitted.'); navigate(`/exam2/attempts/${attemptId}/result`); return; }
    setQuestions(data.questions || []);
    setExamTitle(data.exam?.title || 'Exam');
    setSessionToken(data.attempt?.sessionToken || '');
    setRemaining(data.attempt?.remainingSeconds ?? 0);
    setSavedAt(data.attempt?.lastSavedAt || '');
    const map: Record<string, Answer> = {};
    for (const a of data.answers || []) map[a.questionId] = { answerText: a.answerText ?? '', selectedOptions: a.selectedOptions ?? [], flaggedForReview: a.flaggedForReview };
    setAnswers(map);
    setLoading(false);
  }, [attemptId, navigate]);

  useEffect(() => { loadState(); }, [loadState]);

  // ── display countdown (re-synced by server on each save) ────────────────────
  useEffect(() => {
    if (loading || blocked) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [loading, blocked]);

  useEffect(() => {
    if (!loading && remaining === 0 && !blocked) { handleSubmit(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, loading]);

  const save = useCallback(async (reason: string) => {
    if (!attemptId) return;
    const toSave = Array.from(dirty.current);
    const payload = (toSave.length ? toSave : Object.keys(answersRef.current)).map((qid) => ({
      questionId: qid, ...answersRef.current[qid],
    }));
    setSaving(true);
    const { ok, status, data } = await post(`/api/attempts/${attemptId}/save`, { sessionToken, reason, answers: payload });
    setSaving(false);
    if (ok) { dirty.current.clear(); setSavedAt(data.lastSavedAt || new Date().toISOString()); if (typeof data.remainingSeconds === 'number') setRemaining(data.remainingSeconds); return true; }
    if (status === 409 && data.error === 'SESSION_CONFLICT') { setBlocked('This attempt was opened in another window or device. This session is now read-only.'); return false; }
    if (status === 409 && (data.error === 'TIME_EXPIRED' || data.autoSubmitted)) { toast.info('Time expired — submitted.'); navigate(`/exam2/attempts/${attemptId}/result`); return false; }
    return false;
  }, [attemptId, sessionToken, post, navigate]);

  // autosave loop (every 8s)
  useEffect(() => {
    if (loading || blocked) return;
    const t = setInterval(() => { if (dirty.current.size) save('AUTOSAVE'); }, 8000);
    return () => clearInterval(t);
  }, [loading, blocked, save]);

  // save on unload
  useEffect(() => {
    const h = () => { if (dirty.current.size) navigator.sendBeacon?.(`/api/attempts/${attemptId}/save`, new Blob([JSON.stringify({ sessionToken, reason: 'AUTOSAVE', answers: Object.keys(answersRef.current).map((qid) => ({ questionId: qid, ...answersRef.current[qid] })) })], { type: 'application/json' })); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [attemptId, sessionToken]);

  const setAnswer = (qid: string, patch: Answer) => { setAnswers((p) => ({ ...p, [qid]: { ...p[qid], ...patch } })); dirty.current.add(qid); };

  const goTo = async (next: number) => { await save('NAVIGATE'); setIdx(Math.max(0, Math.min(questions.length - 1, next))); };

  const handlePause = async () => { await save('PAUSE'); await post(`/api/attempts/${attemptId}/pause`); toast.success('Attempt paused. You can resume later.'); navigate('/exam2/resume'); };

  const handleSubmit = async (auto = false) => {
    if (!auto && !confirm('Submit your exam? You will not be able to change your answers.')) return;
    await save('SUBMIT');
    const { ok, data } = await post(`/api/attempts/${attemptId}/submit`);
    if (ok) { toast.success('Exam submitted.'); navigate(`/exam2/attempts/${attemptId}/result`); }
    else toast.error(data.error || 'Could not submit');
  };

  if (loading) return <div className="flex items-center justify-center py-32 text-slate-500"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading exam…</div>;
  if (blocked) return (
    <div className="max-w-xl mx-auto mt-20 p-8 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-center space-y-3">
      <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Session locked</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{blocked}</p>
      <Button onClick={() => navigate('/exam2/resume')}>Back to my exams</Button>
    </div>
  );

  const q = questions[idx];
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const low = remaining <= 60;

  return (
    <div className="max-w-3xl mx-auto pb-24" data-no-i18n>
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-canvas/90 backdrop-blur border-b border-slate-200 dark:border-surface-raised py-3 mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white">{examTitle}</h1>
          <p className="text-[11px] text-slate-400 font-medium">{saving ? 'Saving…' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : 'Not saved yet'}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${low ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'}`}>
          <Clock className="h-4 w-4" /> {mm}:{ss}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {idx + 1} of {questions.length} · {q?.points} pts</span>
          <Button variant="ghost" size="sm" onClick={() => setAnswer(q.id, { flaggedForReview: !answers[q.id]?.flaggedForReview })} className={answers[q.id]?.flaggedForReview ? 'text-amber-600' : 'text-slate-400'}>
            <Flag className="h-4 w-4 mr-1" /> {answers[q.id]?.flaggedForReview ? 'Flagged' : 'Flag'}
          </Button>
        </div>
        <p className="text-base font-medium text-slate-900 dark:text-white whitespace-pre-wrap">{q?.text}</p>

        {/* answer input by type */}
        {Array.isArray(q?.options) && q.options.length ? (
          <div className="space-y-2">
            {(q.options as any[]).map((opt, i) => {
              const val = String(typeof opt === 'object' ? opt.value ?? opt.text ?? i : opt);
              const multi = q.partialCredit;
              const selected = multi ? (answers[q.id]?.selectedOptions || []).includes(val) : answers[q.id]?.answerText === val;
              return (
                <button key={i} type="button"
                  onClick={() => multi
                    ? setAnswer(q.id, { selectedOptions: selected ? (answers[q.id]?.selectedOptions || []).filter((v) => v !== val) : [...(answers[q.id]?.selectedOptions || []), val] })
                    : setAnswer(q.id, { answerText: val })}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selected ? 'border-aubergine-500 bg-aubergine-50 dark:bg-aubergine-900/20' : 'border-slate-200 dark:border-surface-raised hover:border-slate-300'}`}>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{String(typeof opt === 'object' ? opt.text ?? opt.value : opt)}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="w-full min-h-[140px] rounded-lg border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas p-3 text-sm"
            placeholder="Type your answer…"
            value={answers[q?.id]?.answerText || ''}
            onChange={(e) => setAnswer(q.id, { answerText: e.target.value })}
          />
        )}
      </div>

      {/* question navigator */}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {questions.map((qq, i) => (
          <button key={qq.id} onClick={() => goTo(i)}
            className={`h-8 w-8 rounded text-xs font-bold ${i === idx ? 'bg-aubergine-600 text-white' : answers[qq.id]?.flaggedForReview ? 'bg-amber-100 text-amber-700 border border-amber-300' : (answers[qq.id]?.answerText || answers[qq.id]?.selectedOptions?.length) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-surface-raised text-slate-500'}`}>
            {i + 1}
          </button>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-canvas border-t border-slate-200 dark:border-surface-raised p-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button variant="outline" disabled={idx === 0} onClick={() => goTo(idx - 1)}>Previous</Button>
          <Button variant="outline" disabled={idx >= questions.length - 1} onClick={() => goTo(idx + 1)}>Next</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save('AUTOSAVE')}><Save className="h-4 w-4 mr-1" /> Save</Button>
          <Button variant="outline" onClick={handlePause}><Pause className="h-4 w-4 mr-1" /> Pause</Button>
          <Button className="bg-primary text-primary-foreground" onClick={() => handleSubmit(false)}><Send className="h-4 w-4 mr-1" /> Submit</Button>
        </div>
      </div>
    </div>
  );
}
