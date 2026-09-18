/**
 * Guided Studio — a ground-up redesign of the exam authoring experience.
 *
 * A three-pane builder (setup rail · focus editor · live student preview) that
 * lets a teacher build, schedule and configure grading for an exam while
 * trying student answer controls without creating an attempt. Wired to the existing `/api/exams`
 * endpoints (load: GET /api/exams/:id, save: PUT /api/exams/:id) and the AI
 * assistant (POST /api/ai/chat) for "Generate similar".
 *
 * References and verification: docs/exams/AUDIT-DESIGN.md.
 */
import { useEffect, useMemo, useRef, useState, useId, Children, cloneElement, isValidElement } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  ArrowLeft, ArrowUp, ArrowDown, Copy, Check, ChevronDown, GripVertical, Loader2, Plus, Sparkles, Trash2, X,
  FileText, ListChecks, CalendarClock, Award, Play,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import './guided-studio.css';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MathField from '../../components/MathField';
import MathText from '../../components/MathText';
import QuestionImageField from '../../components/QuestionImageField';

/* ------------------------------------------------------------------ */
/* Types & config                                                      */
/* ------------------------------------------------------------------ */

import { fromBackend, toBackend, questionIssue, type Question, type UIType, type StepKey, type Opt } from './studioModel';

type Audience = 'GED' | 'K12_ELEMENTARY' | 'K12_MIDDLE' | 'K12_HIGH';
type QuestionTheme = 'classic' | 'ged' | 'colorful' | 'focus';

interface Accom {
  id: string;
  /** persisted ExamAccommodation row id, when it exists in the DB */
  accId?: string;
  studentId: string;
  name: string;
  initials: string;
  multiplier: number;
  readAloud: boolean;
  breaks: boolean;
  note: string;
}

/** release-mode mapping between the UI and the ExamResultPolicy model */
const RELEASE_TO_MODE: Record<'immediately' | 'approve' | 'closed' | 'hidden', string> = {
  immediately: 'IMMEDIATE', approve: 'AFTER_GRADING', closed: 'SCHEDULED', hidden: 'HIDDEN',
};
function modeToRelease(mode?: string): 'immediately' | 'approve' | 'closed' | 'hidden' {
  if (mode === 'IMMEDIATE') return 'immediately';
  if (mode === 'AFTER_GRADING') return 'approve';
  return mode === 'HIDDEN' ? 'hidden' : 'closed';
}
const UNLIMITED_ATTEMPTS = 9999;

interface TypeDef { key: UIType; label: string; color: string; ged?: boolean; objective: boolean }

const TYPES: TypeDef[] = [
  { key: 'MCQ', label: 'Multiple choice', color: '#168c83', objective: true },
  { key: 'TF', label: 'True/False', color: '#3b89ff', objective: true },
  { key: 'SHORT', label: 'Short answer', color: '#4e91bd', objective: false },
  { key: 'ESSAY', label: 'Essay', color: '#ed52cb', objective: false },
  { key: 'DRAG', label: 'Fill in the blanks', color: '#168c83', ged: true, objective: true },
  { key: 'DROPDOWN', label: 'Drop-down', color: '#146ef5', ged: true, objective: true },
  { key: 'HOTSPOT', label: 'Multi-select', color: '#ff6b00', ged: true, objective: true },
  { key: 'EXTENDED', label: 'Extended response', color: '#4e91bd', ged: true, objective: false },
];
const typeDef = (t: UIType) => TYPES.find((x) => x.key === t)!;
const isObjective = (t: UIType) => typeDef(t).objective;
// Per the design: single-select for MCQ / True-False / Drop-down; multi-select
// for Drag & Hot spot. HOTSPOT stores all correct regions via correctAnswers +
// partialCredit (see toBackend), so multiple may be marked.
const singleCorrect = (t: UIType) => t === 'MCQ' || t === 'TF' || t === 'DROPDOWN';

const C = {
  purple: '#14736d', purpleText: 'var(--gs-purple-text)', purpleDeep: '#155c58',
  tint50: 'var(--gs-tint-50)', tint100: 'var(--gs-tint-100)', tint7: 'var(--gs-tint-7)', tintBar: 'var(--gs-tint-bar)',
  ink: 'var(--gs-ink)', muted: 'var(--gs-muted)', muted2: 'var(--gs-muted-2)',
  border: 'var(--gs-border)', border2: 'var(--gs-border-2)', border3: 'var(--gs-border-3)',
  canvas: 'var(--gs-canvas)', panel: 'var(--gs-panel)', surface: 'var(--gs-surface)', preview: 'var(--gs-preview)', action: 'var(--gs-action)',
  green: '#168c83', greenText: 'var(--gs-green-text)', greenBg: 'var(--gs-green-bg)',
  amber: '#c88a00', amberText: 'var(--gs-amber-text)', amberBg: 'var(--gs-amber-bg)',
  blue: '#146ef5', blueBg: 'var(--gs-blue-bg)',
};

/* ------------------------------------------------------------------ */
/* Storage mapping — design UI types <-> backend QuestionType enum     */
/* ------------------------------------------------------------------ */

/** sensible default options when switching a question's type */
function defaultOptions(t: UIType): Opt[] {
  switch (t) {
    case 'MCQ': return [{ t: '', c: true }, { t: '', c: false }, { t: '', c: false }, { t: '', c: false }];
    case 'TF': return [{ t: 'True', c: true }, { t: 'False', c: false }];
    case 'DROPDOWN': return [{ t: '', c: true }, { t: '', c: false }, { t: '', c: false }];
    case 'HOTSPOT': return [{ t: '', c: true }, { t: '', c: false }, { t: '', c: false }];
    case 'DRAG': return [{ t: '', c: true }, { t: '', c: true }];
    default: return [];
  }
}

