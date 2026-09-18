/** Lossless editor mapping for the Exam Studio's supported question formats. */
export type UIType = 'MCQ' | 'TF' | 'SHORT' | 'ESSAY' | 'DRAG' | 'DROPDOWN' | 'HOTSPOT' | 'EXTENDED';
export type StepKey = 'details' | 'questions' | 'schedule' | 'grading';

export interface Opt { t: string; c: boolean }
export interface Question {
  id: string;
  uiType: UIType;
  /** original backend enum when it can't be reconstructed (e.g. GED_*) */
  origType?: string;
  original?: any;
  text: string;
  points: number;
  options: Opt[];
  /** model answer / rubric note for manually-graded types */
  sample?: string;
  explanation?: string;
  passageText?: string;
  imageUrl?: string | null;
}


export function fromBackend(q: any, index: number): Question {
  const type = String(q.type || 'MCQ');
  const options = Array.isArray(q.options) ? q.options : [];
  const accepted = Array.isArray(q.correctAnswers) && q.correctAnswers.length ? q.correctAnswers.map(String) : q.correctAnswer != null ? [String(q.correctAnswer)] : [];
  const label = (option: any) => String(typeof option === 'object' ? option.text ?? option.label ?? option.value ?? '' : option);
  const correct = (option: any, i: number) => accepted.some((raw: string) => { const index = Number(raw); if (raw.trim() && Number.isInteger(index) && options[index] !== undefined) return index === i; return raw === String(typeof option === 'object' ? option.value ?? option.id ?? label(option) : label(option)); });
  const base: Question = { id: q.id || `q_${index}`, original: q, origType: type, uiType: 'MCQ', text: q.text || '', points: q.points == null ? 5 : Number(q.points), options: options.map((o: any, i: number) => ({ t: label(o), c: correct(o, i) })), sample: '', explanation: q.explanation || '', passageText: q.passageText || '', imageUrl: q.imageUrl || null };
  if (type === 'TRUE_FALSE') { base.uiType = 'TF'; base.options = ['True', 'False'].map((t, i) => ({ t, c: accepted.some((v: string) => v === String(i) || v.toLowerCase() === t.toLowerCase()) })); }
  else if (['SHORT_ANSWER', 'ESSAY', 'WRITTEN', 'EXTENDED'].includes(type)) { base.uiType = type === 'SHORT_ANSWER' ? 'SHORT' : type === 'ESSAY' ? 'ESSAY' : 'EXTENDED'; base.sample = q.correctAnswer || ''; }
  else if (type === 'DROPDOWN') base.uiType = 'DROPDOWN';
  else if (type === 'HOTSPOT' || accepted.length > 1) base.uiType = 'HOTSPOT';
  if (type === 'DRAG_DROP') {
    base.uiType = 'DRAG';
    const opts = q.options || {};
    const byId = new Map((opts.blanks || []).map((b: any) => [String(b.id), String(b.answer)]));
    const text = typeof opts.text === 'string' ? opts.text : base.text;
    const answers: string[] = [];
    base.text = text.replace(/\{\{([^}]+)\}\}/g, (_: string, id: string) => { answers.push(String(byId.get(id) ?? '')); return '___'; });
    base.options = [...answers.map(t => ({ t, c: true })), ...(opts.distractors || []).map((t: string) => ({ t, c: false }))];
  } else if (q.options?.ui) {
    base.uiType = q.options.ui === 'DROPDOWN' ? 'DROPDOWN' : 'HOTSPOT';
    const key = Array.isArray(q.options.correct) ? q.options.correct : [Number(q.correctAnswer)];
    base.options = (q.options.choices || []).map((t: string, i: number) => ({ t, c: key.includes(i) }));
  }
  return base;
}

export function toBackend(q: Question) {
  const firstCorrect = q.options.findIndex(o => o.c);
  const common = { id: q.id, questionText: q.text, points: q.points, explanation: q.explanation || null, passageText: q.passageText?.trim() || null, imageUrl: q.imageUrl || null };
  const manualTypes = { SHORT: 'SHORT_ANSWER', ESSAY: 'ESSAY', EXTENDED: q.origType === 'WRITTEN' ? 'WRITTEN' : 'EXTENDED' };
  if (q.uiType in manualTypes) return { ...common, type: manualTypes[q.uiType as keyof typeof manualTypes], choices: null, correctAnswer: q.sample || null, correctAnswers: null, partialCredit: false };
  if (q.uiType === 'DRAG') {
    const answers = q.options.filter(o => o.c).map(o => o.t);
    const blanks: { id: string; answer: string }[] = [];
    const text = q.text.replace(/_{2,}/g, () => { const id = `b${blanks.length}`; blanks.push({ id, answer: answers[blanks.length] || '' }); return `{{${id}}}`; });
    return { ...common, questionText: text, type: 'DRAG_DROP', choices: { text, blanks, distractors: q.options.filter(o => !o.c).map(o => o.t) }, correctAnswer: null, correctAnswers: null, partialCredit: !!q.original?.partialCredit };
  }
  const type = q.uiType === 'TF' ? 'TRUE_FALSE' : q.uiType === 'DROPDOWN' ? 'DROPDOWN' : q.uiType === 'HOTSPOT' ? 'HOTSPOT' : q.origType || 'MCQ';
  return { ...common, type, choices: q.options.map(o => o.t), correctAnswer: firstCorrect < 0 ? null : String(firstCorrect), correctAnswers: q.uiType === 'HOTSPOT' ? q.options.flatMap((o, i) => o.c ? [String(i)] : []) : null, partialCredit: q.uiType === 'HOTSPOT' ? q.original?.partialCredit ?? true : false };
}

/** Authoring errors shared by readiness and the publish action. Drafts may be incomplete. */
export function questionIssue(q: Question): string | null {
  if (!q.text.trim()) return 'Add question text.';
  if (!Number.isFinite(q.points) || q.points < 1) return 'Points must be at least 1.';
  if (['SHORT', 'ESSAY', 'EXTENDED'].includes(q.uiType)) return null;
  if (q.options.length < (q.uiType === 'DRAG' ? 1 : 2)) return 'Add at least two answer options.';
  if (q.options.some(o => !o.t.trim())) return 'Fill in every answer option.';
  if (!q.options.some(o => o.c)) return 'Mark a correct answer.';
  if (q.uiType === 'DRAG') {
    const count = q.text.match(/_{2,}/g)?.length || 0;
    if (!count || count !== q.options.filter(o => o.c).length) return 'Add one correct word for each ___ blank, in order.';
  } else if (new Set(q.options.map(o => o.t.trim().toLocaleLowerCase())).size !== q.options.length) return 'Answer options must be distinct.';
  return null;
}
