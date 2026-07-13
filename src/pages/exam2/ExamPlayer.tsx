import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authHeaders } from '../../lib/api';
import { Clock, Save, Flag, Pause, Send, AlertTriangle, Loader2 } from 'lucide-react';
import MathText from '../../components/MathText';
import { splitDragText } from '../../lib/dragBlanks';

/**
 * Server-authoritative exam player.
 *  - Autosaves every 8s, on navigation, on pause and on submit.
 *  - Recovers full state on mount (refresh / reconnection safe).
 *  - The countdown is seeded from the server's remainingSeconds + serverTime and
 *    is re-synced on every save; the browser timer is display-only.
 *  - Handles SESSION_CONFLICT (another session) and TIME_EXPIRED (auto-submit).
 */
type DragBankItem = { key: string; label: string };
type Q = { id: string; text: string; type: string; points: number; options: any; partialCredit?: boolean; passageText?: string | null; imageUrl?: string | null; dragText?: string; dragBank?: DragBankItem[] };
type Answer = { answerText?: string; selectedOptions?: string[] | Record<string, string>; flaggedForReview?: boolean };

// A small rotating palette so drag chips read as playful/colorful (Wayground
// style) rather than one flat color — purely cosmetic, keyed by chip index.
const CHIP_COLORS = [
  'border-aubergine-300 bg-aubergine-50 text-aubergine-800 dark:border-aubergine-700 dark:bg-aubergine-900/30 dark:text-aubergine-200',
  'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700 dark:bg-sky-900/30 dark:text-sky-200',
  'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
];

// Written-answer types always render a free-text box (never multiple choice),
// even if stray options exist on the record.
const TEXT_ANSWER_TYPES = ['SHORT_ANSWER', 'ESSAY', 'WRITTEN', 'EXTENDED'];

