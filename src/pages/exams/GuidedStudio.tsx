/**
 * Guided Studio — a ground-up redesign of the exam authoring experience.
 *
 * A three-pane builder (setup rail · focus editor · live student preview) that
 * lets a teacher build, schedule and configure grading for an exam while
 * previewing exactly what students see. Wired to the existing `/api/exams`
 * endpoints (load: GET /api/exams/:id, save: PUT /api/exams/:id) and the AI
 * assistant (POST /api/ai/chat) for "Generate similar".
 *
 * Design reference: "Exam Builder — Guided Studio" handoff.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Check, ChevronDown, GripVertical, Loader2, Plus, Sparkles, Trash2, X,
  FileText, ListChecks, CalendarClock, Award, Smartphone, Monitor, Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MathField from '../../components/MathField';
import MathText from '../../components/MathText';

/* ------------------------------------------------------------------ */
/* Types & config                                                      */
/* ------------------------------------------------------------------ */

type UIType = 'MCQ' | 'TF' | 'SHORT' | 'ESSAY' | 'DRAG' | 'DROPDOWN' | 'HOTSPOT' | 'EXTENDED';
type StepKey = 'details' | 'questions' | 'schedule' | 'grading';

interface Opt { t: string; c: boolean }
interface Question {
  id: string;
  uiType: UIType;
  /** original backend enum when it can't be reconstructed (e.g. GED_*) */
  origType?: string;
  text: string;
  points: number;
  options: Opt[];
  /** model answer / rubric note for manually-graded types */
  sample?: string;
  explanation?: string;
}

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
const RELEASE_TO_MODE: Record<'immediately' | 'approve' | 'closed', string> = {
  immediately: 'IMMEDIATE', approve: 'AFTER_GRADING', closed: 'SCHEDULED',
};
function modeToRelease(mode?: string): 'immediately' | 'approve' | 'closed' {
  if (mode === 'IMMEDIATE') return 'immediately';
  if (mode === 'AFTER_GRADING') return 'approve';
  return 'closed'; // SCHEDULED | HIDDEN
}
const UNLIMITED_ATTEMPTS = 9999;

interface TypeDef { key: UIType; label: string; color: string; ged?: boolean; objective: boolean }

const TYPES: TypeDef[] = [
  { key: 'MCQ', label: 'MCQ', color: '#7a3dff', objective: true },
  { key: 'TF', label: 'True/False', color: '#3b89ff', objective: true },
  { key: 'SHORT', label: 'Short', color: '#ffae13', objective: false },
  { key: 'ESSAY', label: 'Essay', color: '#ed52cb', objective: false },
  { key: 'DRAG', label: 'Drag', color: '#00d722', ged: true, objective: true },
  { key: 'DROPDOWN', label: 'Drop-down', color: '#146ef5', ged: true, objective: true },
  { key: 'HOTSPOT', label: 'Hot spot', color: '#ff6b00', ged: true, objective: true },
  { key: 'EXTENDED', label: 'Extended', color: '#8f5cff', ged: true, objective: false },
];
const typeDef = (t: UIType) => TYPES.find((x) => x.key === t)!;
const isObjective = (t: UIType) => typeDef(t).objective;
const singleCorrect = (t: UIType) => t === 'MCQ' || t === 'TF' || t === 'DROPDOWN';

const C = {
  purple: '#7a3dff', purpleText: '#6325e6', purpleDeep: '#4f1cb8',
  tint50: '#f5f0ff', tint100: '#f0e9ff', tint7: '#f7f2ff', tintBar: '#faf8ff',
  ink: '#080808', muted: '#6b6b6b', muted2: '#8a8a8a',
  border: '#e4e2dd', border2: '#ececec', border3: '#e6e6e6',
  canvas: '#f4f3f0', panel: '#fcfcfc',
  green: '#00b81d', greenText: '#0a7a1c', greenBg: '#f2fcf3',
  amber: '#c88a00', amberText: '#b26a00', amberBg: '#fff8e8',
  blue: '#146ef5', blueBg: '#eef4ff',
};

/* ------------------------------------------------------------------ */
/* Storage mapping — design UI types <-> backend QuestionType enum     */
/* ------------------------------------------------------------------ */

/** Reconstruct an editor question from a loaded backend question. */
function fromBackend(q: any, index: number): Question {
  const id = q.id || `q_${Date.now()}_${index}`;
  const base: Question = { id, uiType: 'MCQ', text: q.text || '', points: Number(q.points) || 5, options: [], sample: '', explanation: q.explanation || '' };
  const opts = q.options;
  const bt = q.type as string;

  const optsToArr = (arr: string[], correct?: string) =>
    arr.map((t, i) => ({ t, c: String(correct ?? '') === String(i) }));

  if (bt === 'TRUE_FALSE') {
    base.uiType = 'TF';
    base.options = [{ t: 'True', c: q.correctAnswer === '0' }, { t: 'False', c: q.correctAnswer === '1' }];
  } else if (bt === 'SHORT_ANSWER') {
    base.uiType = 'SHORT'; base.sample = q.correctAnswer || '';
  } else if (bt === 'ESSAY') {
    base.uiType = 'ESSAY'; base.sample = q.correctAnswer || '';
  } else if (bt === 'WRITTEN') {
    base.uiType = 'EXTENDED'; base.sample = q.correctAnswer || '';
  } else if (bt === 'DRAG_DROP') {
    base.uiType = 'DRAG';
    // options = { text, blanks:[{id,answer}], distractors }
    const answers: string[] = Array.isArray(opts?.blanks) ? opts.blanks.map((b: any) => b.answer) : [];
    const distractors: string[] = Array.isArray(opts?.distractors) ? opts.distractors : [];
    base.options = [
      ...answers.map((t) => ({ t, c: true })),
      ...distractors.map((t) => ({ t, c: false })),
    ];
    if (typeof opts?.text === 'string' && opts.text) {
      // convert "{{id}}" tokens back to "___"
      base.text = opts.text.replace(/\{\{[^}]+\}\}/g, '___');
    }
  } else if (bt === 'MCQ' || bt?.startsWith('GED_')) {
    if (opts && !Array.isArray(opts) && typeof opts === 'object' && opts.ui) {
      base.uiType = opts.ui === 'DROPDOWN' ? 'DROPDOWN' : 'HOTSPOT';
      const choices: string[] = Array.isArray(opts.choices) ? opts.choices : [];
      const correct: number[] = Array.isArray(opts.correct) ? opts.correct : (q.correctAnswer != null ? [Number(q.correctAnswer)] : []);
      base.options = choices.map((t, i) => ({ t, c: correct.includes(i) }));
    } else {
      base.uiType = 'MCQ';
      if (bt?.startsWith('GED_')) base.origType = bt;
      base.options = optsToArr(Array.isArray(opts) ? opts : [], q.correctAnswer);
    }
  }
  return base;
}

