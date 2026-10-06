import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { authHeaders } from '../../lib/api';
import { Save, Pause, AlertTriangle, Loader2 } from 'lucide-react';
import MathText from '../../components/MathText';
import ExamPaper from '../../components/exams/ExamPaper';
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
type Q = { id: string; text: string; type: string; points: number; options: any; partialCredit?: boolean; multipleSelection?: boolean; passageText?: string | null; imageUrl?: string | null; dragText?: string; dragBank?: DragBankItem[] };
type Answer = { answerText?: string; selectedOptions?: string[] | Record<string, string>; flaggedForReview?: boolean };
type ExamSettings = { audience?: string; questionTheme?: string; lockdownBrowser?: boolean; antiCheat?: { requireFullscreen?: boolean; blockClipboard?: boolean; warnOnFocusLoss?: boolean } };

function answerIsComplete(question: Q, answer?: Answer): boolean {
  if (question.type === 'DRAG_DROP') {
    const blankIds = splitDragText(question.dragText || '').filter((segment) => segment.kind === 'blank').map((segment: any) => segment.blankId);
    const matches = answer?.selectedOptions && !Array.isArray(answer.selectedOptions) ? answer.selectedOptions : {};
    return blankIds.length > 0 && blankIds.every((blankId) => Boolean(matches[blankId]));
  }
  if (Array.isArray(answer?.selectedOptions) && answer.selectedOptions.length > 0) return true;
  return Boolean(answer?.answerText?.trim());
}

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
  const [saveError, setSaveError] = useState('');
  const [loadError, setLoadError] = useState('');
  const saveInFlight = useRef<Promise<boolean> | null>(null);
  const submitPending = useRef(false);
  const countdownDeadline = useRef<number | null>(null);
  const [timerTick, setTimerTick] = useState(0);
  const lastAutoSubmit = useRef(0);
  const [submitting, setSubmitting] = useState(false);
  const [examTitle, setExamTitle] = useState('');
  const [examSettings, setExamSettings] = useState<ExamSettings>({});
  const [securityWarnings, setSecurityWarnings] = useState(0);
  const [blocked, setBlocked] = useState<string>('');
  const [selectedDragItem, setSelectedDragItem] = useState<string | null>(null);
  const dirty = useRef<Set<string>>(new Set());
  const answerVersions = useRef<Record<string, number>>({});
  const answersRef = useRef(answers);
  answersRef.current = answers;
  // True only once a real countdown has been seeded (remaining > 0). Guards the
  // auto-submit effect so a seeded remaining=0 (untimed exam / missing
  // serverDeadline) can't submit the attempt the instant it loads.
  const timerArmed = useRef(false);
  const fullscreenEntered = useRef(false);
  const lastIntegrityEvent = useRef<Record<string, number>>({});

  const post = useCallback(async (path: string, body?: any) => {
    try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
    } catch { return { ok: false, status: 0, data: { error: 'Connection lost. Your answers remain on this page. Retry when connected.' } }; }
  }, []);

  // ── load / recover state ───────────────────────────────────────────────────
  const loadState = useCallback(async () => {
    setLoadError(''); setLoading(true);
    try {
    const storedToken = attemptId ? sessionStorage.getItem(`exam_attempt_session_${attemptId}`) || '' : '';
    if (!storedToken) { setBlocked('This exam session has expired. Resume the attempt from My Exams.'); setLoading(false); return; }
    const res = await fetch(`/api/attempts/${attemptId}/state`, { headers: { ...authHeaders(), 'X-Exam-Session': storedToken } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status >= 500) setLoadError(data.message || data.error || 'Could not load your exam. Please retry.');
      else setBlocked(data.message || data.error || 'Could not load attempt');
      setLoading(false); return;
    }
    if (data.autoSubmitted) { toast.info('Time expired — your attempt was submitted.'); navigate(`/exam2/attempts/${attemptId}/result`); return; }
    if (data.attempt?.state !== 'IN_PROGRESS') {
      sessionStorage.removeItem(`exam_attempt_session_${attemptId}`);
      navigate(`/exam2/attempts/${attemptId}/result`, { replace: true });
      return;
    }
    setQuestions(data.questions || []);
    setExamTitle(data.exam?.title || 'Exam');
    setExamSettings(data.exam?.settings || {});
    setSessionToken(data.attempt?.sessionToken || '');
    setCanPause(!!data.attempt?.canPause);
    const seeded = data.attempt?.remainingSeconds ?? 0;
    timerArmed.current = seeded > 0;
    countdownDeadline.current = seeded > 0 ? Date.now() + seeded * 1000 : null;
    setRemaining(seeded);
    setSavedAt(data.attempt?.lastSavedAt || '');
    const map: Record<string, Answer> = {};
    for (const a of data.answers || []) map[a.questionId] = { answerText: a.answerText ?? '', selectedOptions: a.selectedOptions ?? [], flaggedForReview: a.flaggedForReview };
    setAnswers(map);
    setLoading(false);
    } catch { setLoadError('Could not load your exam. Check your connection and retry.'); setLoading(false); }
  }, [attemptId, navigate]);

  useEffect(() => { loadState(); }, [loadState]);

  // ── display countdown (re-synced by server on each save) ────────────────────
  useEffect(() => {
    if (loading || blocked || loadError) return;
    const t = setInterval(() => {
      if (countdownDeadline.current !== null) setRemaining(Math.max(0, Math.ceil((countdownDeadline.current - Date.now()) / 1000)));
      setTimerTick(n => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [loading, blocked, loadError]);

  const save = useCallback(async (reason: string) => {
    if (!attemptId) return false;
    // Serialize saves so a slow older answer cannot overwrite a newer one.
    while (saveInFlight.current) { if (!(await saveInFlight.current)) return false; }
    const performSave = async (): Promise<boolean> => {
    const toSave = Array.from(dirty.current);
    const savedVersions = Object.fromEntries(toSave.map((qid) => [qid, answerVersions.current[qid] || 0]));
    const payload = toSave.map((qid) => ({
      questionId: qid, ...answersRef.current[qid],
    }));
    setSaving(true);
    const { ok, status, data } = await post(`/api/attempts/${attemptId}/save`, { sessionToken, reason, answers: payload });
    setSaving(false);
    if (ok) { setSaveError(''); toSave.forEach((qid) => { if ((answerVersions.current[qid] || 0) === savedVersions[qid]) dirty.current.delete(qid); }); setSavedAt(data.lastSavedAt || new Date().toISOString()); if (typeof data.remainingSeconds === 'number') { if (data.remainingSeconds > 0) timerArmed.current = true; countdownDeadline.current = timerArmed.current ? Date.now() + data.remainingSeconds * 1000 : null; setRemaining(data.remainingSeconds); } return true; }
    if (status === 409 && data.error === 'SESSION_CONFLICT') { setBlocked('This attempt was opened in another window or device. This session is now read-only.'); return false; }
    if (status === 409 && data.error === 'ATTEMPT_PAUSED') { setBlocked('This attempt has been paused. Resume it from My Exams before continuing.'); return false; }
    if (status === 409 && (data.error === 'TIME_EXPIRED' || data.autoSubmitted)) { toast.info('Time expired — submitted.'); navigate(`/exam2/attempts/${attemptId}/result`); return false; }
    setSaveError(data.error || 'Your answers could not be saved. Please retry.');
    if (reason !== 'AUTOSAVE') toast.error(data.error || 'Your answers could not be saved. Check your connection and try again.');
    return false;
    };
    const pending = performSave();
    saveInFlight.current = pending;
    try { return await pending; } finally { if (saveInFlight.current === pending) saveInFlight.current = null; }
  }, [attemptId, sessionToken, post, navigate]);

  // autosave loop (every 8s)
  useEffect(() => {
    if (loading || blocked || loadError) return;
    const t = setInterval(() => { if (dirty.current.size && !saveInFlight.current && !submitPending.current && (!countdownDeadline.current || Date.now() < countdownDeadline.current)) void save('AUTOSAVE'); }, 8000);
    return () => clearInterval(t);
  }, [loading, blocked, loadError, save]);

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
      }).catch(() => { /* The page may already be closing. */ });
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [attemptId, sessionToken]);

  useEffect(() => { setSelectedDragItem(null); }, [idx]);

  const setAnswer = (qid: string, patch: Answer) => { setAnswers((p) => ({ ...p, [qid]: { ...p[qid], ...patch } })); answerVersions.current[qid] = (answerVersions.current[qid] || 0) + 1; dirty.current.add(qid); };

  const goTo = async (next: number) => { if (!(await save('NAVIGATE'))) return false; setIdx(Math.max(0, Math.min(questions.length - 1, next))); return true; };

  const reportIntegrity = useCallback(async (type: string, detail?: string) => {
    if (!attemptId || !sessionToken || !examSettings.lockdownBrowser) return;
    const now = Date.now();
    if (now - (lastIntegrityEvent.current[type] || 0) < 1500) return;
    lastIntegrityEvent.current[type] = now;
    const { ok, data } = await post(`/api/attempts/${attemptId}/integrity-event`, { sessionToken, type, detail });
    if (ok) setSecurityWarnings(Number(data.securityWarnings) || 0);
  }, [attemptId, sessionToken, examSettings.lockdownBrowser, post]);

  useEffect(() => {
    if (!examSettings.lockdownBrowser || loading || blocked) return;
    const anti = examSettings.antiCheat || {};
    const visibility = () => { if (document.hidden && anti.warnOnFocusLoss !== false) void reportIntegrity('FOCUS_LOST', 'Exam tab became hidden'); };
    const fullscreen = () => { if (fullscreenEntered.current && !document.fullscreenElement) void reportIntegrity('FULLSCREEN_EXIT'); };
    const clipboard = (event: ClipboardEvent) => {
      const type = event.type === 'paste' ? 'PASTE_ATTEMPT' : 'COPY_ATTEMPT';
      if (anti.blockClipboard) event.preventDefault();
      void reportIntegrity(type);
    };
    const context = (event: MouseEvent) => { if (anti.blockClipboard) event.preventDefault(); void reportIntegrity('CONTEXT_MENU'); };
    const keydown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'p') { if (anti.blockClipboard) event.preventDefault(); void reportIntegrity('PRINT_ATTEMPT'); }
      if ((event.key === 'F12') || (mod && event.shiftKey && ['i', 'j', 'c'].includes(event.key.toLowerCase()))) void reportIntegrity('DEVTOOLS_SHORTCUT');
    };
    document.addEventListener('visibilitychange', visibility); document.addEventListener('fullscreenchange', fullscreen);
    document.addEventListener('copy', clipboard); document.addEventListener('cut', clipboard); document.addEventListener('paste', clipboard);
    document.addEventListener('contextmenu', context); document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('visibilitychange', visibility); document.removeEventListener('fullscreenchange', fullscreen); document.removeEventListener('copy', clipboard); document.removeEventListener('cut', clipboard); document.removeEventListener('paste', clipboard); document.removeEventListener('contextmenu', context); document.removeEventListener('keydown', keydown); };
  }, [examSettings, loading, blocked, reportIntegrity]);

  const enterFullscreen = async () => {
    try { await document.documentElement.requestFullscreen(); fullscreenEntered.current = true; }
    catch { toast.error('Fullscreen could not be started on this device.'); }
  };

  const handlePause = async () => {
    if (!canPause) return;
    if (!(await save('PAUSE'))) return;
    const { ok, data } = await post(`/api/attempts/${attemptId}/pause`, { sessionToken });
    if (!ok) { toast.error(data.error || 'Could not pause attempt'); return; }
    toast.success('Attempt paused. You can resume later.');
    navigate('/exam2/resume');
  };

  const handleSubmit = async (auto = false) => {
    if (submitPending.current) return;
    submitPending.current = true;
    setSubmitting(true);
    try {
      // Submit carries the final answer snapshot atomically. A preceding save or
      // state GET can finalize an expired attempt before these answers arrive.
      if (saveInFlight.current) await saveInFlight.current;
      const finalAnswers = Object.entries(answersRef.current).map(([questionId, answer]) => ({ questionId, ...answer }));
      const { ok, data } = await post(`/api/attempts/${attemptId}/submit`, { sessionToken, answers: finalAnswers, autoSubmit: auto });
      if (ok && data.ok === false && typeof data.remainingSeconds === 'number') {
        setSaveError('');
        timerArmed.current = data.timed !== false;
        const reconciled = timerArmed.current ? Math.max(1, data.remainingSeconds) : 0;
        countdownDeadline.current = timerArmed.current ? Date.now() + reconciled * 1000 : null;
        setRemaining(reconciled);
      } else if (ok || ['SUBMITTED', 'AUTO_SUBMITTED', 'PENDING_GRADING', 'FINALIZED', 'RELEASED'].includes(data.state)) {
        // The final snapshot is now persisted. Result-route recovery can reload
        // the page; its unload handler must not try to save a completed exam.
        dirty.current.clear();
        sessionStorage.removeItem(`exam_attempt_session_${attemptId}`);
        toast.success(data.autoSubmitted ? 'Time expired — your exam was submitted.' : 'Exam submitted.');
        navigate(`/exam2/attempts/${attemptId}/result`);
      } else {
        if (data.error === 'SESSION_CONFLICT' || data.error === 'ATTEMPT_PAUSED') setBlocked(data.message || data.error);
        setSaveError(data.error || 'Could not submit. Please retry.');
        if (!auto) toast.error(data.error || 'Could not submit');
      }
    } finally {
      submitPending.current = false;
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (loading || loadError || blocked || submitting || remaining !== 0 || !timerArmed.current) return;
    // Retry a failed expiry submission without a tight request loop.
    if (Date.now() - lastAutoSubmit.current < 8000) return;
    lastAutoSubmit.current = Date.now();
    void handleSubmit(true);
  }, [remaining, loading, loadError, blocked, submitting, timerTick]);

  if (loading) return <div className="flex items-center justify-center py-32 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading exam…</div>;
  if (loadError) return <div role="alert" className="max-w-xl mx-auto space-y-4 border border-border bg-card p-6"><p>{loadError}</p><Button onClick={() => void loadState()}>Retry</Button></div>;
  if (blocked) return (
    <div className="max-w-xl mx-auto mt-20 p-8 rounded-sm border border-amber-200 bg-amber-50 dark:bg-amber-900/10 text-center space-y-3">
      <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
      <h2 className="text-lg font-bold text-foreground">Session locked</h2>
      <p className="text-sm text-muted-foreground">{blocked}</p>
      <Button onClick={() => navigate('/exam2/resume')}>Back to my exams</Button>
    </div>
  );
  if (!questions.length) return <div className="mx-auto mt-20 max-w-xl rounded-sm border border-amber-200 bg-amber-50 p-8 text-center text-amber-900 dark:bg-amber-900/10 dark:text-amber-100"><AlertTriangle className="mx-auto mb-3 h-9 w-9" /><h2 className="font-bold">No questions are available</h2><p className="mt-1 text-sm">Ask your teacher to review this exam before you continue.</p></div>;

  const q = questions[idx];

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
    const blankIds = segments.filter((segment) => segment.kind === 'blank').map((segment: any) => segment.blankId);
    const allPlaced = blankIds.length > 0 && blankIds.every((blankId) => Boolean(matches[blankId]));
    const chipColor = (key: string) => CHIP_COLORS[Math.max(0, bank.findIndex((c) => c.key === key)) % CHIP_COLORS.length];
    return (
      <div key={q.id} className="animate-in fade-in slide-in-from-bottom-2 space-y-5 duration-300">
        <p className="text-sm text-muted-foreground">Drag a word into each blank, or tap a word then tap a blank.</p>
        <div className="rounded-sm border border-border bg-card p-5 text-lg leading-loose">
          {segments.map((seg, i) => {
            if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
            const key = matches[seg.blankId];
            const chip = key ? bank.find((c) => c.key === key) : undefined;
            return (
              <button key={i} type="button" aria-label={chip ? `Blank filled with ${chip.label}` : 'Empty answer blank'}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); const k = event.dataTransfer.getData('text/plain'); if (bank.some((c) => c.key === k)) placeChip(seg.blankId, k); }}
                onClick={() => (selectedDragItem ? placeChip(seg.blankId, selectedDragItem) : chip ? clearBlank(seg.blankId) : undefined)}
                className={`mx-1 inline-flex min-w-[6rem] cursor-pointer items-center justify-center rounded-lg border-2 px-3 py-1 align-middle text-base font-bold transition-all ${
                  chip
                    ? 'border-solid shadow-sm'
                    : selectedDragItem
                    ? 'border-dashed border-aubergine-400 bg-aubergine-50/70 dark:bg-aubergine-900/10'
                    : 'border-dashed border-input bg-muted/50'
                }`}>
                {chip ? <span key={key} className={`animate-in zoom-in-75 -mx-1 rounded px-1 duration-200 ${chipColor(key)}`}>{chip.label}</span> : ' '}
              </button>
            );
          })}
        </div>
        <div className="rounded-sm border border-border bg-muted/36 p-4">
          <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">Word bank — drag from here</p>
          {allPlaced ? (
            <p className="animate-in zoom-in-95 flex items-center gap-1.5 text-sm font-bold text-emerald-600 duration-300">✓ All blanks filled — you can tap a blank to change it.</p>
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
          aria-label="Your answer"
          value={answers[q.id]?.answerText ?? ''}
          onChange={(e) => setAnswer(q.id, { answerText: e.target.value })}
          className="w-full max-w-md rounded-lg border border-border bg-card px-4 py-3 text-sm">
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
        <div className="space-y-2" role="group" aria-label="Answer choices">
          <p className="text-sm text-muted-foreground">{(q.multipleSelection ?? q.partialCredit) ? 'Select all answers that apply.' : 'Select one answer.'}</p>
          {(q.options as any[]).map((opt, i) => {
            const val = String(typeof opt === 'object' ? opt.value ?? opt.text ?? i : opt);
            const multi = q.multipleSelection ?? q.partialCredit;
            const selected = multi ? selectedChoices(q.id).includes(val) : answers[q.id]?.answerText === val;
            return (
              <button key={i} type="button"
                aria-pressed={selected}
                onClick={() => multi
                  ? setAnswer(q.id, { selectedOptions: selected ? selectedChoices(q.id).filter((v) => v !== val) : [...selectedChoices(q.id), val] })
                  : setAnswer(q.id, { answerText: val })}
                className={`flex min-h-11 w-full items-center gap-3 text-left px-4 py-3 rounded-lg border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? 'border-aubergine-500 bg-aubergine-50 dark:bg-aubergine-900/20' : 'border-border hover:border-input'}`}>
                <span aria-hidden="true" className={`flex size-6 shrink-0 items-center justify-center rounded border text-xs font-semibold ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>{selected ? '✓' : String.fromCharCode(65 + i)}</span>
                <MathText className="text-sm font-medium text-foreground">{String(typeof opt === 'object' ? opt.text ?? opt.value : opt)}</MathText>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <textarea
        aria-label="Your answer"
        className="w-full min-h-[140px] rounded-lg border border-border bg-card p-3 text-sm"
        placeholder="Type your answer…"
        value={answers[q?.id]?.answerText || ''}
        onChange={(e) => setAnswer(q.id, { answerText: e.target.value })}
      />
    );
  };

  return <ExamPaper
    title={examTitle} theme={examSettings.questionTheme}
    status={saveError ? 'Changes not saved' : saving ? 'Saving…' : dirty.current.size ? 'Unsaved changes' : savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : 'Not saved yet'}
    remaining={timerArmed.current ? remaining : null}
    questions={questions.map(question => ({ id: question.id, points: question.points, answered: answerIsComplete(question, answers[question.id]), flagged: !!answers[question.id]?.flaggedForReview }))}
    index={idx} prompt={<MathText>{q.text}</MathText>} passage={q.passageText ? <MathText>{q.passageText}</MathText> : undefined} imageUrl={q.imageUrl}
    onNavigate={goTo} onFlag={() => setAnswer(q.id, { flaggedForReview: !answers[q.id]?.flaggedForReview })}
    onSubmit={() => void handleSubmit(false)} busy={saving || submitting} answerDisabled={submitting || (timerArmed.current && remaining === 0)}
    tools={<><Button variant="outline" size="sm" disabled={saving || submitting} onClick={() => save('AUTOSAVE')} aria-label="Save answers"><Save className="h-4 w-4 mr-1" />Save</Button>{canPause && <Button variant="outline" size="sm" disabled={saving || submitting} onClick={handlePause} aria-label="Pause exam"><Pause className="h-4 w-4 mr-1" />Pause</Button>}</>}
    notices={<>
      {saveError && <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-card p-4 text-sm"><p>{saveError}</p><p className="mt-1 text-muted-foreground">Keep this page open so you can retry without losing your answers.</p><Button variant="outline" className="mt-3" disabled={saving || submitting} onClick={() => timerArmed.current && remaining === 0 ? void handleSubmit(true) : void save('AUTOSAVE')}>Retry</Button></div>}
      {examSettings.lockdownBrowser && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
          <div><span className="font-bold">Integrity monitoring active.</span> Focus, fullscreen, clipboard, print, and restricted shortcut events may be recorded. {securityWarnings > 0 && <span className="ml-1 font-bold">Warnings: {securityWarnings}</span>}</div>
          {examSettings.antiCheat?.requireFullscreen && !document.fullscreenElement && <Button size="sm" variant="outline" onClick={enterFullscreen}>Enter fullscreen</Button>}
        </div>
      )}

    </>}
  >
    {['ESSAY', 'SHORT_ANSWER', 'EXTENDED', 'WRITTEN'].includes(q.type) && <p className="mb-4 text-sm" style={{ color: 'var(--ep-muted)' }}>Write your response below.</p>}
    {q.type === 'DROPDOWN' && <p className="mb-4 text-sm" style={{ color: 'var(--ep-muted)' }}>Choose an answer from the list.</p>}
    {renderAnswerInput()}
  </ExamPaper>;
}