export default function ExamPlayer() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [canPause, setCanPause] = useState(false);
  const [savedAt, setSavedAt] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [blocked, setBlocked] = useState<string>('');
  const [selectedDragItem, setSelectedDragItem] = useState<string | null>(null);
  const dirty = useRef<Set<string>>(new Set());
  const answersRef = useRef(answers);
  answersRef.current = answers;
  // True only once a real countdown has been seeded (remaining > 0). Guards the
  // auto-submit effect so a seeded remaining=0 (untimed exam / missing
  // serverDeadline) can't submit the attempt the instant it loads.
  const timerArmed = useRef(false);

  const post = useCallback(async (path: string, body?: any) => {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }, []);

  // ── load / recover state ───────────────────────────────────────────────────
  const loadState = useCallback(async () => {
    const storedToken = attemptId ? sessionStorage.getItem(`exam_attempt_session_${attemptId}`) || '' : '';
    if (!storedToken) { setBlocked('This exam session has expired. Resume the attempt from My Exams.'); setLoading(false); return; }
    const res = await fetch(`/api/attempts/${attemptId}/state`, { headers: { ...authHeaders(), 'X-Exam-Session': storedToken } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBlocked(data.message || data.error || 'Could not load attempt'); setLoading(false); return; }
    if (data.autoSubmitted) { toast.info('Time expired — your attempt was submitted.'); navigate(`/exam2/attempts/${attemptId}/result`); return; }
    setQuestions(data.questions || []);
    setExamTitle(data.exam?.title || 'Exam');
    setSessionToken(data.attempt?.sessionToken || '');
    setCanPause(!!data.attempt?.canPause);
    const seeded = data.attempt?.remainingSeconds ?? 0;
    if (seeded > 0) timerArmed.current = true;
    setRemaining(seeded);
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
    // Only auto-submit when a real timer has counted down to zero — never on a
    // seeded remaining=0 for an untimed attempt.
    if (!loading && remaining === 0 && !blocked && timerArmed.current) { handleSubmit(true); }
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
    if (ok) { dirty.current.clear(); setSavedAt(data.lastSavedAt || new Date().toISOString()); if (typeof data.remainingSeconds === 'number') { if (data.remainingSeconds > 0) timerArmed.current = true; setRemaining(data.remainingSeconds); } return true; }
    if (status === 409 && data.error === 'SESSION_CONFLICT') { setBlocked('This attempt was opened in another window or device. This session is now read-only.'); return false; }
    if (status === 409 && data.error === 'ATTEMPT_PAUSED') { setBlocked('This attempt has been paused. Resume it from My Exams before continuing.'); return false; }
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
    // sendBeacon cannot attach the bearer token used by this app, so those
    // unload saves were rejected with 401. keepalive fetch preserves auth while
    // still allowing the browser to finish the request during navigation.
    const h = () => {
      if (!dirty.current.size) return;
      void fetch(`/api/attempts/${attemptId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ sessionToken, reason: 'AUTOSAVE', answers: Object.keys(answersRef.current).map((qid) => ({ questionId: qid, ...answersRef.current[qid] })) }),
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [attemptId, sessionToken]);

  const setAnswer = (qid: string, patch: Answer) => { setAnswers((p) => ({ ...p, [qid]: { ...p[qid], ...patch } })); dirty.current.add(qid); };

  const goTo = async (next: number) => { await save('NAVIGATE'); setIdx(Math.max(0, Math.min(questions.length - 1, next))); };

  const handlePause = async () => {
    if (!canPause) return;
    if (!(await save('PAUSE'))) return;
    const { ok, data } = await post(`/api/attempts/${attemptId}/pause`, { sessionToken });
    if (!ok) { toast.error(data.error || 'Could not pause attempt'); return; }
    toast.success('Attempt paused. You can resume later.');
    navigate('/exam2/resume');
  };

  const handleSubmit = async (auto = false) => {
    if (!auto && !confirm('Submit your exam? You will not be able to change your answers.')) return;
    if (!(await save('SUBMIT'))) return;
    const { ok, data } = await post(`/api/attempts/${attemptId}/submit`, { sessionToken });
    if (ok) { sessionStorage.removeItem(`exam_attempt_session_${attemptId}`); toast.success('Exam submitted.'); navigate(`/exam2/attempts/${attemptId}/result`); }
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

  const selectedChoices = (questionId: string) => {
    const selected = answers[questionId]?.selectedOptions;
    return Array.isArray(selected) ? selected : [];
  };
  // { [blankId]: bankKey } — which word-bank chip (by its stable key) is
  // sitting in each blank.
  const dragMatches = (questionId: string): Record<string, string> => {
    const selected = answers[questionId]?.selectedOptions;
    return selected && !Array.isArray(selected) ? (selected as Record<string, string>) : {};
  };
  const placeChip = (blankId: string, key: string) => {
    if (!q) return;
    const next = { ...dragMatches(q.id) };
    // A chip can only occupy one blank — lift it out of wherever it was.
    for (const [bId, k] of Object.entries(next)) if (k === key) delete next[bId];
    next[blankId] = key;
    setAnswer(q.id, { selectedOptions: next });
    setSelectedDragItem(null);
  };
  const clearBlank = (blankId: string) => {
    if (!q) return;
    const next = { ...dragMatches(q.id) };
    const key = next[blankId];
    delete next[blankId];
    setAnswer(q.id, { selectedOptions: next });
    setSelectedDragItem(key ?? null);
  };

  // Wayground-style fill-in-the-blank: the passage renders inline with each
  // blank as a drop target; matching (and any extra distractor) words sit in
  // a word bank below as draggable chips. Tap-to-select is supported
  // alongside native HTML5 drag for touch devices / accessibility.
  const renderDragDrop = () => {
    const bank = q?.dragBank || [];
    const segments = splitDragText(q?.dragText || '');
    const matches = dragMatches(q.id);
    const usedKeys = new Set(Object.values(matches));
    const availableChips = bank.filter((chip) => !usedKeys.has(chip.key));
    const allPlaced = bank.length > 0 && availableChips.length === 0;
    const chipColor = (key: string) => CHIP_COLORS[Math.max(0, bank.findIndex((c) => c.key === key)) % CHIP_COLORS.length];
    return (
      <div key={q.id} className="animate-in fade-in slide-in-from-bottom-2 space-y-5 duration-300">
        <p className="text-sm text-slate-500 dark:text-slate-300">Drag a word into each blank, or tap a word then tap a blank.</p>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-lg leading-loose dark:border-surface-raised dark:bg-canvas">
          {segments.map((seg, i) => {
            if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
            const key = matches[seg.blankId];
            const chip = key ? bank.find((c) => c.key === key) : undefined;
            return (
              <span key={i}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); const k = event.dataTransfer.getData('text/plain'); if (bank.some((c) => c.key === k)) placeChip(seg.blankId, k); }}
                onClick={() => (selectedDragItem ? placeChip(seg.blankId, selectedDragItem) : chip ? clearBlank(seg.blankId) : undefined)}
                className={`mx-1 inline-flex min-w-[6rem] cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-1 align-middle text-base font-bold transition-all ${
                  chip
                    ? 'border-solid shadow-sm'
                    : selectedDragItem
                    ? 'border-dashed border-aubergine-400 bg-aubergine-50/70 dark:bg-aubergine-900/10'
                    : 'border-dashed border-slate-300 bg-slate-50 dark:border-surface-raised dark:bg-surface-raised/40'
                }`}>
                {chip ? <span key={key} className={`animate-in zoom-in-75 -mx-1 rounded px-1 duration-200 ${chipColor(key)}`}>{chip.label}</span> : ' '}
              </span>
            );
          })}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-surface-raised dark:bg-surface-raised/30">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-slate-400">Word bank — drag from here</p>
          {allPlaced ? (
            <p className="animate-in zoom-in-95 flex items-center gap-1.5 text-sm font-bold text-emerald-600 duration-300">✓ All words placed — nice work!</p>
          ) : (
            <div className="flex flex-wrap gap-2" aria-label="Draggable words">
              {availableChips.map((chip) => (
                <button key={chip.key} type="button" draggable
                  onDragStart={(event) => { event.dataTransfer.setData('text/plain', chip.key); event.dataTransfer.effectAllowed = 'move'; setSelectedDragItem(chip.key); }}
                  onClick={() => setSelectedDragItem((current) => (current === chip.key ? null : chip.key))}
                  aria-pressed={selectedDragItem === chip.key}
                  className={`cursor-grab rounded-full border-2 px-4 py-2 text-sm font-bold shadow-sm transition-transform hover:-translate-y-0.5 active:cursor-grabbing ${chipColor(chip.key)} ${selectedDragItem === chip.key ? 'ring-2 ring-aubergine-400 ring-offset-2 dark:ring-offset-canvas' : ''}`}>
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAnswerInput = () => {
    if (q?.type === 'DRAG_DROP') return renderDragDrop();
    // Drop-down: single-select rendered as a native <select> (graded as a choice).
    if (q?.type === 'DROPDOWN' && Array.isArray(q?.options) && q.options.length) {
      return (
        <select
          value={answers[q.id]?.answerText ?? ''}
          onChange={(e) => setAnswer(q.id, { answerText: e.target.value })}
          className="w-full max-w-md rounded-lg border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-4 py-3 text-sm">
          <option value="">Select an answer…</option>
          {(q.options as any[]).map((opt, i) => {
            const val = String(typeof opt === 'object' ? opt.value ?? opt.text ?? i : opt);
            return <option key={i} value={val}>{String(typeof opt === 'object' ? opt.text ?? opt.value : opt)}</option>;
          })}
        </select>
      );
    }
    if (!TEXT_ANSWER_TYPES.includes(q?.type) && Array.isArray(q?.options) && q.options.length) {
      return (
        <div className="space-y-2">
          {(q.options as any[]).map((opt, i) => {
            const val = String(typeof opt === 'object' ? opt.value ?? opt.text ?? i : opt);
            const multi = q.partialCredit;
            const selected = multi ? selectedChoices(q.id).includes(val) : answers[q.id]?.answerText === val;
            return (
              <button key={i} type="button"
                onClick={() => multi
                  ? setAnswer(q.id, { selectedOptions: selected ? selectedChoices(q.id).filter((v) => v !== val) : [...selectedChoices(q.id), val] })
                  : setAnswer(q.id, { answerText: val })}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selected ? 'border-aubergine-500 bg-aubergine-50 dark:bg-aubergine-900/20' : 'border-slate-200 dark:border-surface-raised hover:border-slate-300'}`}>
                <MathText className="text-sm font-medium text-slate-800 dark:text-slate-200">{String(typeof opt === 'object' ? opt.text ?? opt.value : opt)}</MathText>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <textarea
        className="w-full min-h-[140px] rounded-lg border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas p-3 text-sm"
        placeholder="Type your answer…"
        value={answers[q?.id]?.answerText || ''}
        onChange={(e) => setAnswer(q.id, { answerText: e.target.value })}
      />
    );
  };

  const hasPassage = Boolean(q?.passageText);

  return (
    <div className={`${hasPassage ? 'max-w-6xl' : 'max-w-3xl'} mx-auto pb-24`} data-no-i18n>
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-canvas/90 backdrop-blur border-b border-slate-200 dark:border-surface-raised py-3 mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-slate-900 dark:text-white">{examTitle}</h1>
          <p className="text-[11px] text-slate-400 font-medium">{saving ? 'Saving…' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : 'Not saved yet'}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${low ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'}`}>
          <Clock className="h-4 w-4" /> {mm}:{ss}
        </div>
      </div>

      {hasPassage ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Passage */}
          <div className="md:col-span-6 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4 max-h-[60vh] md:max-h-[70vh] overflow-y-auto sticky top-20">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 dark:border-surface-raised">Passage</h3>
            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              <MathText>{q.passageText || ''}</MathText>
            </div>
          </div>

          {/* Right Column: Question & Answer */}
          <div className="md:col-span-6 bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {idx + 1} of {questions.length} · {q?.points} pts</span>
              <Button variant="ghost" size="sm" onClick={() => setAnswer(q.id, { flaggedForReview: !answers[q.id]?.flaggedForReview })} className={answers[q.id]?.flaggedForReview ? 'text-amber-600' : 'text-slate-400'}>
                <Flag className="h-4 w-4 mr-1" /> {answers[q.id]?.flaggedForReview ? 'Flagged' : 'Flag'}
              </Button>
            </div>
            <p className="text-base font-medium text-slate-900 dark:text-white whitespace-pre-wrap"><MathText>{q?.text || ''}</MathText></p>
            {q?.imageUrl && <img src={q.imageUrl} alt="Question media" className="max-h-72 rounded-lg border border-slate-200 dark:border-surface-raised" />}
            {renderAnswerInput()}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Question {idx + 1} of {questions.length} · {q?.points} pts</span>
            <Button variant="ghost" size="sm" onClick={() => setAnswer(q.id, { flaggedForReview: !answers[q.id]?.flaggedForReview })} className={answers[q.id]?.flaggedForReview ? 'text-amber-600' : 'text-slate-400'}>
              <Flag className="h-4 w-4 mr-1" /> {answers[q.id]?.flaggedForReview ? 'Flagged' : 'Flag'}
            </Button>
          </div>
          <p className="text-base font-medium text-slate-900 dark:text-white whitespace-pre-wrap">{q?.text}</p>
          {renderAnswerInput()}
        </div>
      )}

      {/* question navigator */}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {questions.map((qq, i) => (
          <button key={qq.id} onClick={() => goTo(i)}
            className={`h-8 w-8 rounded text-xs font-bold ${i === idx ? 'bg-aubergine-600 text-white' : answers[qq.id]?.flaggedForReview ? 'bg-amber-100 text-amber-700 border border-amber-300' : (answers[qq.id]?.answerText || selectedChoices(qq.id).length || Object.keys(dragMatches(qq.id)).length) ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 dark:bg-surface-raised text-slate-500'}`}>
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
          {canPause && <Button variant="outline" onClick={handlePause}><Pause className="h-4 w-4 mr-1" /> Pause</Button>}
          <Button className="bg-primary text-primary-foreground" onClick={() => handleSubmit(false)}><Send className="h-4 w-4 mr-1" /> Submit</Button>
        </div>
      </div>
    </div>
  );
}