/** Produce the backend save payload for one editor question. */
function toBackend(q: Question) {
  const firstCorrect = q.options.findIndex((o) => o.c);
  const correctIdxs = q.options.map((o, i) => (o.c ? i : -1)).filter((i) => i >= 0);
  switch (q.uiType) {
    case 'TF':
      return { questionText: q.text, type: 'TRUE_FALSE', points: q.points, choices: ['True', 'False'], correctAnswer: String(Math.max(0, firstCorrect)), explanation: q.explanation || null };
    case 'SHORT':
      return { questionText: q.text, type: 'SHORT_ANSWER', points: q.points, choices: null, correctAnswer: q.sample || null, explanation: q.explanation || null };
    case 'ESSAY':
      return { questionText: q.text, type: 'ESSAY', points: q.points, choices: null, correctAnswer: q.sample || null, explanation: q.explanation || null };
    case 'EXTENDED':
      return { questionText: q.text, type: 'WRITTEN', points: q.points, choices: null, correctAnswer: q.sample || null, explanation: q.explanation || null };
    case 'DRAG': {
      // Build "[[word]]" raw text by filling each "___" with the correct words in order.
      const answers = q.options.filter((o) => o.c).map((o) => o.t);
      let i = 0;
      const raw = q.text.replace(/_{2,}|___/g, () => (i < answers.length ? `[[${answers[i++]}]]` : '___'));
      const blanks: { id: string; answer: string }[] = [];
      let bi = 0;
      const text = raw.replace(/\[\[([^\]]+)\]\]/g, (_m, w) => { const id = `b${bi++}`; blanks.push({ id, answer: w }); return `{{${id}}}`; });
      const distractors = q.options.filter((o) => !o.c).map((o) => o.t);
      return { questionText: text, type: 'DRAG_DROP', points: q.points, choices: { text, blanks, distractors }, correctAnswer: null, explanation: q.explanation || null };
    }
    case 'DROPDOWN':
      return { questionText: q.text, type: 'MCQ', points: q.points, choices: { ui: 'DROPDOWN', choices: q.options.map((o) => o.t), correct: correctIdxs }, correctAnswer: String(Math.max(0, firstCorrect)), explanation: q.explanation || null };
    case 'HOTSPOT':
      return { questionText: q.text, type: 'MCQ', points: q.points, choices: { ui: 'HOTSPOT', choices: q.options.map((o) => o.t), correct: correctIdxs }, correctAnswer: null, explanation: q.explanation || null };
    default: // MCQ (and reloaded GED_*)
      return { questionText: q.text, type: q.origType || 'MCQ', points: q.points, choices: q.options.map((o) => o.t), correctAnswer: String(Math.max(0, firstCorrect)), explanation: q.explanation || null };
  }
}