const initials = (name: string) => name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const hasMath = (s?: string) => !!s && s.includes('$');

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function GuidedStudio() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadVersion, setLoadVersion] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const originalSettings = useRef<Record<string, any>>({});
  const originalPolicy = useRef<Record<string, any>>({});
  const [releaseAt, setReleaseAt] = useState('');
  const [dirty, setDirty] = useState(false);
  const saveLock = useRef(false);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  // exam
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState<'QUIZ' | 'MIDTERM' | 'FINAL' | 'MOCK'>('FINAL');
  const [duration, setDuration] = useState(60);
  const [instructions, setInstructions] = useState('');
  const [audience, setAudience] = useState<Audience>('GED');
  const [questionTheme, setQuestionTheme] = useState<QuestionTheme>('ged');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ACTIVE' | 'SCHEDULED' | 'ARCHIVED'>('DRAFT');
  const [hasAttempts, setHasAttempts] = useState(false);

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([]);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [sel, setSel] = useState(0);

  // schedule
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [attempts, setAttempts] = useState<number>(1); // 0 = unlimited
  const [shuffle, setShuffle] = useState(false);
  const [lockdown, setLockdown] = useState(false);
  const [requireFullscreen, setRequireFullscreen] = useState(false);
  const [blockClipboard, setBlockClipboard] = useState(false);
  const [warnOnFocusLoss, setWarnOnFocusLoss] = useState(true);
  const [honorAccom, setHonorAccom] = useState(false);
  const [accom, setAccom] = useState<Accom[]>([]);
  const [accomOpen, setAccomOpen] = useState(true);

  // grading
  const [passMark, setPassMark] = useState(65);
  const [release, setRelease] = useState<'immediately' | 'approve' | 'closed' | 'hidden'>('approve');
  const [showAnswers, setShowAnswers] = useState(false);

  // ui
  const [step, setStep] = useState<StepKey>('questions');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'phone'>('desktop');
  const [showMathTools, setShowMathTools] = useState(false);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [published, setPublished] = useState(false);

  const editSnapshot = JSON.stringify({ title, classId, subjectId, examType, duration, instructions, audience, questionTheme, questions, opensAt, closesAt, attempts, shuffle, lockdown, requireFullscreen, blockClipboard, warnOnFocusLoss, honorAccom, accom, passMark, release, releaseAt, showAnswers });
  const savedSnapshot = useRef<string | null>(null);
  useEffect(() => {
    if (loading || loadError) return;
    if (savedSnapshot.current === null) savedSnapshot.current = editSnapshot;
    setDirty(editSnapshot !== savedSnapshot.current);
  }, [editSnapshot, loading, loadError]);

  const leaveStudio = (path: string) => { if (!dirty || window.confirm('Leave Studio with unsaved changes?')) navigate(path); };

  const className = classes.find((c) => c.id === classId)?.name ?? '';
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';
  const isMathSubject = /math/i.test(subjectName);

  /* ---------------- load ---------------- */
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setLoadError('');
    savedSnapshot.current = null;
    // Phase-2 tables may not be migrated in every environment; those reads are
    // best-effort and fall back to the settings JSON on the base exam.
    Promise.all([
      apiGet<any>(`/api/exams/${id}`),
      apiGet<any>(`/api/exams/${id}/result-policy`),
      apiGet<any[]>(`/api/accommodations?examId=${id}`),
      apiGet<any[]>('/api/classes'),
      apiGet<any[]>('/api/subjects'),
    ]).then(([exam, policy, accoms, classRows, subjectRows]) => {
      if (!active) return;
      setClasses(classRows.map(c => ({ id: c.id, name: c.name })));
      setSubjects(subjectRows.map(s => ({ id: s.id, name: s.name })));
      originalSettings.current = exam.settings || {};
      originalPolicy.current = policy || {};
      setReleaseAt(policy?.releaseAt ? toLocalInput(policy.releaseAt) : '');
      setPassMark(65); setRelease('approve'); setShowAnswers(false);
      setTitle(exam.title || '');
      setClassId(exam.classId || '');
      setSubjectId(exam.subjectId || '');
      setExamType((['QUIZ', 'MIDTERM', 'FINAL', 'MOCK'].includes(exam.type) ? exam.type : 'FINAL') as typeof examType);
      setDuration(Number(exam.durationMinutes) || 60);
      setStatus((exam.status as any) || 'DRAFT');
      setHasAttempts(Boolean(exam.attempts?.length));
      const s = exam.settings || {};
      setInstructions(s.instructions || '');
      setAudience((['GED', 'K12_ELEMENTARY', 'K12_MIDDLE', 'K12_HIGH'].includes(s.audience) ? s.audience : 'GED') as Audience);
      setQuestionTheme((['classic', 'ged', 'colorful', 'focus'].includes(s.questionTheme) ? s.questionTheme : 'ged') as QuestionTheme);

      // Availability window — real columns first, settings JSON as fallback.
      const from = exam.availableFrom || s.startDate;
      const until = exam.availableUntil || s.endDate;
      setOpensAt(from ? toLocalInput(from) : '');
      setClosesAt(until ? toLocalInput(until) : '');

      // Attempts — column first (9999 sentinel = unlimited).
      const lim = exam.attemptLimit != null ? Number(exam.attemptLimit) : (s.allowedAttempts ?? 1);
      setAttempts(lim >= UNLIMITED_ATTEMPTS || lim === 0 ? 0 : lim);

      setShuffle(exam.shuffleQuestions != null ? !!exam.shuffleQuestions : !!s.shuffleQuestions);
      setLockdown(!!s.lockdownBrowser);
      setRequireFullscreen(!!s.antiCheat?.requireFullscreen);
      setBlockClipboard(!!s.antiCheat?.blockClipboard);
      setWarnOnFocusLoss(s.antiCheat?.warnOnFocusLoss !== false);

      // Pass mark — exam.passMark is stored in POINTS; convert to a percentage.
      const qs = (exam.questions || []).map(fromBackend);
      const total = qs.reduce((sum: number, q: Question) => sum + (Number(q.points) || 0), 0);
      if (exam.passMark != null && total > 0) setPassMark((Number(exam.passMark) / total) * 100);
      else if (s.passMark != null) setPassMark(Number(s.passMark));

      // Release policy — result-policy model first, settings JSON as fallback.
      if (policy?.releaseMode) { setRelease(modeToRelease(policy.releaseMode)); setShowAnswers(!!policy.showCorrectAnswers); }
      else { if (['immediately', 'approve', 'closed', 'hidden'].includes(s.releaseScores)) setRelease(s.releaseScores); setShowAnswers(!!s.showCorrectAnswers); }


      setHonorAccom(Boolean(accoms?.length) || !!s.honorAccommodations);
      setAccom(Array.isArray(accoms) ? accoms.map((a: any) => { const name = `${a.student?.user?.firstName || ''} ${a.student?.user?.lastName || ''}`.trim() || 'Student'; return { id: `a_${a.id}`, accId: a.id, studentId: a.studentId, name, initials: initials(name), multiplier: 1 + Number(a.extraTimePercent || 0) / 100, readAloud: !!a.readerSupport, breaks: !!a.additionalBreaks, note: a.notes || '' }; }) : []);
      setDirty(false);
      setQuestions(qs);
      setSel(0);
    }).catch((e: any) => {
      if (active) setLoadError(e.message || 'Failed to load exam.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, loadVersion]);

  // roster for accommodations (filtered by class)
  useEffect(() => {
    if (!classId) { setRoster([]); return; }
    let active = true;
    apiGet<any[]>('/api/students').then((rows) => {
      if (!active) return;
      setRoster(rows.filter((r) => r.classId === classId).map((r) => ({ id: r.id, name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || 'Student' })));
    }).catch(() => { if (active) { setRoster([]); toast.error('Could not load students for accommodations.'); } });
    return () => { active = false; };
  }, [classId]);

  /* ---------------- derived ---------------- */
  const totalPoints = useMemo(() => questions.reduce((s, q) => s + (Number(q.points) || 0), 0), [questions]);
  const autoPoints = useMemo(() => questions.filter((q) => isObjective(q.uiType)).reduce((s, q) => s + (Number(q.points) || 0), 0), [questions]);
  const manualPoints = totalPoints - autoPoints;
  const passPoints = Math.round((passMark / 100) * totalPoints * 100) / 100;
  const estMinutes = duration || Math.max(5, questions.length * 2);

  const windowInfo = useMemo(() => {
    if (!opensAt || !closesAt) return null;
    const o = new Date(opensAt), c = new Date(closesAt);
    const mins = Math.round((c.getTime() - o.getTime()) / 60000);
    let warning = '';
    if (mins <= 0) warning = 'Close time is before (or equal to) open time.';
    else if (mins < duration) warning = `Window (${mins} min) is shorter than the ${duration}-min time limit.`;
    return { mins, warning, o, c };
  }, [opensAt, closesAt, duration]);

  const stepsDone: Record<StepKey, boolean> = {
    details: !!(title.trim() && subjectId && classId && duration >= 1),
    questions: questions.length > 0 && questions.every(q => !questionIssue(q)),
    schedule: !(windowInfo && windowInfo.mins <= 0) && (release !== 'closed' || !!releaseAt || !!closesAt),
    grading: Number.isFinite(passMark) && passMark >= 0 && passMark <= 100,
  };
  const doneCount = Object.values(stepsDone).filter(Boolean).length;
  const readiness = Math.round((doneCount / 4) * 100);

  useEffect(() => { setShowMathTools(hasMath(questions[sel]?.text) || questions[sel]?.options.some((o) => hasMath(o.t))); }, [sel]); // eslint-disable-line

  /* ---------------- question mutations ---------------- */
  const update = (i: number, patch: Partial<Question>) => setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const cur = questions[sel];

  const addQuestion = (t: UIType) => {
    const q: Question = { id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, uiType: t, text: '', points: 5, options: defaultOptions(t), sample: '', explanation: '', passageText: '', imageUrl: null };
    setQuestions((prev) => { const next = [...prev, q]; setSel(next.length - 1); return next; });
    setDirty(true);
    setShowTypePicker(false);
    setStep('questions');
  };
  const removeQuestion = (i: number) => setQuestions((prev) => {
    const next = prev.filter((_, idx) => idx !== i);
    setSel((s) => Math.max(0, Math.min(s > i ? s - 1 : s, next.length - 1)));
    return next;
  });
  const switchType = (t: UIType) => {
    if (!cur || t === cur.uiType) return;
    if (!window.confirm('Change question type? Answer options and the answer key will be reset.')) return;
    update(sel, { original: undefined, uiType: t, origType: undefined, options: defaultOptions(t), sample: isObjective(t) ? '' : cur.sample });
  };
  const setCorrect = (oi: number) => {
    if (!cur) return;
    const single = singleCorrect(cur.uiType);
    update(sel, { options: cur.options.map((o, i) => ({ ...o, c: single ? i === oi : (i === oi ? !o.c : o.c) })) });
  };
  const setOptText = (oi: number, t: string) => cur && update(sel, { options: cur.options.map((o, i) => (i === oi ? { ...o, t } : o)) });
  const addOpt = () => cur && update(sel, { options: [...cur.options, { t: '', c: false }] });
  const delOpt = (oi: number) => { if (!cur || cur.uiType === 'TF' || cur.options.length <= 2) return; update(sel, { options: cur.options.filter((_, i) => i !== oi) }); };

  /* ---------------- drag reorder ---------------- */
  const onDrop = () => {
    if (!drag || hasAttempts || saving) return;
    const { from, over } = drag;
    if (from !== over) {
      setQuestions((prev) => { const next = [...prev]; const [m] = next.splice(from, 1); next.splice(over, 0, m); return next; });
      setSel(over);
    }
    setDrag(null);
  };

  /* ---------------- AI generate ---------------- */
  const [generating, setGenerating] = useState(false);
  const generateSimilar = async () => {
    if (!cur || cur.uiType !== 'MCQ' || !cur.text.trim() || generating) return;
    setGenerating(true);
    try {
      const prompt = `Generate 3 new multiple-choice questions similar in topic and difficulty to this one. Return ONLY a JSON array, each item: {"text": string, "options": [{"t": string, "c": boolean}] } with exactly 4 options and exactly one correct (c:true).\n\nReference question: ${cur.text}\nReference options: ${cur.options.map((o) => o.t).join(' | ')}`;
      const res = await apiSend<{ reply: string }>('/api/ai/chat', 'POST', { prompt, systemInstruction: 'You are an exam item writer. Output valid JSON only, no markdown fences.' });
      const raw = (res?.reply || '').replace(/```json|```/g, '').trim();
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || !arr.length || arr.slice(0, 3).some((v: any) => !v.text?.trim() || !Array.isArray(v.options) || v.options.length !== 4 || v.options.some((o: any) => !String(o.t ?? o.text ?? '').trim()) || v.options.filter((o: any) => o.c === true).length !== 1)) throw new Error('Invalid AI response');
      const gen: Question[] = arr.slice(0, 3).map((v: any) => ({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uiType: 'MCQ' as UIType, text: String(v.text || ''), points: cur.points,
        options: (Array.isArray(v.options) ? v.options : []).slice(0, 4).map((o: any) => ({ t: String(o.t ?? o.text ?? ''), c: !!o.c })),
        sample: '', explanation: '',
      }));
      setQuestions((prev) => [...prev, ...gen]);
      setDirty(true);
      toast.success(`Added ${gen.length} questions. Review their wording and answers before publishing.`);
    } catch {
      toast.error('Could not generate valid questions. Your exam is unchanged; try again.');
    } finally {
      setGenerating(false);
    }
  };

  const applyPreset = (preset: Audience) => {
    setAudience(preset);
    if (preset === 'GED') {
      setExamType('MOCK'); setDuration(45); setQuestionTheme('ged'); setPassMark(65);
      setInstructions('Read each question carefully. Use the passage, image, or data provided before selecting your answer.');
    } else if (preset === 'K12_ELEMENTARY') {
      setExamType('QUIZ'); setDuration(20); setQuestionTheme('colorful'); setPassMark(60); setLockdown(false);
      setInstructions('Take your time, read every question, and choose your best answer.');
    } else if (preset === 'K12_MIDDLE') {
      setExamType('QUIZ'); setDuration(40); setQuestionTheme('classic'); setPassMark(65);
    } else {
      setExamType('FINAL'); setDuration(60); setQuestionTheme('focus'); setPassMark(70);
    }
    toast.success('Exam style applied. You can customize every setting.');
  };

  /* ---------------- save / publish ---------------- */
  const buildSettings = () => ({
    ...originalSettings.current,
    enableTimer: originalSettings.current.enableTimer ?? true, autoSubmit: originalSettings.current.autoSubmit ?? true,
    shuffleQuestions: shuffle, shuffleChoices: originalSettings.current.shuffleChoices ?? false,
    showScoreAfterSubmit: release === 'immediately', showCorrectAnswers: showAnswers,
    startDate: opensAt ? new Date(opensAt).toISOString() : undefined,
    endDate: closesAt ? new Date(closesAt).toISOString() : undefined,
    allowedAttempts: attempts,
    instructions,
    lockdownBrowser: lockdown, honorAccommodations: honorAccom,
    audience, questionTheme,
    antiCheat: { ...originalSettings.current.antiCheat, requireFullscreen, blockClipboard, warnOnFocusLoss },
    accommodations: honorAccom ? accom : [],
    passMark, releaseScores: release,
  });

  /**
   * Persist per-student overrides as ExamAccommodation rows (studentId+examId).
   * We deliberately do NOT create ExamAssignment records: the taking flow treats
   * "any assignments exist" as an allow-list that would lock out the rest of the
   * class, whereas accommodationFor() reads ExamAccommodation directly. Returns
   * the reconciled list (with persisted ids) so state stays in sync for re-saves.
   */
  const reconcileAccommodations = async (): Promise<Accom[]> => {
    if (!id) return accom;
    const existing = await apiGet<any[]>(`/api/accommodations?examId=${id}`);
    const keep = new Set<string>();
    const wanted = honorAccom ? accom.filter((a) => a.studentId) : [];

    const result: Accom[] = [];
    for (const a of wanted) {
      const body = {
        studentId: a.studentId, examId: id,
        extraTimePercent: Math.round((a.multiplier - 1) * 100),
        readerSupport: a.readAloud, additionalBreaks: a.breaks, notes: a.note || null,
      };
      const persistedId = a.accId || existing.find(row => row.studentId === a.studentId)?.id;
      if (persistedId) {
        await apiSend(`/api/accommodations/${persistedId}`, 'PUT', body);
        keep.add(persistedId);
        result.push({ ...a, accId: persistedId });
      } else {
        const row = await apiSend<any>('/api/accommodations', 'POST', body);
        if (row?.id) { keep.add(row.id); result.push({ ...a, accId: row.id }); }
        else result.push(a);
      }
    }
    // Remove rows that are no longer wanted.
    for (const row of existing) {
      if (!keep.has(row.id)) await apiSend(`/api/accommodations/${row.id}`, 'DELETE');
    }
    return result;
  };

  const save = async (nextStatus?: 'DRAFT' | 'PUBLISHED') => {
    if (!id || saveLock.current) return;
    if (!Number.isFinite(passMark) || passMark < 0 || passMark > 100) { toast.error('Pass mark must be between 0 and 100%.'); setStep('grading'); return; }
    if (windowInfo?.mins != null && windowInfo.mins <= 0) { toast.error(windowInfo.warning); setStep('schedule'); return; }
    if (!title.trim()) { toast.error('Please enter an exam title.'); setStep('details'); return; }
    if (!subjectId) { toast.error('Please select a subject.'); setStep('details'); return; }
    if (!classId) { toast.error('Please select a class.'); setStep('details'); return; }
    if (!Number.isFinite(duration) || duration < 1 || !Number.isInteger(duration)) { toast.error('Duration must be at least 1 minute.'); setStep('details'); return; }
    if ((nextStatus || status) === 'PUBLISHED' && questions.length === 0) { toast.error('Add at least one question before publishing.'); setStep('questions'); return; }
    if (release === 'closed' && !releaseAt && !closesAt) { toast.error('Choose a result release time or an exam close time.'); setStep('grading'); return; }
    if ((nextStatus || status) === 'PUBLISHED') {
      const invalid = questions.findIndex(q => questionIssue(q));
      if (invalid !== -1) { toast.error(`Question ${invalid + 1}: ${questionIssue(questions[invalid])}`); setSel(invalid); setStep('questions'); return; }
    }
    saveLock.current = true;
    setSaving(true);
    setSaveMessage('Saving exam…');
    try {
      const publishingDraft = nextStatus === 'PUBLISHED' && status !== 'PUBLISHED';
      const basePayload = {
        title: title.trim(), classId, subjectId, examType,
        duration, totalMarks: totalPoints, settings: buildSettings(),
      };
      // 1) Base exam: title, questions, settings mirror, status.
      await apiSend(`/api/exams/${id}`, 'PUT', {
        ...basePayload,
        // Keep a new exam private until its scheduling and release policy have
        // saved successfully; the final publish transition happens below.
        status: publishingDraft ? 'DRAFT' : (nextStatus || status),
        questions: hasAttempts ? undefined : questions.map(toBackend),
      });

      // 2) Real scheduling/scoring columns the taking flow reads.
      const scheduleSave = apiSend(`/api/exams/${id}/schedule`, 'PUT', {
        availableFrom: opensAt ? new Date(opensAt).toISOString() : null,
        availableUntil: closesAt ? new Date(closesAt).toISOString() : null,
        attemptLimit: attempts === 0 ? UNLIMITED_ATTEMPTS : attempts,
        durationMinutes: duration,
        shuffleQuestions: shuffle,
        passMark: passPoints, // stored in points to match attempt.score
      });
      await scheduleSave;

      // 3) Result-release policy consumed by isResultReleased().
      const policySave = apiSend(`/api/exams/${id}/result-policy`, 'PUT', {
        ...originalPolicy.current,
        releaseMode: RELEASE_TO_MODE[release],
        releaseAt: release === 'closed' && (releaseAt || closesAt) ? new Date(releaseAt || closesAt).toISOString() : null,
        showScore: originalPolicy.current.showScore ?? true,
        showCorrectAnswers: showAnswers,
        showPassFail: originalPolicy.current.showPassFail ?? true,
      });
      await policySave;

      // 4) Per-student accommodations → effective exam duration for those students.
      const reconciled = await reconcileAccommodations();
      setAccom(reconciled);

      // 5) Publish only after the required downstream settings have succeeded.
      // Omitting `questions` here preserves the just-saved question set.
      if (publishingDraft) {
        await apiSend(`/api/exams/${id}`, 'PUT', { ...basePayload, status: 'PUBLISHED' });
      }

      savedSnapshot.current = JSON.stringify({ ...JSON.parse(editSnapshot), accom: reconciled });
      setDirty(false);
      setSaveMessage('All changes saved');
      if (nextStatus) setStatus(nextStatus);
      if (publishingDraft) setPublished(true);
      else toast.success('Saved.');
    } catch (e: any) {
      setSaveMessage('Save incomplete. Some changes may have saved. Retry to finish.');
      toast.error(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  if (loadError) return <div role="alert" className="rounded border p-8"><h1 className="text-xl font-semibold">Could not load Exam Studio</h1><p className="my-3">{loadError}</p><button onClick={() => setLoadVersion(v => v + 1)} className="rounded border px-4 py-2">Retry</button></div>;

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center" style={{ background: C.canvas }}><Loader2 className="h-7 w-7 animate-spin" style={{ color: C.purple }} /></div>;
  }

  /* ================================================================ */
  /* Render                                                            */
  /* ================================================================ */
  return (
    <div className="guided-studio" style={{ background: C.canvas, minHeight: '100vh', padding: '20px 16px', fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
      <div className="gs-shell" style={{ maxWidth: 1600, margin: '0 auto', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, boxShadow: '0 20px 50px -30px rgba(0,0,0,.35)', overflow: 'hidden' }}>

        <div className="gs-breadcrumb"><button onClick={() => leaveStudio(`/exams/${id}`)}><ArrowLeft size={15} /> Exam overview</button><span> / </span><span>Exam Studio</span><span className="gs-save-state" role="status">{saving || saveMessage.startsWith('Save incomplete') ? saveMessage : dirty ? 'Unsaved changes' : saveMessage || 'Ready to edit'}</span></div>
        {/* ---------- Top bar ---------- */}
        <div className="gs-topbar" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 24px', borderBottom: `1px solid ${C.border2}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.purple, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, flexShrink: 0 }}>
            {(title[0] || 'E').toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <input
              aria-label="Exam title" disabled={saving} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled exam"
              style={{ fontSize: 17, fontWeight: 800, color: C.ink, border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
            />
            <div style={{ fontSize: 12, color: C.muted2, marginTop: 1 }}>
              {[className, subjectName].filter(Boolean).join(' · ') || 'Grade · Subject'}
            </div>
          </div>
          <StatusPill status={status} />
          <button disabled={!questions.length} onClick={() => setPlayerOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: C.purpleText, background: C.surface, border: `1.5px solid ${C.tint100}`, borderRadius: 10, padding: '8px 13px', cursor: 'pointer' }}>
            <Play size={13} fill="currentColor" /> Preview as student
          </button>
          <button onClick={() => save(status === 'DRAFT' ? 'DRAFT' : undefined)} disabled={saving}
            style={{ fontSize: 13, fontWeight: 700, color: C.ink, background: C.surface, border: `1px solid ${C.border3}`, borderRadius: 10, padding: '8px 14px', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {status === 'DRAFT' ? 'Save draft' : 'Save changes'}
          </button>
          <button onClick={() => save('PUBLISHED')} disabled={saving}
            style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: C.action, border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>
            {saving ? 'Saving…' : status === 'PUBLISHED' ? 'Save & validate' : 'Publish'}
          </button>
        </div>

        {/* ---------- Readiness ribbon ---------- */}
        <div className="gs-readiness" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 24px', background: C.tintBar, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.purpleText, letterSpacing: '.02em' }}>Exam readiness</span>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: C.tint100, overflow: 'hidden', maxWidth: 420 }}>
            <div style={{ width: `${readiness}%`, height: '100%', background: C.purple, transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.muted }}>{doneCount} of 4 steps</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: C.ink }}>{totalPoints} pts · ~{estMinutes} min</span>
        </div>

        {/* ---------- Body grid ---------- */}
        <div className="gs-workspace" style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr) 300px', minHeight: 560 }}>

          {/* Left rail */}
          <div className="gs-rail" style={{ background: C.panel, borderRight: `1px solid ${C.border2}`, padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <RailLabel>Setup</RailLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
                <StepRow icon={<FileText size={15} />} label="Details" done={stepsDone.details} active={step === 'details'} onClick={() => setStep('details')} />
                <StepRow icon={<ListChecks size={15} />} label={`Questions${questions.length ? ` (${questions.length})` : ''}`} done={stepsDone.questions} active={step === 'questions'} onClick={() => setStep('questions')} />
                <StepRow icon={<CalendarClock size={15} />} label="Schedule" done={stepsDone.schedule} active={step === 'schedule'} onClick={() => setStep('schedule')} />
                <StepRow icon={<Award size={15} />} label="Grading & release" done={stepsDone.grading} active={step === 'grading'} onClick={() => setStep('grading')} />
              </div>
            </div>

            <div className="gs-tools"><button onClick={() => leaveStudio(`/exam2/${id}/author`)}>Question bank & rubrics ↗</button><button onClick={() => leaveStudio(`/exam2/${id}/schedule`)}>Access codes & advanced schedule ↗</button></div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <RailLabel>Outline</RailLabel>
                <span style={{ fontSize: 11, color: C.muted2 }}>{questions.length} q</span>
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8, overflow: 'auto' }}>
                {questions.map((q, i) => {
                  const td = typeDef(q.uiType);
                  const isOver = drag?.over === i && drag.from !== i;
                  return (
                    <div key={q.id} role="button" tabIndex={0} aria-label={`Edit question ${i + 1}`} aria-current={sel === i ? 'true' : undefined} onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSel(i); setStep('questions'); } }} draggable={!hasAttempts}
                      onDragStart={() => !hasAttempts && setDrag({ from: i, over: i })}
                      onDragOver={(e) => { e.preventDefault(); setDrag((d) => (d ? { ...d, over: i } : d)); }}
                      onDrop={onDrop} onDragEnd={() => setDrag(null)}
                      onClick={() => { setSel(i); setStep('questions'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '8px 9px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${sel === i ? C.tint100 : 'transparent'}`,
                        background: sel === i ? C.tint100 : C.surface,
                        boxShadow: sel === i ? 'none' : '0 1px 0 rgba(0,0,0,.02)',
                        borderTop: isOver ? `2px solid ${C.purple}` : undefined,
                        opacity: drag?.from === i ? 0.4 : 1, transition: 'all .12s',
                      }}>
                      <GripVertical size={13} style={{ color: '#c8c8c8', flexShrink: 0 }} />
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: td.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: sel === i ? 700 : 600, color: sel === i ? C.purpleText : C.ink, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {i + 1} · {q.text || td.label}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted2 }}>{q.points}pt</span>
                      <button disabled={hasAttempts || saving} aria-label={`Delete question ${i + 1}`} onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete question ${i + 1}?`)) { removeQuestion(i); setDirty(true); } }} style={{ border: 'none', background: 'transparent', color: '#cdcdcd', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add question + type picker — kept OUTSIDE the scroll list above so
                  the popover is never clipped; it opens upward for the same reason. */}
              <div style={{ position: 'relative', marginTop: 8, flexShrink: 0 }}>
                <button disabled={hasAttempts || saving} onClick={() => setShowTypePicker((v) => !v)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, border: `1.5px dashed ${C.tint100}`, background: C.tint7, color: C.purpleText, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  <Plus size={14} /> Add question
                </button>

              </div>
            </div>
          </div>

          {/* Center editor */}
          <div className="gs-editor" style={{ padding: '26px 32px', overflow: 'auto' }}>
            {hasAttempts && <p className="gs-notice">Students have started this exam. Questions are read-only to protect their answers.</p>}
            <fieldset disabled={saving} style={{ minWidth: 0 }}>
            {step === 'details' && <DetailsStep {...{ title, setTitle, subjectId, setSubjectId, classId, setClassId, examType, setExamType, subjects, classes, duration, setDuration, instructions, setInstructions, audience, questionTheme, setQuestionTheme, applyPreset, hasAttempts, goNext: () => setStep('questions') }} />}
            {step === 'questions' && (
              cur ? (
                <><div className="gs-question-actions"><span>Question {sel + 1} of {questions.length}</span><button disabled={hasAttempts || sel === 0} aria-label="Move question up" onClick={() => { setQuestions(prev => { const next = [...prev]; [next[sel - 1], next[sel]] = [next[sel], next[sel - 1]]; return next; }); setSel(sel - 1); setDirty(true); }}><ArrowUp size={16} /></button><button disabled={hasAttempts || sel === questions.length - 1} aria-label="Move question down" onClick={() => { setQuestions(prev => { const next = [...prev]; [next[sel], next[sel + 1]] = [next[sel + 1], next[sel]]; return next; }); setSel(sel + 1); setDirty(true); }}><ArrowDown size={16} /></button><button disabled={hasAttempts} onClick={() => { setQuestions(prev => [...prev, { ...cur, id: crypto.randomUUID(), options: cur.options.map(o => ({ ...o })) }]); setSel(questions.length); setDirty(true); }}><Copy size={15} /> Duplicate</button></div><fieldset disabled={hasAttempts} style={{ minWidth: 0 }}>
                <QuestionEditor
                  q={cur} index={sel} total={questions.length}
                  isMathSubject={isMathSubject} showMathTools={showMathTools} setShowMathTools={setShowMathTools}
                  switchType={switchType} setCorrect={setCorrect} setOptText={setOptText} addOpt={addOpt} delOpt={delOpt}
                  update={(patch) => update(sel, patch)} generateSimilar={generateSimilar} generating={generating}
                />
                </fieldset></>
              ) : <EmptyEditor onAdd={addQuestion} />
            )}
            {step === 'schedule' && (
              <ScheduleStep {...{ opensAt, setOpensAt, closesAt, setClosesAt, windowInfo, attempts, setAttempts, shuffle, setShuffle, lockdown, setLockdown, requireFullscreen, setRequireFullscreen, blockClipboard, setBlockClipboard, warnOnFocusLoss, setWarnOnFocusLoss, honorAccom, setHonorAccom, accom, setAccom, accomOpen, setAccomOpen, roster, duration, goNext: () => setStep('grading') }} />
            )}
            {step === 'grading' && (
              <GradingStep {...{ totalPoints, autoPoints, manualPoints, passMark, setPassMark, passPoints, release, setRelease, releaseAt, setReleaseAt, showAnswers, setShowAnswers, goPublish: () => save('PUBLISHED') }} />
            )}
            <div className="gs-editor-save"><span>{dirty ? 'Changes are not saved yet.' : 'Your exam is up to date.'}</span><button disabled={saving} onClick={() => save()}>{saving ? 'Saving…' : 'Save this exam'}</button></div>
            </fieldset>
          </div>

          {/* Right live preview */}
          <div className="gs-live-preview" style={{ borderLeft: `1px solid ${C.border2}`, background: C.preview, padding: '18px 18px', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <RailLabel>Live student preview</RailLabel>
              <button onClick={() => setPreviewDevice((d) => (d === 'desktop' ? 'phone' : 'desktop'))} style={{ fontSize: 11, fontWeight: 700, color: C.purpleText, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {previewDevice === 'desktop' ? 'Desktop view' : 'Phone view'}
              </button>
            </div>
            <div style={{ maxWidth: previewDevice === 'phone' ? 230 : '100%', margin: previewDevice === 'phone' ? '0 auto' : undefined }}>
              <PreviewCard q={cur} index={sel} total={questions.length} minutes={estMinutes} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11.5, color: C.muted2, marginTop: 12 }}>Try the answer controls here. Preview answers are not saved.</p>
          </div>
        </div>
      </div>

      <Dialog open={showTypePicker} onOpenChange={setShowTypePicker}><DialogContent className="sm:max-w-xl"><DialogTitle>Add a question</DialogTitle><DialogDescription>Choose how students will respond.</DialogDescription><div className="grid grid-cols-2 gap-2">{TYPES.map(t => <button key={t.key} className="rounded border p-4 text-left hover:bg-muted" onClick={() => addQuestion(t.key)}>{t.label}</button>)}</div></DialogContent></Dialog>
      {/* Player overlay */}
      {playerOpen && <StudentPlayer questions={questions} title={title} minutes={estMinutes} onClose={() => setPlayerOpen(false)} />}

      {/* Publish modal */}
      {published && (
        <PublishModal title={title} className={className} count={questions.length} points={totalPoints}
          onEdit={() => setPublished(false)} onDashboard={() => navigate(`/exams/${id}`)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared building blocks                                        */
/* ------------------------------------------------------------------ */

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RailLabel({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: C.muted }}>{children}</span>;
}

function StatusPill({ status }: { status: string }) {
  const s = status === 'PUBLISHED'
    ? { bg: '#eafaec', fg: '#0a7a1c', label: 'Published' }
    : status === 'CLOSED' ? { bg: '#f1f1f1', fg: '#666', label: 'Closed' }
    : { bg: '#fff6e6', fg: '#b26a00', label: 'Draft' };
  return <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: s.fg, background: s.bg, padding: '5px 10px', borderRadius: 999 }}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>;
}

function StepRow({ icon, label, done, active, onClick }: { icon: React.ReactNode; label: string; done: boolean; active: boolean; onClick: () => void }) {
  return (
    <button aria-current={active ? 'step' : undefined} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: active ? C.tint100 : 'transparent' }}>
      <span style={{
        width: 20, height: 20, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0,
        background: done ? C.green : active ? C.purple : C.surface,
        border: done || active ? 'none' : '2px solid #dcdcdc',
        color: '#fff',
      }}>
        {done ? <Check size={12} strokeWidth={3} /> : active ? <span style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} /> : null}
      </span>
      <span style={{ fontSize: 13, fontWeight: active ? 700 : 600, color: active ? C.purpleText : C.ink }}>{label}</span>
    </button>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', cursor: 'pointer', borderBottom: `1px solid ${C.border2}` }}>
      <span style={{ fontSize: 13.5, color: C.ink, fontWeight: 500 }}>{label}</span>
      <Switch checked={on} onCheckedChange={onChange} />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Question editor                                                     */
/* ------------------------------------------------------------------ */

function QuestionEditor(props: {
  q: Question; index: number; total: number; isMathSubject: boolean;
  showMathTools: boolean; setShowMathTools: (v: boolean) => void;
  switchType: (t: UIType) => void; setCorrect: (i: number) => void; setOptText: (i: number, t: string) => void;
  addOpt: () => void; delOpt: (i: number) => void; update: (p: Partial<Question>) => void;
  generateSimilar: () => void; generating: boolean;
}) {
  const { q, index, total, showMathTools, setShowMathTools, switchType, setCorrect, setOptText, addOpt, delOpt, update, generateSimilar, generating } = props;
  const td = typeDef(q.uiType);
  const optionLike = q.uiType === 'MCQ' || q.uiType === 'TF' || q.uiType === 'DROPDOWN' || q.uiType === 'HOTSPOT';
  const manual = q.uiType === 'SHORT' || q.uiType === 'ESSAY' || q.uiType === 'EXTENDED';

  return (
    <div>
      {questionIssue(q) && <p className="gs-notice" role="status">{questionIssue(q)}</p>}
      <Field label="Question type">
        <select aria-label="Question type" value={q.uiType} onChange={e => switchType(e.target.value as UIType)} style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 6 }}>
          {TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </Field>

      {q.uiType === 'MCQ' && (
        <div style={{ maxWidth: 300, marginBottom: 18 }}>
          <RailLabel>Question standard</RailLabel>
          <Select value={q.origType || 'MCQ'} onValueChange={(origType) => update({ origType: origType === 'MCQ' ? undefined : origType })}>
            <SelectTrigger style={{ marginTop: 7 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MCQ">Standard multiple choice</SelectItem>{q.origType === 'MULTIPLE_CHOICE' && <SelectItem value="MULTIPLE_CHOICE">Multiple choice (legacy)</SelectItem>}
              <SelectItem value="GED_RLA_PASSAGE">GED Reasoning Through Language Arts</SelectItem>
              <SelectItem value="GED_MATH">GED Mathematical Reasoning</SelectItem>
              <SelectItem value="GED_SCIENCE">GED Science</SelectItem>
              <SelectItem value="GED_SOCIAL_STUDIES">GED Social Studies</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* QUESTION label + math toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <RailLabel>Question</RailLabel>
        <button onClick={() => setShowMathTools(!showMathTools)}
          style={{ fontSize: 11.5, fontWeight: 700, color: showMathTools ? '#fff' : C.purpleText, background: showMathTools ? C.purple : C.tint50, border: 'none', borderRadius: 999, padding: '5px 12px', cursor: 'pointer' }}>
          ƒx {showMathTools ? 'Hide math' : 'Math'}
        </button>
      </div>

      <MathField
        value={q.text} onChange={(v) => update({ text: v })} multiline rows={3}
        enabled placeholder="Type the question. Use $…$ for inline math and $$…$$ for a display equation."
        showToolbar={showMathTools}
      />
      <p style={{ fontSize: 11, color: C.muted2, margin: '6px 0 20px' }}>Inline $…$ · display $$…$$</p>

      <div className="gs-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(180px,.7fr)', gap: 14, marginBottom: 20 }}>
        <div>
          <RailLabel>Reading passage or source (optional)</RailLabel>
          <textarea value={q.passageText || ''} onChange={(e) => update({ passageText: e.target.value })} rows={5}
            placeholder="Paste a reading passage, source text, chart description, or scenario. Students see it beside the question."
            style={{ width: '100%', marginTop: 8, border: `1px solid ${C.border3}`, borderRadius: 12, padding: '10px 12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: C.ink, background: C.surface }} />
        </div>
        <div>
          <RailLabel>Question picture (optional)</RailLabel>
          <div style={{ marginTop: 8 }}><QuestionImageField value={q.imageUrl} onChange={(imageUrl) => update({ imageUrl })} /></div>
          <p style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>PNG, JPG, WebP, or GIF · up to 10 MB.</p>
        </div>
      </div>

      {/* type-specific editors */}
      {optionLike && (
        <div>
          <RailLabel>{q.uiType === 'HOTSPOT' ? 'Answers — select every correct option' : 'Options — tap the circle to mark correct'}</RailLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {q.options.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${o.c ? '#bfead0' : C.border3}`, background: o.c ? C.greenBg : C.surface, borderRadius: 10, padding: '6px 10px' }}>
                <button aria-label={`Mark option ${i + 1} correct`} aria-pressed={o.c} onClick={() => setCorrect(i)} title="Mark correct"
                  style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', border: o.c ? 'none' : '1.5px solid #d3d3d3', background: o.c ? C.green : C.surface, color: '#fff' }}>
                  {o.c && <Check size={13} strokeWidth={3} />}
                </button>
                <input readOnly={q.uiType === 'TF'} aria-label={`Option ${i + 1}`} value={o.t} onChange={(e) => setOptText(i, e.target.value)} placeholder={`Option ${i + 1}`}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: C.ink }} />
                <button aria-label={`Remove option ${i + 1}`} onClick={() => delOpt(i)} disabled={q.options.length <= 2} style={{ border: 'none', background: 'transparent', color: '#cdcdcd', cursor: q.options.length <= 2 ? 'not-allowed' : 'pointer', opacity: q.options.length <= 2 ? 0.4 : 1 }}><X size={15} /></button>
              </div>
            ))}
          </div>
          <button disabled={q.uiType === 'TF'} onClick={addOpt} style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: C.purpleText, background: 'transparent', border: `1.5px dashed ${C.tint100}`, borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}>
            <Plus size={13} /> Add option
          </button>
        </div>
      )}

      {q.uiType === 'DRAG' && (
        <div>
          <RailLabel>Word bank — tap the circle to mark words that fill a blank</RailLabel>
          <p style={{ fontSize: 11.5, color: C.muted2, margin: '4px 0 10px' }}>Use <code style={{ background: C.tint50, padding: '1px 5px', borderRadius: 4 }}>___</code> in the question for each blank. Correct words fill blanks in order; the rest become decoys.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {q.options.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${o.c ? '#bfead0' : C.border3}`, background: o.c ? C.greenBg : C.surface, borderRadius: 10, padding: '6px 10px' }}>
                <button aria-label={`Mark option ${i + 1} correct`} aria-pressed={o.c} onClick={() => setCorrect(i)} style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', border: o.c ? 'none' : '1.5px solid #d3d3d3', background: o.c ? C.green : C.surface, color: '#fff' }}>{o.c && <Check size={13} strokeWidth={3} />}</button>
                <input aria-label={`Option ${i + 1}`} value={o.t} onChange={(e) => setOptText(i, e.target.value)} placeholder={`Word ${i + 1}`} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }} />
                <button aria-label={`Remove option ${i + 1}`} onClick={() => delOpt(i)} disabled={q.options.length <= 2} style={{ border: 'none', background: 'transparent', color: '#cdcdcd', cursor: 'pointer', opacity: q.options.length <= 2 ? 0.4 : 1 }}><X size={15} /></button>
              </div>
            ))}
          </div>
          <button onClick={addOpt} style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: C.purpleText, background: 'transparent', border: `1.5px dashed ${C.tint100}`, borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}><Plus size={13} /> Add word</button>
        </div>
      )}

      {manual && (
        <div>
          <RailLabel>Model answer / rubric note</RailLabel>
          <textarea value={q.sample || ''} onChange={(e) => update({ sample: e.target.value })} rows={4}
            placeholder="Guidance for graders (not shown to students)."
            style={{ width: '100%', marginTop: 8, border: `1px solid ${C.border3}`, borderRadius: 12, padding: '10px 12px', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ marginTop: 10, fontSize: 12, color: C.amberText, background: C.amberBg, borderRadius: 8, padding: '8px 12px' }}>Graded manually in the grading queue.</div>
        </div>
      )}

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 26, paddingTop: 18, borderTop: `1px solid ${C.border2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RailLabel>Points</RailLabel>
          <input aria-label="Question points" type="number" min={1} value={q.points} onChange={(e) => update({ points: Math.max(1, Number(e.target.value) || 1) })}
            style={{ width: 70, border: `1px solid ${C.border3}`, borderRadius: 9, padding: '7px 10px', fontSize: 14, outline: 'none' }} />
        </div>
        <button onClick={generateSimilar} disabled={generating || q.uiType !== 'MCQ' || !q.text.trim()}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#fff', background: q.uiType === 'MCQ' ? C.purple : '#9a9a9a', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: q.uiType === 'MCQ' ? 'pointer' : 'not-allowed', opacity: q.uiType === 'MCQ' ? 1 : 0.6 }}
          title={q.uiType === 'MCQ' ? '' : 'Available for MCQ questions'}>
          {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate 3 similar
        </button>
      </div>
    </div>
  );
}

function EmptyEditor({ onAdd }: { onAdd: (type: UIType) => void }) {
  const reduceMotion = useReducedMotion();
  const labels: Record<UIType, [string, string]> = {
    MCQ: ['Multiple choice', 'Choose one correct answer'], TF: ['True or false', 'A quick knowledge check'],
    SHORT: ['Short answer', 'A written response'], ESSAY: ['Essay', 'A longer, graded response'],
    DRAG: ['Fill in the blanks', 'Place words from a word bank'], DROPDOWN: ['Drop-down', 'Choose from a list'],
    HOTSPOT: ['Multiple selection', 'Choose all correct answers'], EXTENDED: ['Extended response', 'Evidence and reasoning'],
  };
  return <motion.div className="gs-empty" initial={reduceMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>
    <ListChecks size={28} style={{ color: C.purpleText }} />
    <h2>Build your first question</h2>
    <p>Start with a question type. Add your prompt and answer key, then try it in the student preview.</p>
    <div className="gs-types">{TYPES.map(t => <button key={t.key} onClick={() => onAdd(t.key)}><Plus size={16} style={{ color: C.purpleText, flexShrink: 0 }} /><span><strong>{labels[t.key][0]}</strong><small>{labels[t.key][1]}</small></span></button>)}</div>
  </motion.div>;
}

/* ------------------------------------------------------------------ */
/* Details step                                                        */
/* ------------------------------------------------------------------ */

function DetailsStep(p: any) {
  const inputStyle: React.CSSProperties = { width: '100%', border: `1px solid ${C.border3}`, borderRadius: 11, padding: '10px 13px', fontSize: 14, outline: 'none' };
  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>Exam details</h2>
      <p style={{ fontSize: 13.5, color: C.muted, margin: '4px 0 22px' }}>The basics students and the gradebook rely on.</p>

      <Field label="Student level & test style">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
          {[
            ['GED', 'GED practice', 'Passage-led, neutral test UI'],
            ['K12_ELEMENTARY', 'K–5', 'Larger, colorful student controls'],
            ['K12_MIDDLE', 'Grades 6–8', 'Balanced classroom assessment'],
            ['K12_HIGH', 'Grades 9–12', 'Focused high-school exam'],
          ].map(([key, label, note]) => (
            <button key={key} type="button" disabled={p.hasAttempts} onClick={() => p.applyPreset(key)} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 11, cursor: 'pointer', border: `1.5px solid ${p.audience === key ? C.purple : C.border3}`, background: p.audience === key ? C.tint50 : C.surface, color: C.ink }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{label}</div>
              <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{note}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Title"><input value={p.title} onChange={(e: any) => p.setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Algebra II — Unit 4 Mock" /></Field>
      <div className="gs-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Subject">
          <Select disabled={p.hasAttempts} value={p.subjectId} onValueChange={p.setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{p.subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Class">
          <Select disabled={p.hasAttempts} value={p.classId} onValueChange={p.setClassId}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{p.classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Exam type">
        <Select disabled={p.hasAttempts} value={p.examType} onValueChange={p.setExamType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="QUIZ">Quiz</SelectItem>
            <SelectItem value="MIDTERM">Midterm</SelectItem>
            <SelectItem value="FINAL">Final</SelectItem>
            <SelectItem value="MOCK">Mock exam</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Time limit (minutes)"><input type="number" min={1} value={p.duration} onChange={(e: any) => p.setDuration(Number(e.target.value))} style={inputStyle} /></Field>
      <Field label="Student question theme">
        <Select value={p.questionTheme} onValueChange={p.setQuestionTheme}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ged">GED neutral</SelectItem><SelectItem value="classic">Classroom classic</SelectItem>
            <SelectItem value="colorful">Colorful K–5</SelectItem><SelectItem value="focus">High-contrast focus</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Instructions"><textarea value={p.instructions} onChange={(e: any) => p.setInstructions(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Shown to students before they begin." /></Field>

      <button onClick={p.goNext} style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#fff', background: C.action, border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }}>Continue to questions →</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const fieldId = useId();
  return (
    <div style={{ marginBottom: 16 }}>
      <div id={fieldId} style={{ marginBottom: 6 }}><RailLabel>{label}</RailLabel></div>
      {Children.map(children, child => isValidElement(child) && typeof child.type === 'string' && ['input', 'textarea', 'select'].includes(child.type) ? cloneElement(child as any, { 'aria-labelledby': fieldId }) : child)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Schedule step                                                       */
/* ------------------------------------------------------------------ */

function ScheduleStep(p: any) {
  const inputStyle: React.CSSProperties = { width: '100%', border: `1px solid ${C.border3}`, borderRadius: 11, padding: '10px 13px', fontSize: 14, outline: 'none' };
  const fmt = (d: Date) => d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>Schedule & access</h2>
      <p style={{ fontSize: 13.5, color: C.muted, margin: '4px 0 22px' }}>When and how students can take the exam.</p>

      <RailLabel>Availability window</RailLabel>
      <div className="gs-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '8px 0 12px' }}>
        <div><div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>Opens</div><input aria-label="Opens" type="datetime-local" value={p.opensAt} onChange={(e: any) => p.setOpensAt(e.target.value)} style={inputStyle} /></div>
        <div><div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>Closes</div><input aria-label="Closes" type="datetime-local" value={p.closesAt} onChange={(e: any) => p.setClosesAt(e.target.value)} style={inputStyle} /></div>
      </div>
      <p style={{ fontSize: 12, color: C.muted }}>Dates are optional and use your local time zone. Leave blank for no opening or closing restriction.</p>
      {p.windowInfo && !p.windowInfo.warning && (
        <div style={{ display: 'inline-block', fontSize: 12.5, fontWeight: 600, color: C.purpleText, background: C.tint50, borderRadius: 999, padding: '6px 13px', marginBottom: 14 }}>
          {fmt(p.windowInfo.o)} → {fmt(p.windowInfo.c)} · {Math.floor(p.windowInfo.mins / 60)}h {p.windowInfo.mins % 60}m window
        </div>
      )}
      {p.windowInfo?.warning && (
        <div style={{ fontSize: 12.5, color: C.amberText, background: C.amberBg, borderRadius: 9, padding: '9px 13px', marginBottom: 14 }}>⚠ {p.windowInfo.warning}</div>
      )}

      <div style={{ margin: '18px 0' }}>
        <RailLabel>Attempts allowed</RailLabel>
        <div style={{ display: 'inline-flex', border: `1px solid ${C.border3}`, borderRadius: 10, overflow: 'hidden', marginTop: 8 }}>
          {[{ v: 1, l: '1' }, { v: 2, l: '2' }, { v: 0, l: 'Unlimited' }].map((o) => (
            <button key={o.v} onClick={() => p.setAttempts(o.v)} style={{ fontSize: 13, fontWeight: 700, padding: '8px 16px', border: 'none', cursor: 'pointer', background: p.attempts === o.v ? C.action : C.surface, color: p.attempts === o.v ? '#fff' : C.ink }}>{o.l}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <Toggle on={p.shuffle} onChange={p.setShuffle} label="Shuffle question order" />

        <Toggle on={p.lockdown} onChange={p.setLockdown} label="Lockdown browser" />
        {p.lockdown && <div style={{ padding: '4px 14px 10px', border: `1px solid ${C.border2}`, borderRadius: 12, background: C.panel }}>
          <Toggle on={p.requireFullscreen} onChange={p.setRequireFullscreen} label="Require fullscreen during the attempt" />
          <Toggle on={p.blockClipboard} onChange={p.setBlockClipboard} label="Block copy, paste, context menu, and print" />
          <Toggle on={p.warnOnFocusLoss} onChange={p.setWarnOnFocusLoss} label="Record tab and window focus changes" />
          <p style={{ fontSize: 11, color: C.muted, margin: '8px 0 2px' }}>Integrity events are visible to teachers. Browser controls deter common actions but cannot guarantee prevention on every device.</p>
        </div>}
        <p style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>Students can pause the timer only when they have an extra-breaks accommodation.</p>
        <Toggle on={p.honorAccom} onChange={p.setHonorAccom} label="Honor accommodations" />
      </div>

      {p.honorAccom && (
        <AccommodationPanel accom={p.accom} setAccom={p.setAccom} open={p.accomOpen} setOpen={p.setAccomOpen} roster={p.roster} duration={p.duration} />
      )}

      <button onClick={p.goNext} style={{ marginTop: 22, fontSize: 13, fontWeight: 700, color: '#fff', background: C.action, border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }}>Continue to grading →</button>
    </div>
  );
}

function AccommodationPanel({ accom, setAccom, open, setOpen, roster, duration }: any) {
  const add = () => {
    const used = new Set(accom.map((a: Accom) => a.studentId));
    const next = roster.find((r: any) => !used.has(r.id));
    if (!next) return;
    const name = next?.name || 'New student';
    setAccom([...accom, { id: `a_${Date.now()}`, studentId: next?.id || '', name, initials: initials(name), multiplier: 1.5, readAloud: false, breaks: false, note: '' }]);
  };
  const upd = (id: string, patch: Partial<Accom>) => setAccom(accom.map((a: Accom) => (a.id === id ? { ...a, ...patch } : a)));
  return (
    <div style={{ marginTop: 14, border: `1px solid ${C.tint100}`, borderRadius: 14, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', background: C.tint7, border: 'none', cursor: 'pointer' }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: C.purpleText }}>Per-student overrides ({accom.length})</span>
        <ChevronDown size={16} style={{ color: C.purpleText, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {accom.map((a: Accom) => (
            <div key={a.id} style={{ border: `1px solid ${C.border2}`, borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 999, background: C.tint100, color: C.purpleText, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{a.initials}</span>
                <select aria-label="Student receiving accommodation" value={a.studentId} onChange={e => { const student = roster.find((r: any) => r.id === e.target.value); if (student) upd(a.id, { studentId: student.id, name: student.name, initials: initials(student.name), accId: undefined }); }} style={{ flex: 1, minWidth: 0 }}>{!roster.some((r: any) => r.id === a.studentId) && <option value={a.studentId}>{a.name}</option>}{roster.filter((r: any) => r.id === a.studentId || !accom.some((other: Accom) => other.studentId === r.id)).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.purpleText, background: C.tint50, borderRadius: 999, padding: '4px 10px' }}>{Math.round(duration * a.multiplier)} min total</span>
                <button aria-label={`Remove accommodation for ${a.name}`} onClick={() => setAccom(accom.filter((x: Accom) => x.id !== a.id))} style={{ border: 'none', background: 'transparent', color: '#cdcdcd', cursor: 'pointer' }}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', border: `1px solid ${C.border3}`, borderRadius: 8, overflow: 'hidden' }}>
                  {[1, 1.25, 1.5, 2].map((m) => (
                    <button key={m} onClick={() => upd(a.id, { multiplier: m })} style={{ fontSize: 12, fontWeight: 700, padding: '5px 10px', border: 'none', cursor: 'pointer', background: a.multiplier === m ? C.purple : C.surface, color: a.multiplier === m ? '#fff' : C.ink }}>{m}×</button>
                  ))}
                </div>
                <ChipToggle on={a.readAloud} onClick={() => upd(a.id, { readAloud: !a.readAloud })} label="Read-aloud" />
                <ChipToggle on={a.breaks} onClick={() => upd(a.id, { breaks: !a.breaks })} label="Extra breaks" />
                <input value={a.note} onChange={(e) => upd(a.id, { note: e.target.value })} placeholder="IEP/504 note" style={{ flex: 1, minWidth: 120, border: `1px solid ${C.border3}`, borderRadius: 8, padding: '5px 10px', fontSize: 12.5, outline: 'none' }} />
              </div>
            </div>
          ))}
          <button disabled={!roster.some((r: any) => !accom.some((a: Accom) => a.studentId === r.id))} onClick={add} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, border: `1.5px dashed ${C.tint100}`, background: C.surface, color: C.purpleText, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Add student override</button>
        </div>
      )}
    </div>
  );
}

function ChipToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} style={{ fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? C.purple : C.border3}`, background: on ? C.tint50 : C.surface, color: on ? C.purpleText : C.muted }}>{label}</button>;
}

/* ------------------------------------------------------------------ */
/* Grading step                                                        */
/* ------------------------------------------------------------------ */

function GradingStep(p: any) {
  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>Grading & results</h2>
      <p style={{ fontSize: 13.5, color: C.muted, margin: '4px 0 22px' }}>How the exam is scored and shared back.</p>

      <div style={{ border: `1px solid ${C.border2}`, borderRadius: 14, padding: 18, marginBottom: 20 }}>
        <RailLabel>Score breakdown</RailLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, margin: '12px 0 18px' }}>
          <StatCard n={p.totalPoints} label="Total points" bg={C.tint7} fg={C.purpleText} />
          <StatCard n={p.autoPoints} label="Auto-graded" bg={C.greenBg} fg={C.greenText} />
          <StatCard n={p.manualPoints} label="Manual grading" bg={C.amberBg} fg={C.amberText} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>Pass mark</div>
            <div style={{ fontSize: 12, color: C.muted }}>Minimum to pass · {p.passPoints} of {p.totalPoints} points</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input aria-label="Pass mark percentage" type="number" min={0} max={100} step="any" value={Number(p.passMark.toFixed(2))} onChange={(e: any) => p.setPassMark(Number(e.target.value))} style={{ width: 64, border: `1px solid ${C.border3}`, borderRadius: 10, padding: '8px 10px', fontSize: 15, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
            <span style={{ fontSize: 14, color: C.muted }}>%</span>
          </div>
        </div>
      </div>

      <RailLabel>Release scores</RailLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, margin: '10px 0 20px' }}>
        {[{ k: 'immediately', l: 'Immediately' }, { k: 'approve', l: 'After grading' }, { k: 'closed', l: 'At a scheduled time' }, { k: 'hidden', l: 'Keep hidden' }].map((o) => {
          const on = p.release === o.k;
          return (
            <button key={o.k} onClick={() => p.setRelease(o.k)} style={{ padding: '14px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 700, border: `1.5px solid ${on ? C.purple : C.border3}`, background: on ? C.tint50 : C.surface, color: on ? C.purpleText : C.ink }}>{o.l}</button>
          );
        })}
      </div>

      {p.release === 'closed' && <Field label="Release date and time"><input type="datetime-local" value={p.releaseAt} onChange={e => p.setReleaseAt(e.target.value)} /><p>If left blank, results release at the exam close time.</p></Field>}
      <div>

        <Toggle on={p.showAnswers} onChange={p.setShowAnswers} label="Show correct answers after release" />



      </div>

      <button onClick={p.goPublish} style={{ marginTop: 22, fontSize: 13, fontWeight: 700, color: '#fff', background: C.action, border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }}>Publish exam →</button>
    </div>
  );
}

function StatCard({ n, label, bg, fg }: { n: number; label: string; bg: string; fg: string }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '14px 12px' }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: fg }}>{n}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: fg, opacity: 0.9, marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Student-facing rendering (preview card + player share this)         */
/* ------------------------------------------------------------------ */

function renderQuestionText(text: string) {
  return <MathText text={text} />;
}

function PreviewCard({ q, index, total, minutes }: { q?: Question; index: number; total: number; minutes: number }) {
  const [answer, setAnswer] = useState<any>(null);
  useEffect(() => setAnswer(null), [q]);
  if (!q) return <div style={{ padding: 24, textAlign: 'center', color: C.muted2, fontSize: 13 }}>Select or add a question to preview.</div>;
  return (
    <div style={{ borderRadius: 16, background: C.surface, border: `1px solid ${C.border2}`, boxShadow: '0 8px 24px -14px rgba(0,0,0,.25)', overflow: 'hidden' }}>
      <div style={{ height: 5, background: C.purple }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted2 }}>Q{index + 1} / {total}</span>
          <span style={{ fontSize: 11, color: C.muted2 }}>◷ {String(minutes).padStart(2, '0')}:00</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 14, lineHeight: 1.4 }}>{renderQuestionText(q.text || 'Your question text appears here.')}</div>
        {q.passageText && <div style={{ fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap', color: C.muted, background: C.panel, border: `1px solid ${C.border2}`, borderRadius: 10, padding: 10, marginBottom: 12 }}>{q.passageText}</div>}
        {q.imageUrl && <img src={q.imageUrl} alt="Question illustration" style={{ display: 'block', maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 10, marginBottom: 12, border: `1px solid ${C.border2}` }} />}
        <StudentInput key={q.id} q={q} value={answer} onChange={setAnswer} small />
      </div>
    </div>
  );
}

/** The interactive answer control for one question (used in the player). */
function StudentInput({ q, value, onChange, small }: { q: Question; value: any; onChange: (v: any) => void; small?: boolean }) {
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const optPad = small ? '9px 12px' : '15px 18px';
  const fs = small ? 13.5 : 16;

  if (q.uiType === 'DROPDOWN') {
    return (
      <select aria-label="Preview answer" value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', border: `1px solid ${C.border3}`, borderRadius: 10, padding: optPad, fontSize: fs, outline: 'none' }}>
        <option value="">Select…</option>
        {q.options.map((o, i) => <option key={i} value={i}>{o.t}</option>)}
      </select>
    );
  }
  if (q.uiType === 'SHORT' || q.uiType === 'ESSAY' || q.uiType === 'EXTENDED') {
    return <textarea aria-label="Preview answer" value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={q.uiType === 'SHORT' ? 2 : 5} placeholder="Type your answer…" style={{ width: '100%', border: `1px solid ${C.border3}`, borderRadius: 12, padding: optPad, fontSize: fs, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />;
  }
  if (q.uiType === 'DRAG') {
    const parts = (q.text || '').split(/_{2,}/);
    const matches: Record<number, number> = value || {};
    const place = (blank: number, word: number) => {
      if (!q.options[word]) return;
      const next = Object.fromEntries(Object.entries(matches).filter(([, v]) => v !== word));
      onChange({ ...next, [blank]: word }); setSelectedWord(null);
    };
    return <div><p style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>Drag a word to a blank, or select a word then a blank. Select a filled blank to clear it.</p>
      <div style={{ lineHeight: 2.6 }}>{parts.map((part, i) => <span key={i}>{part}{i < parts.length - 1 && <button aria-label={`Blank ${i + 1}`} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const word = e.dataTransfer.getData('text/plain'); if (word !== '') place(i, Number(word)); }} onClick={() => { if (selectedWord !== null) place(i, selectedWord); else { const next = { ...matches }; delete next[i]; onChange(next); } }} style={{ minWidth: 70, border: `1px dashed ${C.purple}`, margin: '0 4px', padding: '0 8px', borderRadius: 4 }}>{q.options[matches[i]]?.t || '…'}</button>}</span>)}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>{q.options.map((o, i) => <button key={i} disabled={Object.values(matches).includes(i)} draggable onDragStart={e => e.dataTransfer.setData('text/plain', String(i))} aria-pressed={selectedWord === i} onClick={() => setSelectedWord(selectedWord === i ? null : i)} style={{ padding: '6px 10px', border: `1px solid ${selectedWord === i ? C.purple : C.border}`, background: C.tint50, color: C.purpleText }}>{o.t || `Word ${i + 1}`}</button>)}</div>
    </div>;
  }
  // MCQ / TF as big option buttons
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: small ? 8 : 12 }}>
      {q.options.map((o, i) => {
        const on = q.uiType === 'HOTSPOT' ? Array.isArray(value) && value.includes(i) : value === i;
        return (
          <button key={i} aria-pressed={on} onClick={() => onChange(q.uiType === 'HOTSPOT' ? (on ? value.filter((v: number) => v !== i) : [...(Array.isArray(value) ? value : []), i]) : i)} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: optPad, borderRadius: 12, cursor: 'pointer', border: `2px solid ${on ? C.purple : C.border3}`, background: on ? C.tint50 : C.surface, fontSize: fs, color: C.ink, transition: 'all .15s' }}>
            {!small && <span style={{ width: 26, height: 26, borderRadius: 999, border: `1px solid ${on ? C.purple : '#d3d3d3'}`, color: on ? C.purpleText : C.muted, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{String.fromCharCode(65 + i)}</span>}
            <span style={{ flex: 1 }}><MathText text={o.t || `Option ${String.fromCharCode(65 + i)}`} /></span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Focus student player overlay                                        */
/* ------------------------------------------------------------------ */

function StudentPlayer({ questions, title, minutes, onClose }: { questions: Question[]; title: string; minutes: number; onClose: () => void }) {
  const [pIdx, setPIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [remaining, setRemaining] = useState(minutes * 60);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, []);

  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  const q = questions[pIdx];
  const total = questions.length;
  const frac = minutes > 0 ? remaining / (minutes * 60) : 1;
  const mm = Math.floor(remaining / 60), ss = remaining % 60;

  if (!q) {
    return (
      <dialog ref={dialogRef} onCancel={onClose} aria-label="Student preview" className="guided-studio" style={{ ...overlayStyle, margin: 0, maxWidth: 'none', maxHeight: 'none', width: '100vw', height: '100dvh', border: 0 }}>
        <div style={{ background: C.surface, borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: C.muted }}>No questions to preview yet.</p>
          <button onClick={onClose} style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: '#fff', background: C.action, border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>Close</button>
        </div>
      </dialog>
    );
  }

  return (
    <dialog ref={dialogRef} onCancel={onClose} aria-label="Student preview" className="guided-studio" style={{ ...overlayStyle, margin: 0, maxWidth: 'none', maxHeight: 'none', width: '100vw', height: '100dvh', border: 0 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{title || 'Untitled exam'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: C.green }} /> Preview only · answers are not saved
          </div>
        </div>
        <TimerRing frac={frac} mm={mm} />
        <button aria-label="Close preview" onClick={onClose} style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.border3}`, background: C.surface, color: C.ink, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={17} /></button>
      </div>

      {/* progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 24px 0' }}>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          {questions.map((_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= pIdx ? C.purple : '#dcdcdc' }} />)}
        </div>
        <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>Question {pIdx + 1} of {total}</span>
      </div>

      {/* question */}
      <div style={{ flex: 1, overflow: 'auto', display: 'grid', placeItems: 'start center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.ink, lineHeight: 1.35, marginBottom: 26 }}>{renderQuestionText(q.text || 'Question text')}</h2>
          {q.passageText && <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, background: C.panel, border: `1px solid ${C.border2}`, borderRadius: 14, padding: 18, marginBottom: 20, color: C.ink }}>{q.passageText}</div>}
          {q.imageUrl && <img src={q.imageUrl} alt="Question illustration" style={{ display: 'block', maxWidth: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 12, marginBottom: 20 }} />}
          <StudentInput key={q.id} q={q} value={answers[pIdx] ?? null} onChange={(v) => setAnswers((a) => ({ ...a, [pIdx]: v }))} />
        </div>
      </div>

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: `1px solid ${C.border2}` }}>
        <button onClick={() => setPIdx((i) => Math.max(0, i - 1))} disabled={pIdx === 0} style={{ fontSize: 13, fontWeight: 700, color: C.ink, background: C.surface, border: `1px solid ${C.border3}`, borderRadius: 10, padding: '9px 16px', cursor: pIdx === 0 ? 'not-allowed' : 'pointer', opacity: pIdx === 0 ? 0.4 : 1 }}>← Previous</button>
        {pIdx < total - 1 ? (
          <button onClick={() => setPIdx((i) => i + 1)} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: C.action, border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>Next →</button>
        ) : (
          <button onClick={() => { toast.success('Preview complete. No attempt was submitted.'); onClose(); }} style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: C.green, border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer' }}>Submit exam</button>
        )}
      </div>
    </dialog>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 60, background: C.canvas, color: C.ink, display: 'flex', flexDirection: 'column', fontFamily: 'Inter, ui-sans-serif, system-ui' };

function TimerRing({ frac, mm }: { frac: number; mm: number }) {
  const r = 22, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: 54, height: 54 }}>
      <svg width={54} height={54} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={27} cy={27} r={r} fill="none" stroke="#e6e6e6" strokeWidth={4} />
        <circle cx={27} cy={27} r={r} fill="none" stroke={C.purple} strokeWidth={4} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - frac)} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: C.ink }}>
        <div style={{ textAlign: 'center', lineHeight: 1 }}>{mm}<div style={{ fontSize: 7.5, fontWeight: 700, color: C.muted2 }}>MIN</div></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Publish modal                                                       */
/* ------------------------------------------------------------------ */

function PublishModal({ title, className, count, points, onEdit, onDashboard }: { title: string; className: string; count: number; points: number; onEdit: () => void; onDashboard: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onEdit(); }}><DialogContent className="sm:max-w-md">
    <Check size={32} className="text-academic-teal" />
    <DialogTitle>Exam published</DialogTitle>
    <DialogDescription>{title} is published{className ? ` for ${className}` : ''}. Students can start when its availability window opens. {count} questions · {points} points.</DialogDescription>
    <div className="flex gap-3"><button className="rounded border px-4 py-2" onClick={onEdit}>Back to editing</button><button className="rounded bg-academic-teal px-4 py-2 text-white" onClick={onDashboard}>View dashboard</button></div>
  </DialogContent></Dialog>;
}