/** sensible default options when switching a question's type */
function defaultOptions(t: UIType): Opt[] {
  switch (t) {
    case 'MCQ': return [{ t: '', c: true }, { t: '', c: false }, { t: '', c: false }, { t: '', c: false }];
    case 'TF': return [{ t: 'True', c: true }, { t: 'False', c: false }];
    case 'DROPDOWN': return [{ t: '', c: true }, { t: '', c: false }, { t: '', c: false }];
    case 'HOTSPOT': return [{ t: 'Region 1', c: true }, { t: 'Region 2', c: false }, { t: 'Region 3', c: false }];
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

  // exam
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState(60);
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'CLOSED'>('DRAFT');
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
  const [allowPause, setAllowPause] = useState(true);
  const [lockdown, setLockdown] = useState(false);
  const [honorAccom, setHonorAccom] = useState(false);
  const [accom, setAccom] = useState<Accom[]>([]);
  const [accomOpen, setAccomOpen] = useState(true);

  // grading
  const [passMark, setPassMark] = useState(65);
  const [release, setRelease] = useState<'immediately' | 'approve' | 'closed'>('approve');
  const [autoGrade, setAutoGrade] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [allowRegrade, setAllowRegrade] = useState(false);
  const [latePenalty, setLatePenalty] = useState(false);
  const [syncGradebook, setSyncGradebook] = useState(true);

  // ui
  const [step, setStep] = useState<StepKey>('questions');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'phone'>('desktop');
  const [showMathTools, setShowMathTools] = useState(false);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [published, setPublished] = useState(false);

  const className = classes.find((c) => c.id === classId)?.name ?? '';
  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? '';
  const isMathSubject = /math/i.test(subjectName);

  /* ---------------- load ---------------- */
  useEffect(() => {
    Promise.all([
      apiGet<any[]>('/api/classes').then((r) => setClasses(r.map((c) => ({ id: c.id, name: c.name })))).catch(() => {}),
      apiGet<any[]>('/api/subjects').then((r) => setSubjects(r.map((s) => ({ id: s.id, name: s.name })))).catch(() => {}),
    ]);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    // Phase-2 tables may not be migrated in every environment; those reads are
    // best-effort and fall back to the settings JSON on the base exam.
    Promise.all([
      apiGet<any>(`/api/exams/${id}`),
      apiGet<any>(`/api/exams/${id}/result-policy`).catch(() => null),
      apiGet<any[]>(`/api/accommodations?examId=${id}`).catch(() => []),
    ]).then(([exam, policy, accoms]) => {
      setTitle(exam.title || '');
      setClassId(exam.classId || '');
      setSubjectId(exam.subjectId || '');
      setDuration(Number(exam.durationMinutes) || 60);
      setStatus((exam.status as any) || 'DRAFT');
      setHasAttempts(Boolean(exam.attempts?.length));
      const s = exam.settings || {};
      setInstructions(s.instructions || '');

      // Availability window — real columns first, settings JSON as fallback.
      const from = exam.availableFrom || s.startDate;
      const until = exam.availableUntil || s.endDate;
      setOpensAt(from ? toLocalInput(from) : '');
      setClosesAt(until ? toLocalInput(until) : '');

      // Attempts — column first (9999 sentinel = unlimited).
      const lim = exam.attemptLimit != null ? Number(exam.attemptLimit) : (s.allowedAttempts ?? 1);
      setAttempts(lim >= 99 || lim === 0 ? 0 : lim);

      setShuffle(exam.shuffleQuestions != null ? !!exam.shuffleQuestions : !!s.shuffleQuestions);
      setAllowPause(s.allowPause !== false);
      setLockdown(!!s.lockdownBrowser);

      // Pass mark — exam.passMark is stored in POINTS; convert to a percentage.
      const qs = (exam.questions || []).map(fromBackend);
      const total = qs.reduce((sum: number, q: Question) => sum + (Number(q.points) || 0), 0);
      if (exam.passMark != null && total > 0) setPassMark(Math.round((Number(exam.passMark) / total) * 100));
      else if (s.passMark != null) setPassMark(Number(s.passMark));

      // Release policy — result-policy model first, settings JSON as fallback.
      if (policy?.releaseMode) { setRelease(modeToRelease(policy.releaseMode)); setShowAnswers(!!policy.showCorrectAnswers); }
      else { if (s.releaseScores) setRelease(s.releaseScores); setShowAnswers(!!s.showCorrectAnswers); }

      setAutoGrade(s.autoGrade !== false);
      setAllowRegrade(!!s.allowRegrade);
      setLatePenalty(!!s.latePenalty);
      setSyncGradebook(s.syncGradebook !== false);

      // Accommodations — rebuild from real ExamAccommodation rows when present.
      if (Array.isArray(accoms) && accoms.length) {
        setHonorAccom(true);
        setAccom(accoms.map((a: any) => {
          const name = `${a.student?.user?.firstName || ''} ${a.student?.user?.lastName || ''}`.trim() || 'Student';
          const mult = a.extraTimePercent ? 1 + Number(a.extraTimePercent) / 100 : 1;
          return { id: `a_${a.id}`, accId: a.id, studentId: a.studentId, name, initials: initials(name), multiplier: mult, readAloud: !!a.readerSupport, breaks: !!a.additionalBreaks, note: a.notes || '' } as Accom;
        }));
      } else {
        setHonorAccom(!!s.honorAccommodations);
        if (Array.isArray(s.accommodations)) setAccom(s.accommodations);
      }

      setQuestions(qs);
      setSel(0);
    }).catch((e: any) => {
      toast.error(e.message || 'Failed to load exam.');
      navigate('/exams');
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  // roster for accommodations (filtered by class)
  useEffect(() => {
    if (!classId) { setRoster([]); return; }
    apiGet<any[]>('/api/students').then((rows) => {
      setRoster(rows.filter((r) => r.classId === classId).map((r) => ({ id: r.id, name: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim() || 'Student' })));
    }).catch(() => setRoster([]));
  }, [classId]);

  /* ---------------- derived ---------------- */
  const totalPoints = useMemo(() => questions.reduce((s, q) => s + (Number(q.points) || 0), 0), [questions]);
  const autoPoints = useMemo(() => questions.filter((q) => isObjective(q.uiType)).reduce((s, q) => s + (Number(q.points) || 0), 0), [questions]);
  const manualPoints = totalPoints - autoPoints;
  const passPoints = Math.round((passMark / 100) * totalPoints);
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
    details: !!(title.trim() && subjectId),
    questions: questions.length > 0,
    schedule: !!(opensAt && closesAt && !windowInfo?.warning),
    grading: passMark > 0,
  };
  const doneCount = Object.values(stepsDone).filter(Boolean).length;
  const readiness = Math.round((doneCount / 4) * 100);

  useEffect(() => { setShowMathTools(hasMath(questions[sel]?.text) || questions[sel]?.options.some((o) => hasMath(o.t))); }, [sel]); // eslint-disable-line

  /* ---------------- question mutations ---------------- */
  const update = (i: number, patch: Partial<Question>) => setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const cur = questions[sel];

  const addQuestion = (t: UIType) => {
    const q: Question = { id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, uiType: t, text: '', points: 5, options: defaultOptions(t), sample: '', explanation: '' };
    setQuestions((prev) => { const next = [...prev, q]; setSel(next.length - 1); return next; });
    setShowTypePicker(false);
    setStep('questions');
  };
  const removeQuestion = (i: number) => setQuestions((prev) => {
    const next = prev.filter((_, idx) => idx !== i);
    setSel((s) => Math.max(0, Math.min(s, next.length - 1)));
    return next;
  });
  const switchType = (t: UIType) => {
    if (!cur) return;
    update(sel, { uiType: t, origType: undefined, options: defaultOptions(t), sample: isObjective(t) ? '' : cur.sample });
  };
  const setCorrect = (oi: number) => {
    if (!cur) return;
    const single = singleCorrect(cur.uiType);
    update(sel, { options: cur.options.map((o, i) => ({ ...o, c: single ? i === oi : (i === oi ? !o.c : o.c) })) });
  };
  const setOptText = (oi: number, t: string) => cur && update(sel, { options: cur.options.map((o, i) => (i === oi ? { ...o, t } : o)) });
  const addOpt = () => cur && update(sel, { options: [...cur.options, { t: '', c: false }] });
  const delOpt = (oi: number) => cur && update(sel, { options: cur.options.filter((_, i) => i !== oi) });

  /* ---------------- drag reorder ---------------- */
  const onDrop = () => {
    if (!drag) return;
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
    if (!cur) return;
    setGenerating(true);
    try {
      const prompt = `Generate 3 new multiple-choice questions similar in topic and difficulty to this one. Return ONLY a JSON array, each item: {"text": string, "options": [{"t": string, "c": boolean}] } with exactly 4 options and exactly one correct (c:true).\n\nReference question: ${cur.text}\nReference options: ${cur.options.map((o) => o.t).join(' | ')}`;
      const res = await apiSend<{ reply: string }>('/api/ai/chat', 'POST', { prompt, systemInstruction: 'You are an exam item writer. Output valid JSON only, no markdown fences.' });
      const raw = (res?.reply || '').replace(/```json|```/g, '').trim();
      const arr = JSON.parse(raw);
      const gen: Question[] = arr.slice(0, 3).map((v: any) => ({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uiType: 'MCQ' as UIType, text: String(v.text || ''), points: cur.points,
        options: (Array.isArray(v.options) ? v.options : []).slice(0, 4).map((o: any) => ({ t: String(o.t ?? o.text ?? ''), c: !!o.c })),
        sample: '', explanation: '',
      }));
      setQuestions((prev) => [...prev, ...gen]);
      toast.success('Added 3 AI-generated variants.');
    } catch {
      // Fallback: local variants so the button always works offline.
      const gen: Question[] = [1, 2, 3].map((n) => ({
        id: `q_${Date.now()}_${n}_${Math.random().toString(36).slice(2, 5)}`,
        uiType: 'MCQ' as UIType, text: `${cur.text || 'New question'} (variant ${n})`, points: cur.points,
        options: [{ t: 'Option A', c: true }, { t: 'Option B', c: false }, { t: 'Option C', c: false }, { t: 'Option D', c: false }],
        sample: '', explanation: '',
      }));
      setQuestions((prev) => [...prev, ...gen]);
      toast.message('AI unavailable — added 3 template variants to edit.');
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------- save / publish ---------------- */
  const buildSettings = () => ({
    enableTimer: true, autoSubmit: true,
    shuffleQuestions: shuffle, shuffleChoices: false,
    showScoreAfterSubmit: release === 'immediately', showCorrectAnswers: showAnswers,
    startDate: opensAt ? new Date(opensAt).toISOString() : undefined,
    endDate: closesAt ? new Date(closesAt).toISOString() : undefined,
    allowedAttempts: attempts,
    instructions,
    allowPause, lockdownBrowser: lockdown, honorAccommodations: honorAccom,
    accommodations: honorAccom ? accom : [],
    passMark, releaseScores: release, autoGrade, allowRegrade, latePenalty, syncGradebook,
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
    const existing = await apiGet<any[]>(`/api/accommodations?examId=${id}`).catch(() => [] as any[]);
    const keep = new Set<string>();
    const wanted = honorAccom ? accom.filter((a) => a.studentId) : [];

    const result: Accom[] = [];
    for (const a of wanted) {
      const body = {
        studentId: a.studentId, examId: id,
        extraTimePercent: Math.round((a.multiplier - 1) * 100),
        readerSupport: a.readAloud, additionalBreaks: a.breaks, notes: a.note || null,
      };
      if (a.accId) {
        await apiSend(`/api/accommodations/${a.accId}`, 'PUT', body).catch(() => {});
        keep.add(a.accId);
        result.push(a);
      } else {
        const row = await apiSend<any>('/api/accommodations', 'POST', body).catch(() => null);
        if (row?.id) { keep.add(row.id); result.push({ ...a, accId: row.id }); }
        else result.push(a);
      }
    }
    // Remove rows that are no longer wanted.
    for (const row of existing) {
      if (!keep.has(row.id)) await apiSend(`/api/accommodations/${row.id}`, 'DELETE').catch(() => {});
    }
    return result;
  };

  const save = async (nextStatus?: 'DRAFT' | 'PUBLISHED') => {
    if (!id) return;
    if (!title.trim()) { toast.error('Please enter an exam title.'); setStep('details'); return; }
    if (!subjectId) { toast.error('Please select a subject.'); setStep('details'); return; }
    if ((nextStatus === 'PUBLISHED') && questions.length === 0) { toast.error('Add at least one question before publishing.'); setStep('questions'); return; }
    setSaving(true);
    let downstreamWarned = false;
    const warn = () => { if (!downstreamWarned) { downstreamWarned = true; toast.message('Saved. Some scheduling/grading settings could not sync (exam system may not be fully migrated).'); } };
    try {
      // 1) Base exam: title, questions, settings mirror, status.
      await apiSend(`/api/exams/${id}`, 'PUT', {
        title: title.trim(), classId, subjectId, examType: 'MOCK',
        status: nextStatus || status,
        duration, totalMarks: totalPoints, settings: buildSettings(),
        questions: hasAttempts ? undefined : questions.map(toBackend),
      });

      // 2) Real scheduling/scoring columns the taking flow reads (best-effort).
      await apiSend(`/api/exams/${id}/schedule`, 'PUT', {
        availableFrom: opensAt ? new Date(opensAt).toISOString() : null,
        availableUntil: closesAt ? new Date(closesAt).toISOString() : null,
        attemptLimit: attempts === 0 ? UNLIMITED_ATTEMPTS : attempts,
        durationMinutes: duration,
        shuffleQuestions: shuffle,
        passMark: passPoints, // stored in points to match attempt.score
      }).catch(warn);

      // 3) Result-release policy consumed by isResultReleased().
      await apiSend(`/api/exams/${id}/result-policy`, 'PUT', {
        releaseMode: RELEASE_TO_MODE[release],
        releaseAt: release === 'closed' && closesAt ? new Date(closesAt).toISOString() : null,
        showScore: release !== 'closed',
        showCorrectAnswers: showAnswers,
        showPassFail: true,
      }).catch(warn);

      // 4) Per-student accommodations → effective exam duration for those students.
      try {
        const reconciled = await reconcileAccommodations();
        setAccom(reconciled);
      } catch { warn(); }

      if (nextStatus) setStatus(nextStatus);
      if (nextStatus === 'PUBLISHED') setPublished(true);
      else if (!downstreamWarned) toast.success('Saved.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center" style={{ background: C.canvas }}><Loader2 className="h-7 w-7 animate-spin" style={{ color: C.purple }} /></div>;
  }

  /* ================================================================ */
  /* Render                                                            */
  /* ================================================================ */
  return (
    <div style={{ background: C.canvas, minHeight: '100vh', padding: '20px 16px', fontFamily: 'Inter, ui-sans-serif, system-ui' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', background: '#fff', border: `1px solid ${C.border}`, borderRadius: 20, boxShadow: '0 20px 50px -30px rgba(0,0,0,.35)', overflow: 'hidden' }}>

        {/* ---------- Top bar ---------- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 24px', borderBottom: `1px solid ${C.border2}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: C.purple, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, flexShrink: 0 }}>
            {(title[0] || 'E').toUpperCase()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Untitled exam"
              style={{ fontSize: 17, fontWeight: 800, color: C.ink, border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
            />
            <div style={{ fontSize: 12, color: C.muted2, marginTop: 1 }}>
              {[className, subjectName].filter(Boolean).join(' · ') || 'Grade · Subject'} · auto-saved
            </div>
          </div>
          <StatusPill status={status} />
          <div style={{ display: 'flex', border: `1px solid ${C.border3}`, borderRadius: 10, overflow: 'hidden' }}>
            <IconToggle active={previewDevice === 'desktop'} onClick={() => setPreviewDevice('desktop')}><Monitor size={15} /></IconToggle>
            <IconToggle active={previewDevice === 'phone'} onClick={() => setPreviewDevice('phone')}><Smartphone size={15} /></IconToggle>
          </div>
          <button onClick={() => setPlayerOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: C.purpleText, background: '#fff', border: `1.5px solid ${C.tint100}`, borderRadius: 10, padding: '8px 13px', cursor: 'pointer' }}>
            <Play size={13} fill="currentColor" /> Preview as student
          </button>
          <button onClick={() => save('PUBLISHED')} disabled={saving}
            style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: C.ink, border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>
            {saving ? '…' : 'Publish'}
          </button>
        </div>

        {/* ---------- Readiness ribbon ---------- */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 24px', background: C.tintBar, borderBottom: '1px solid #efeaff' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.purpleText, letterSpacing: '.02em' }}>Exam readiness</span>
          <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#ece6ff', overflow: 'hidden', maxWidth: 420 }}>
            <div style={{ width: `${readiness}%`, height: '100%', background: 'linear-gradient(90deg,#7a3dff,#a87dff)', transition: 'width .3s' }} />
          </div>
          <span style={{ fontSize: 12, color: C.muted }}>{doneCount} of 4 steps</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: C.ink }}>{totalPoints} pts · ~{estMinutes} min</span>
        </div>

        {/* ---------- Body grid ---------- */}
        <div style={{ display: 'grid', gridTemplateColumns: '248px 1fr 320px', minHeight: 640 }}>

          {/* Left rail */}
          <div style={{ background: C.panel, borderRight: `1px solid ${C.border2}`, padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <RailLabel>Setup</RailLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
                <StepRow icon={<FileText size={15} />} label="Details" done={stepsDone.details} active={step === 'details'} onClick={() => setStep('details')} />
                <StepRow icon={<ListChecks size={15} />} label={`Questions${questions.length ? ` (${questions.length})` : ''}`} done={stepsDone.questions} active={step === 'questions'} onClick={() => setStep('questions')} />
                <StepRow icon={<CalendarClock size={15} />} label="Schedule" done={stepsDone.schedule} active={step === 'schedule'} onClick={() => setStep('schedule')} />
                <StepRow icon={<Award size={15} />} label="Grading & release" done={stepsDone.grading} active={step === 'grading'} onClick={() => setStep('grading')} />
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <RailLabel>Outline</RailLabel>
                <span style={{ fontSize: 11, color: C.muted2 }}>{questions.length} q</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 8, overflow: 'auto' }}>
                {questions.map((q, i) => {
                  const td = typeDef(q.uiType);
                  const isOver = drag?.over === i && drag.from !== i;
                  return (
                    <div key={q.id} draggable
                      onDragStart={() => setDrag({ from: i, over: i })}
                      onDragOver={(e) => { e.preventDefault(); setDrag((d) => (d ? { ...d, over: i } : d)); }}
                      onDrop={onDrop} onDragEnd={() => setDrag(null)}
                      onClick={() => { setSel(i); setStep('questions'); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '8px 9px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${sel === i ? C.tint100 : 'transparent'}`,
                        background: sel === i ? C.tint100 : '#fff',
                        boxShadow: sel === i ? 'none' : '0 1px 0 rgba(0,0,0,.02)',
                        borderTop: isOver ? `2px solid ${C.purple}` : undefined,
                        opacity: drag?.from === i ? 0.4 : 1, transition: 'all .12s',
                      }}>
                      <GripVertical size={13} style={{ color: '#c8c8c8', flexShrink: 0 }} />
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: td.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: sel === i ? 700 : 600, color: sel === i ? C.purpleText : C.ink, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {i + 1} · {td.label}
                      </span>
                      <span style={{ fontSize: 11, color: C.muted2 }}>{q.points}pt</span>
                      <button onClick={(e) => { e.stopPropagation(); removeQuestion(i); }} style={{ border: 'none', background: 'transparent', color: '#cdcdcd', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}

                {/* Add question + type picker */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowTypePicker((v) => !v)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', marginTop: 4, borderRadius: 10, border: `1.5px dashed ${C.tint100}`, background: C.tint7, color: C.purpleText, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <Plus size={14} /> Add question
                  </button>
                  {showTypePicker && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 30, background: '#fff', border: `1px solid ${C.border3}`, borderRadius: 12, boxShadow: '0 24px 50px -18px rgba(0,0,0,.4)', padding: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {TYPES.map((t) => (
                        <button key={t.key} onClick={() => addQuestion(t.key)}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 8px', borderRadius: 8, border: `1px solid ${C.border2}`, background: '#fff', cursor: 'pointer', fontSize: 11.5, fontWeight: 600, color: C.ink, textAlign: 'left' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 999, background: t.color }} />
                          <span style={{ flex: 1 }}>{t.label}</span>
                          {t.ged && <span style={{ fontSize: 8.5, fontWeight: 800, color: C.blue, background: C.blueBg, padding: '1px 4px', borderRadius: 4 }}>GED</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center editor */}
          <div style={{ padding: '26px 32px', overflow: 'auto' }}>
            {step === 'details' && <DetailsStep {...{ title, setTitle, subjectId, setSubjectId, classId, setClassId, subjects, classes, duration, setDuration, instructions, setInstructions, goNext: () => setStep('questions') }} />}
            {step === 'questions' && (
              cur ? (
                <QuestionEditor
                  q={cur} index={sel} total={questions.length}
                  isMathSubject={isMathSubject} showMathTools={showMathTools} setShowMathTools={setShowMathTools}
                  switchType={switchType} setCorrect={setCorrect} setOptText={setOptText} addOpt={addOpt} delOpt={delOpt}
                  update={(patch) => update(sel, patch)} generateSimilar={generateSimilar} generating={generating}
                />
              ) : <EmptyEditor onAdd={() => setShowTypePicker(true)} />
            )}
            {step === 'schedule' && (
              <ScheduleStep {...{ opensAt, setOpensAt, closesAt, setClosesAt, windowInfo, attempts, setAttempts, shuffle, setShuffle, allowPause, setAllowPause, lockdown, setLockdown, honorAccom, setHonorAccom, accom, setAccom, accomOpen, setAccomOpen, roster, duration, goNext: () => setStep('grading') }} />
            )}
            {step === 'grading' && (
              <GradingStep {...{ totalPoints, autoPoints, manualPoints, passMark, setPassMark, passPoints, release, setRelease, autoGrade, setAutoGrade, showAnswers, setShowAnswers, allowRegrade, setAllowRegrade, latePenalty, setLatePenalty, syncGradebook, setSyncGradebook, goPublish: () => save('PUBLISHED') }} />
            )}
          </div>

          {/* Right live preview */}
          <div style={{ borderLeft: `1px solid ${C.border2}`, background: '#fbfbfb', padding: '18px 18px', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <RailLabel>Live student preview</RailLabel>
              <button onClick={() => setPreviewDevice((d) => (d === 'desktop' ? 'phone' : 'desktop'))} style={{ fontSize: 11, fontWeight: 700, color: C.purpleText, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                {previewDevice === 'desktop' ? 'Desktop view' : 'Phone view'}
              </button>
            </div>
            <div style={{ maxWidth: previewDevice === 'phone' ? 230 : '100%', margin: previewDevice === 'phone' ? '0 auto' : undefined }}>
              <PreviewCard q={cur} index={sel} total={questions.length} minutes={estMinutes} />
            </div>
            <p style={{ textAlign: 'center', fontSize: 11.5, color: C.muted2, marginTop: 12 }}>This is exactly what students see.</p>
          </div>
        </div>
      </div>

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
  return <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9a9a9a' }}>{children}</span>;
}

function StatusPill({ status }: { status: string }) {
  const s = status === 'PUBLISHED'
    ? { bg: '#eafaec', fg: '#0a7a1c', label: 'Published' }
    : status === 'CLOSED' ? { bg: '#f1f1f1', fg: '#666', label: 'Closed' }
    : { bg: '#fff6e6', fg: '#b26a00', label: 'Draft' };
  return <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: s.fg, background: s.bg, padding: '5px 10px', borderRadius: 999 }}>{s.label}</span>;
}

function IconToggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ display: 'grid', placeItems: 'center', width: 34, height: 30, border: 'none', cursor: 'pointer', color: active ? C.purpleText : '#a7a7a7', background: active ? C.tint50 : '#fff' }}>{children}</button>;
}

function StepRow({ icon, label, done, active, onClick }: { icon: React.ReactNode; label: string; done: boolean; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 9px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: active ? C.tint100 : 'transparent' }}>
      <span style={{
        width: 20, height: 20, borderRadius: 999, display: 'grid', placeItems: 'center', flexShrink: 0,
        background: done ? C.green : active ? C.purple : '#fff',
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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.13em', textTransform: 'uppercase', color: '#9a9a9a', paddingTop: 6 }}>Question {index + 1} of {total}</span>
      </div>

      {/* type tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 20 }}>
        {TYPES.map((t) => {
          const active = q.uiType === t.key;
          return (
            <button key={t.key} onClick={() => switchType(t.key)}
              style={{ fontSize: 12.5, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${active ? t.color : C.border3}`, background: active ? t.color : '#fff', color: active ? '#fff' : C.ink }}>
              {t.label}
            </button>
          );
        })}
      </div>

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

      {/* type-specific editors */}
      {optionLike && (
        <div>
          <RailLabel>{q.uiType === 'HOTSPOT' ? 'Regions — tap the circle to mark correct' : 'Options — tap the circle to mark correct'}</RailLabel>
          {q.uiType === 'HOTSPOT' && (
            <div style={{ margin: '10px 0', height: 120, borderRadius: 12, background: 'linear-gradient(135deg,#eef4ff,#f7f2ff)', position: 'relative', border: `1px solid ${C.border2}` }}>
              {q.options.map((o, i) => (
                <span key={i} style={{ position: 'absolute', left: `${12 + (i * 68) % 260}px`, top: `${20 + (i % 2) * 50}px`, width: 26, height: 26, borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800, color: '#fff', background: o.c ? C.green : '#ff6b00' }}>{i + 1}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
            {q.options.map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${o.c ? '#bfead0' : C.border3}`, background: o.c ? '#f4fdf6' : '#fff', borderRadius: 10, padding: '6px 10px' }}>
                <button onClick={() => setCorrect(i)} title="Mark correct"
                  style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', border: o.c ? 'none' : '1.5px solid #d3d3d3', background: o.c ? C.green : '#fff', color: '#fff' }}>
                  {o.c && <Check size={13} strokeWidth={3} />}
                </button>
                <input value={o.t} onChange={(e) => setOptText(i, e.target.value)} placeholder={`Option ${i + 1}`}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: C.ink }} />
                <button onClick={() => delOpt(i)} disabled={q.options.length <= 2} style={{ border: 'none', background: 'transparent', color: '#cdcdcd', cursor: q.options.length <= 2 ? 'not-allowed' : 'pointer', opacity: q.options.length <= 2 ? 0.4 : 1 }}><X size={15} /></button>
              </div>
            ))}
          </div>
          <button onClick={addOpt} style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: C.purpleText, background: 'transparent', border: `1.5px dashed ${C.tint100}`, borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }}>
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
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${o.c ? '#bfead0' : C.border3}`, background: o.c ? '#f4fdf6' : '#fff', borderRadius: 10, padding: '6px 10px' }}>
                <button onClick={() => setCorrect(i)} style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', border: o.c ? 'none' : '1.5px solid #d3d3d3', background: o.c ? C.green : '#fff', color: '#fff' }}>{o.c && <Check size={13} strokeWidth={3} />}</button>
                <input value={o.t} onChange={(e) => setOptText(i, e.target.value)} placeholder={`Word ${i + 1}`} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent' }} />
                <button onClick={() => delOpt(i)} disabled={q.options.length <= 2} style={{ border: 'none', background: 'transparent', color: '#cdcdcd', cursor: 'pointer', opacity: q.options.length <= 2 ? 0.4 : 1 }}><X size={15} /></button>
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
          <input type="number" min={0} value={q.points} onChange={(e) => update({ points: Number(e.target.value) })}
            style={{ width: 70, border: `1px solid ${C.border3}`, borderRadius: 9, padding: '7px 10px', fontSize: 14, outline: 'none' }} />
        </div>
        <button onClick={generateSimilar} disabled={generating}
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#fff', background: q.uiType === 'MCQ' ? C.purple : '#9a9a9a', border: 'none', borderRadius: 999, padding: '9px 16px', cursor: q.uiType === 'MCQ' ? 'pointer' : 'not-allowed', opacity: q.uiType === 'MCQ' ? 1 : 0.6 }}
          title={q.uiType === 'MCQ' ? '' : 'Available for MCQ questions'}>
          {generating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Generate 3 similar
        </button>
      </div>
    </div>
  );
}

function EmptyEditor({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ minHeight: 400, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 }}>No questions yet</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Add your first question to get started.</div>
        <button onClick={onAdd} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: C.purple, border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>Add question</button>
      </div>
    </div>
  );
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

      <Field label="Title"><input value={p.title} onChange={(e: any) => p.setTitle(e.target.value)} style={inputStyle} placeholder="e.g. Algebra II — Unit 4 Mock" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Subject">
          <Select value={p.subjectId} onValueChange={p.setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{p.subjects.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Class">
          <Select value={p.classId} onValueChange={p.setClassId}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{p.classes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Time limit (minutes)"><input type="number" min={1} value={p.duration} onChange={(e: any) => p.setDuration(Number(e.target.value))} style={inputStyle} /></Field>
      <Field label="Instructions"><textarea value={p.instructions} onChange={(e: any) => p.setInstructions(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Shown to students before they begin." /></Field>

      <button onClick={p.goNext} style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#fff', background: C.ink, border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }}>Continue to questions →</button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 6 }}><RailLabel>{label}</RailLabel></div>
      {children}
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '8px 0 12px' }}>
        <div><div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>Opens</div><input type="datetime-local" value={p.opensAt} onChange={(e: any) => p.setOpensAt(e.target.value)} style={inputStyle} /></div>
        <div><div style={{ fontSize: 11.5, color: C.muted, marginBottom: 4 }}>Closes</div><input type="datetime-local" value={p.closesAt} onChange={(e: any) => p.setClosesAt(e.target.value)} style={inputStyle} /></div>
      </div>
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
            <button key={o.v} onClick={() => p.setAttempts(o.v)} style={{ fontSize: 13, fontWeight: 700, padding: '8px 16px', border: 'none', cursor: 'pointer', background: p.attempts === o.v ? C.ink : '#fff', color: p.attempts === o.v ? '#fff' : C.ink }}>{o.l}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <Toggle on={p.shuffle} onChange={p.setShuffle} label="Shuffle question order" />
        <Toggle on={p.allowPause} onChange={p.setAllowPause} label="Allow pause & resume" />
        <Toggle on={p.lockdown} onChange={p.setLockdown} label="Lockdown browser" />
        <Toggle on={p.honorAccom} onChange={p.setHonorAccom} label="Honor accommodations" />
      </div>

      {p.honorAccom && (
        <AccommodationPanel accom={p.accom} setAccom={p.setAccom} open={p.accomOpen} setOpen={p.setAccomOpen} roster={p.roster} duration={p.duration} />
      )}

      <button onClick={p.goNext} style={{ marginTop: 22, fontSize: 13, fontWeight: 700, color: '#fff', background: C.ink, border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }}>Continue to grading →</button>
    </div>
  );
}

function AccommodationPanel({ accom, setAccom, open, setOpen, roster, duration }: any) {
  const add = () => {
    const used = new Set(accom.map((a: Accom) => a.studentId));
    const next = roster.find((r: any) => !used.has(r.id));
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
                <input value={a.name} onChange={(e) => upd(a.id, { name: e.target.value, initials: initials(e.target.value) })} style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 600 }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.purpleText, background: C.tint50, borderRadius: 999, padding: '4px 10px' }}>{Math.round(duration * a.multiplier)} min total</span>
                <button onClick={() => setAccom(accom.filter((x: Accom) => x.id !== a.id))} style={{ border: 'none', background: 'transparent', color: '#cdcdcd', cursor: 'pointer' }}><X size={15} /></button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <div style={{ display: 'inline-flex', border: `1px solid ${C.border3}`, borderRadius: 8, overflow: 'hidden' }}>
                  {[1, 1.25, 1.5, 2].map((m) => (
                    <button key={m} onClick={() => upd(a.id, { multiplier: m })} style={{ fontSize: 12, fontWeight: 700, padding: '5px 10px', border: 'none', cursor: 'pointer', background: a.multiplier === m ? C.purple : '#fff', color: a.multiplier === m ? '#fff' : C.ink }}>{m}×</button>
                  ))}
                </div>
                <ChipToggle on={a.readAloud} onClick={() => upd(a.id, { readAloud: !a.readAloud })} label="Read-aloud" />
                <ChipToggle on={a.breaks} onClick={() => upd(a.id, { breaks: !a.breaks })} label="Extra breaks" />
                <input value={a.note} onChange={(e) => upd(a.id, { note: e.target.value })} placeholder="IEP/504 note" style={{ flex: 1, minWidth: 120, border: `1px solid ${C.border3}`, borderRadius: 8, padding: '5px 10px', fontSize: 12.5, outline: 'none' }} />
              </div>
            </div>
          ))}
          <button onClick={add} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 10, border: `1.5px dashed ${C.tint100}`, background: '#fff', color: C.purpleText, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}><Plus size={13} /> Add student override</button>
        </div>
      )}
    </div>
  );
}

function ChipToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return <button onClick={onClick} style={{ fontSize: 12, fontWeight: 700, padding: '5px 11px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${on ? C.purple : C.border3}`, background: on ? C.tint50 : '#fff', color: on ? C.purpleText : C.muted }}>{label}</button>;
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
            <input type="number" min={0} max={100} value={p.passMark} onChange={(e: any) => p.setPassMark(Number(e.target.value))} style={{ width: 64, border: `1px solid ${C.border3}`, borderRadius: 10, padding: '8px 10px', fontSize: 15, fontWeight: 700, textAlign: 'center', outline: 'none' }} />
            <span style={{ fontSize: 14, color: C.muted }}>%</span>
          </div>
        </div>
      </div>

      <RailLabel>Release scores</RailLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, margin: '10px 0 20px' }}>
        {[{ k: 'immediately', l: 'Immediately' }, { k: 'approve', l: 'When I approve' }, { k: 'closed', l: 'After exam closes' }].map((o) => {
          const on = p.release === o.k;
          return (
            <button key={o.k} onClick={() => p.setRelease(o.k)} style={{ padding: '14px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 700, border: `1.5px solid ${on ? C.purple : C.border3}`, background: on ? C.tint50 : '#fff', color: on ? C.purpleText : C.ink }}>{o.l}</button>
          );
        })}
      </div>

      <div>
        <Toggle on={p.autoGrade} onChange={p.setAutoGrade} label="Auto-grade objective questions" />
        <Toggle on={p.showAnswers} onChange={p.setShowAnswers} label="Show correct answers after release" />
        <Toggle on={p.allowRegrade} onChange={p.setAllowRegrade} label="Allow regrade requests" />
        <Toggle on={p.latePenalty} onChange={p.setLatePenalty} label="Late submission penalty (10%)" />
        <Toggle on={p.syncGradebook} onChange={p.setSyncGradebook} label="Sync to gradebook" />
      </div>

      <button onClick={p.goPublish} style={{ marginTop: 22, fontSize: 13, fontWeight: 700, color: '#fff', background: C.ink, border: 'none', borderRadius: 10, padding: '10px 18px', cursor: 'pointer' }}>Review & publish →</button>
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
  if (!q) return <div style={{ padding: 24, textAlign: 'center', color: C.muted2, fontSize: 13 }}>Select or add a question to preview.</div>;
  return (
    <div style={{ borderRadius: 16, background: '#fff', border: `1px solid ${C.border2}`, boxShadow: '0 8px 24px -14px rgba(0,0,0,.25)', overflow: 'hidden' }}>
      <div style={{ height: 5, background: 'linear-gradient(90deg,#7a3dff,#ed52cb)' }} />
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.muted2 }}>Q{index + 1} / {total}</span>
          <span style={{ fontSize: 11, color: C.muted2 }}>◷ {String(minutes).padStart(2, '0')}:00</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 14, lineHeight: 1.4 }}>{renderQuestionText(q.text || 'Your question text appears here.')}</div>
        <StudentInput q={q} value={null} onChange={() => {}} small />
      </div>
    </div>
  );
}

/** The interactive answer control for one question (used in the player). */
function StudentInput({ q, value, onChange, small }: { q: Question; value: any; onChange: (v: any) => void; small?: boolean }) {
  const optPad = small ? '9px 12px' : '15px 18px';
  const fs = small ? 13.5 : 16;

  if (q.uiType === 'DROPDOWN') {
    return (
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} style={{ width: '100%', border: `1px solid ${C.border3}`, borderRadius: 10, padding: optPad, fontSize: fs, outline: 'none' }}>
        <option value="">Select…</option>
        {q.options.map((o, i) => <option key={i} value={i}>{o.t}</option>)}
      </select>
    );
  }
  if (q.uiType === 'SHORT' || q.uiType === 'ESSAY' || q.uiType === 'EXTENDED') {
    return <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={q.uiType === 'SHORT' ? 2 : 5} placeholder="Type your answer…" style={{ width: '100%', border: `1px solid ${C.border3}`, borderRadius: 12, padding: optPad, fontSize: fs, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} />;
  }
  if (q.uiType === 'DRAG') {
    const parts = (q.text || '').split(/_{2,}|___/);
    return (
      <div>
        <div style={{ fontSize: fs, lineHeight: 1.9 }}>
          {parts.map((seg, i) => (
            <span key={i}>{seg}{i < parts.length - 1 && <span style={{ display: 'inline-block', minWidth: 60, borderBottom: `2px dashed ${C.purple}`, margin: '0 4px' }}>&nbsp;</span>}</span>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
          {q.options.map((o, i) => <span key={i} style={{ fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: C.tint50, color: C.purpleText, border: `1px solid ${C.tint100}` }}>{o.t || `word ${i + 1}`}</span>)}
        </div>
      </div>
    );
  }
  if (q.uiType === 'HOTSPOT') {
    return (
      <div style={{ height: small ? 130 : 200, borderRadius: 12, background: 'linear-gradient(135deg,#eef4ff,#f7f2ff)', position: 'relative', border: `1px solid ${C.border2}` }}>
        {q.options.map((o, i) => {
          const on = value === i;
          return <button key={i} onClick={() => onChange(i)} style={{ position: 'absolute', left: `${12 + (i * 70) % 260}px`, top: `${24 + (i % 2) * 70}px`, width: 30, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#fff', background: on ? C.purple : '#8a8a8a', boxShadow: on ? `0 0 0 5px ${C.tint100}` : 'none' }}>{i + 1}</button>;
        })}
      </div>
    );
  }
  // MCQ / TF as big option buttons
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: small ? 8 : 12 }}>
      {q.options.map((o, i) => {
        const on = value === i;
        return (
          <button key={i} onClick={() => onChange(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: optPad, borderRadius: 12, cursor: 'pointer', border: `2px solid ${on ? C.purple : C.border3}`, background: on ? '#f5f0ff' : '#fff', fontSize: fs, color: C.ink, transition: 'all .15s' }}>
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

  const q = questions[pIdx];
  const total = questions.length;
  const frac = minutes > 0 ? remaining / (minutes * 60) : 1;
  const mm = Math.floor(remaining / 60), ss = remaining % 60;

  if (!q) {
    return (
      <div style={overlayStyle}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <p style={{ fontSize: 15, color: C.muted }}>No questions to preview yet.</p>
          <button onClick={onClose} style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: '#fff', background: C.ink, border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.ink }}>{title || 'Untitled exam'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted, marginTop: 2 }}>
            <span style={{ width: 7, height: 7, borderRadius: 999, background: C.green }} /> Autosaved · preview mode
          </div>
        </div>
        <TimerRing frac={frac} mm={mm} />
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 999, border: `1px solid ${C.border3}`, background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={17} /></button>
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
          <StudentInput q={q} value={answers[pIdx] ?? null} onChange={(v) => setAnswers((a) => ({ ...a, [pIdx]: v }))} />
        </div>
      </div>

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: `1px solid ${C.border2}` }}>
        <button onClick={() => setPIdx((i) => Math.max(0, i - 1))} disabled={pIdx === 0} style={{ fontSize: 13, fontWeight: 700, color: C.ink, background: '#fff', border: `1px solid ${C.border3}`, borderRadius: 10, padding: '9px 16px', cursor: pIdx === 0 ? 'not-allowed' : 'pointer', opacity: pIdx === 0 ? 0.4 : 1 }}>← Previous</button>
        {pIdx < total - 1 ? (
          <button onClick={() => setPIdx((i) => i + 1)} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: C.ink, border: 'none', borderRadius: 10, padding: '9px 18px', cursor: 'pointer' }}>Next →</button>
        ) : (
          <button onClick={() => { toast.success('Exam submitted (preview).'); onClose(); }} style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: C.green, border: 'none', borderRadius: 10, padding: '9px 20px', cursor: 'pointer' }}>Submit exam</button>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 60, background: '#f4f3f0', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, ui-sans-serif, system-ui' };

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
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(20,16,30,.45)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, padding: 30, textAlign: 'center', boxShadow: '0 30px 70px -20px rgba(0,0,0,.5)', animation: 'gs-pop .18s ease' }}>
        <div style={{ width: 60, height: 60, borderRadius: 999, background: C.greenBg, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
          <Check size={30} strokeWidth={3} color={C.greenText} />
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>Exam published</div>
        <p style={{ fontSize: 13.5, color: C.muted, margin: '8px 0 22px' }}>
          "{title || 'Untitled exam'}" is live{className ? ` for ${className}` : ''} — {count} questions · {points} points.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onEdit} style={{ flex: 1, fontSize: 13, fontWeight: 700, color: C.ink, background: '#fff', border: `1px solid ${C.border3}`, borderRadius: 11, padding: '11px', cursor: 'pointer' }}>Back to editing</button>
          <button onClick={onDashboard} style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#fff', background: C.ink, border: 'none', borderRadius: 11, padding: '11px', cursor: 'pointer' }}>View dashboard</button>
        </div>
      </div>
      <style>{`@keyframes gs-pop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}
