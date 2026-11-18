import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { AlertTriangle, ArrowLeft, BarChart3, Check, History, Loader2, Lock, Plus, RotateCcw, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';
import { PLACEMENT_BANDS, PLACEMENT_BAND_GRADES, PLACEMENT_BAND_LABELS, PLACEMENT_SECTIONS, PLACEMENT_SECTION_IDS, type PlacementBand, type PlacementSectionId } from '../../../shared/placementTest';
import { StudentQuestionPreview, readLocalDraft, useUnsavedGuard, writeLocalDraft, type LocalDraft } from './placementEditing';

interface BankQuestion { id: string; section: PlacementSectionId; band: PlacementBand; skill: string; passageId: string | null; prompt: string; options: string[]; answer: number; active: boolean; updatedAt: string }
interface BankPassage { id: string; title: string; body: string[] }
interface FormDetail { form: { id: string; name: string }; questions: BankQuestion[]; passages: BankPassage[]; canEdit: boolean }
interface QuestionStats { seen: number; correct: number; wrong: number; blank: number; wrongChoices: { text: string; count: number }[] }

interface Draft { section: PlacementSectionId; band: PlacementBand; skill: string; passageId: string; prompt: string; options: string[]; answer: number; active: boolean }

const letter = (i: number) => String.fromCharCode(65 + i);
const pct = (part: number, whole: number) => whole ? Math.round((part / whole) * 100) : 0;
const same = (a: Draft | null, b: Draft | null) => JSON.stringify(a) === JSON.stringify(b);
const when = (value: string) => new Date(value).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });

function toDraft(q: BankQuestion): Draft {
  return { section: q.section, band: q.band, skill: q.skill, passageId: q.passageId ?? '', prompt: q.prompt, options: [...q.options], answer: q.answer, active: q.active };
}

function problems(draft: Draft) {
  const errors: Partial<Record<'skill' | 'prompt' | 'options', string>> = {};
  const options = draft.options.map(o => o.trim());
  if (!draft.prompt.trim()) errors.prompt = 'Write the question.';
  if (!draft.skill.trim()) errors.skill = 'Name the skill this question checks, for example “Main idea” or “Percent”.';
  if (options.length < 2) errors.options = 'Add at least two answer choices.';
  else if (options.some(o => !o)) errors.options = 'Fill in every answer choice, or remove the empty ones.';
  else if (new Set(options).size !== options.length) errors.options = 'Two answer choices are the same.';
  return errors;
}

export default function PlacementQuestionEditor() {
  const { formId = '', questionId = 'new' } = useParams();
  const [params] = useSearchParams();
  const isNew = questionId === 'new';
  const storageKey = `mrlc-placement-question:${formId}:${questionId}`;
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [original, setOriginal] = useState<BankQuestion | null>(null);
  const [initial, setInitial] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [restore, setRestore] = useState<LocalDraft<Draft> | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAnswer, setShowAnswer] = useState(true);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const dirty = Boolean(draft && initial && !same(draft, initial));
  const { dialog, leave } = useUnsavedGuard(dirty && !saving);
  const backTo = `/placement-results/questions?form=${formId}${original ? `#q-${original.id}` : ''}`;

  const load = useCallback(async () => {
    setLoadError('');
    const data = await apiGet<FormDetail>(`/api/placement-bank/forms/${formId}`);
    setDetail(data);
    let base: Draft;
    let question: BankQuestion | null = null;
    if (isNew) {
      const section = (PLACEMENT_SECTION_IDS as readonly string[]).includes(params.get('section') || '') ? params.get('section') as PlacementSectionId : 'RLA';
      const band = (PLACEMENT_BANDS as readonly string[]).includes(params.get('band') || '') ? params.get('band') as PlacementBand : 'FOUNDATION';
      base = { section, band, skill: '', passageId: '', prompt: '', options: ['', '', '', ''], answer: 0, active: true };
    } else {
      question = data.questions.find(q => q.id === questionId) ?? null;
      if (!question) throw new Error('This question no longer exists in the draft.');
      base = toDraft(question);
      apiGet<Record<string, QuestionStats>>(`/api/placement-bank/forms/${formId}/stats`).then(all => setStats(all[question!.id] ?? null)).catch(() => setStats(null));
    }
    setOriginal(question);
    setInitial(base);
    setDraft(base);
    const saved = readLocalDraft<Draft>(storageKey);
    setRestore(saved && !same(saved.value, base) ? saved : null);
  }, [formId, questionId, isNew, params, storageKey]);

  useEffect(() => { load().catch(err => setLoadError(err.message || 'This question could not load')); }, [load]);

  useEffect(() => {
    if (!draft || !initial || restore) return;
    if (dirty) writeLocalDraft<Draft>(storageKey, { value: draft, savedAt: new Date().toISOString(), baseUpdatedAt: original?.updatedAt ?? null });
    else writeLocalDraft(storageKey, null);
  }, [draft, initial, dirty, restore, storageKey, original]);

  const errors = useMemo(() => draft ? problems(draft) : {}, [draft]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(prev => prev ? { ...prev, [key]: value } : prev);
  const passage = detail?.passages.find(p => p.id === draft?.passageId) ?? null;
  const canEdit = Boolean(detail?.canEdit);

  const save = useCallback(async (event?: FormEvent, addAnother = false) => {
    event?.preventDefault();
    if (!draft || !detail || saving) return;
    if (Object.keys(errors).length) {
      setShowErrors(true);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const body = { section: draft.section, band: draft.band, skill: draft.skill.trim(), passageId: draft.passageId || null, prompt: draft.prompt.trim(), options: draft.options.map(o => o.trim()), answer: draft.answer, active: draft.active, ...(original ? { expectedUpdatedAt: original.updatedAt } : {}) };
      const saved = original
        ? await apiSend<BankQuestion>(`/api/placement-bank/questions/${original.id}`, 'PATCH', body)
        : await apiSend<BankQuestion>(`/api/placement-bank/forms/${formId}/questions`, 'POST', body);
      writeLocalDraft(storageKey, null);
      toast.success(original ? 'Question saved to the draft' : 'Question added to the draft');
      if (addAnother) {
        const next: Draft = { ...draft, skill: '', prompt: '', options: ['', '', '', ''], answer: 0 };
        setInitial(next);
        setDraft(next);
        setShowErrors(false);
        requestAnimationFrame(() => promptRef.current?.focus());
      } else {
        leave(`/placement-results/questions?form=${formId}#q-${saved.id}`);
      }
    } catch (err: any) {
      setSaveError(err.message || 'The question could not be saved. Your changes are kept on this device.');
    } finally {
      setSaving(false);
    }
  }, [draft, detail, saving, errors, original, formId, storageKey, leave]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (dirty && canEdit) void save();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dirty, canEdit, save]);

  if (loadError) return <div className="mx-auto max-w-3xl space-y-4"><Link to={backTo} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Question bank</Link><p className="flex items-center gap-2 text-destructive" role="alert"><AlertTriangle className="h-4 w-4" />{loadError}</p></div>;
  if (!detail || !draft) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading the question</div>;

  const sectionTitle = PLACEMENT_SECTIONS.find(s => s.id === draft.section)?.title;
  const invalid = (key: 'skill' | 'prompt' | 'options') => showErrors && errors[key] ? true : undefined;

  return <form onSubmit={event => void save(event)} className="mx-auto max-w-7xl" noValidate>
    <div className="space-y-1">
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Question bank · {detail.form.name}</Link>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{isNew ? 'Add a question' : 'Edit question'}</h1>
      <p className="text-sm text-muted-foreground">{sectionTitle} · {PLACEMENT_BAND_LABELS[draft.band]} · Saving changes the draft only. An administrator publishes it to newcomers.</p>
    </div>

    {restore && <div role="status" className="mt-5 flex flex-col gap-3 rounded-sm border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm"><History className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>You have unsaved changes to this question from {when(restore.savedAt)}.{original && restore.baseUpdatedAt && restore.baseUpdatedAt !== original.updatedAt ? ' The question was saved by someone since then, so check their version before you restore yours.' : ''}</span></p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" onClick={() => { writeLocalDraft(storageKey, null); setRestore(null); }}>Discard them</Button>
        <Button type="button" onClick={() => { setDraft(restore.value); setRestore(null); }}><RotateCcw className="mr-2 h-4 w-4" />Restore my changes</Button>
      </div>
    </div>}

    {!canEdit && <p className="mt-5 flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground"><Lock className="h-4 w-4" aria-hidden="true" />You can view this question. Teachers and administrators can edit it.</p>}

    <div className="mt-6 grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
      <div className="space-y-6">
        {!isNew && <section aria-labelledby="history-title" className="rounded-sm border border-border bg-card p-5 shadow-sm">
          <h2 id="history-title" className="flex items-center gap-2 text-base font-semibold"><BarChart3 className="h-4 w-4" aria-hidden="true" />How students did on this question</h2>
          {!stats?.seen ? <p className="mt-2 text-sm text-muted-foreground">No students have had this question yet, so changing it affects no results.</p> : <>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Students</dt><dd className="text-xl font-semibold tabular-nums">{stats.seen}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Right</dt><dd className="text-xl font-semibold tabular-nums text-success">{stats.correct} <span className="text-sm font-normal text-muted-foreground">{pct(stats.correct, stats.seen)}%</span></dd></div>
              <div><dt className="text-xs text-muted-foreground">Missed</dt><dd className="text-xl font-semibold tabular-nums text-destructive">{stats.wrong}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Left blank</dt><dd className="text-xl font-semibold tabular-nums">{stats.blank}</dd></div>
            </dl>
            {stats.wrongChoices.length > 0 && <div className="mt-4 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Most common wrong answers</p>
              <ul className="mt-1.5 space-y-1 text-sm">{stats.wrongChoices.map(c => <li key={c.text} className="flex justify-between gap-3"><span className="min-w-0 truncate">{c.text}</span><span className="shrink-0 tabular-nums text-muted-foreground">{c.count} student{c.count === 1 ? '' : 's'}</span></li>)}</ul>
            </div>}
            <p className="mt-3 text-xs text-muted-foreground">Counts cover every published version that included this question. Results already sent keep the version their student had.</p>
          </>}
        </section>}

        <section aria-labelledby="where-title" className="rounded-sm border border-border bg-card p-5 shadow-sm">
          <h2 id="where-title" className="text-base font-semibold">Where it appears</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Subject
              <select value={draft.section} disabled={!canEdit} onChange={event => set('section', event.target.value as PlacementSectionId)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {PLACEMENT_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Level
              <select value={draft.band} disabled={!canEdit} onChange={event => set('band', event.target.value as PlacementBand)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {PLACEMENT_BANDS.map(b => <option key={b} value={b}>{PLACEMENT_BAND_LABELS[b]}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">{PLACEMENT_BAND_GRADES[draft.band]}</span>
            </label>
            <label className="text-sm font-medium">Skill
              <Input value={draft.skill} disabled={!canEdit} maxLength={80} aria-invalid={invalid('skill')} aria-describedby={invalid('skill') ? 'skill-error' : undefined} onChange={event => set('skill', event.target.value)} className="mt-1.5 aria-invalid:border-destructive" placeholder="For example: Main idea, Percent" />
              {invalid('skill') && <span id="skill-error" className="mt-1 block text-xs font-medium text-destructive">{errors.skill}</span>}
            </label>
            <label className="text-sm font-medium">Passage <span className="font-normal text-muted-foreground">optional</span>
              <select value={draft.passageId} disabled={!canEdit} onChange={event => set('passageId', event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No passage</option>
                {detail.passages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section aria-labelledby="question-title" className="rounded-sm border border-border bg-card p-5 shadow-sm">
          <h2 id="question-title" className="text-base font-semibold">Question</h2>
          <label htmlFor="prompt" className="sr-only">Question text</label>
          <Textarea id="prompt" ref={promptRef} value={draft.prompt} disabled={!canEdit} rows={4} maxLength={1500} aria-invalid={invalid('prompt')} aria-describedby={invalid('prompt') ? 'prompt-error' : 'prompt-hint'} onChange={event => set('prompt', event.target.value)} className="mt-3 aria-invalid:border-destructive" />
          {invalid('prompt') ? <p id="prompt-error" className="mt-1 text-xs font-medium text-destructive">{errors.prompt}</p> : <p id="prompt-hint" className="mt-1 text-xs text-muted-foreground">Use plain words a newcomer learning English can read. A new line in the text starts a new line for students.</p>}

          <fieldset className="mt-6" aria-describedby={invalid('options') ? 'options-error' : 'options-hint'}>
            <legend className="text-sm font-semibold">Answer choices</legend>
            <p id="options-hint" className="text-xs text-muted-foreground">Select the correct answer. Wrong answers work best when they come from mistakes students really make.</p>
            <div className="mt-3 space-y-2">
              {draft.options.map((option, i) => <div key={i} className={`flex items-center gap-2 rounded-md border p-1.5 pl-3 ${draft.answer === i ? 'border-success bg-success/5' : 'border-border'}`}>
                <input type="radio" name="correct" checked={draft.answer === i} disabled={!canEdit} onChange={() => set('answer', i)} aria-label={`Choice ${letter(i)} is the correct answer`} className="h-4 w-4 accent-[var(--success)]" />
                <span className="w-4 text-xs font-semibold text-muted-foreground" aria-hidden="true">{letter(i)}</span>
                <Input value={option} disabled={!canEdit} maxLength={400} aria-label={`Choice ${letter(i)}`} aria-invalid={showErrors && !option.trim() ? true : undefined} onChange={event => set('options', draft.options.map((o, j) => j === i ? event.target.value : o))} className="h-9 flex-1 aria-invalid:border-destructive" />
                {draft.answer === i ? <span className="w-14 text-xs font-medium text-success">Correct</span> : <span className="w-14" aria-hidden="true" />}
                {canEdit && <Button type="button" variant="ghost" size="sm" aria-label={`Remove choice ${letter(i)}`} disabled={draft.options.length <= 2} onClick={() => setDraft({ ...draft, options: draft.options.filter((_, j) => j !== i), answer: draft.answer === i ? 0 : draft.answer > i ? draft.answer - 1 : draft.answer })}><X className="h-4 w-4" /></Button>}
              </div>)}
            </div>
            {invalid('options') && <p id="options-error" className="mt-2 text-xs font-medium text-destructive">{errors.options}</p>}
            {canEdit && draft.options.length < 6 && <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => set('options', [...draft.options, ''])}><Plus className="mr-1.5 h-4 w-4" />Add choice</Button>}
          </fieldset>

          {!isNew && <label className="mt-6 flex items-center gap-3 border-t border-border pt-4 text-sm"><Switch checked={draft.active} disabled={!canEdit} onCheckedChange={checked => set('active', Boolean(checked))} /><span><span className="font-medium">{draft.active ? 'In the test' : 'Retired'}</span><span className="block text-xs text-muted-foreground">Retired questions stay in the bank but are left out when the draft is published.</span></span></label>}
        </section>
      </div>

      <aside aria-labelledby="preview-title" className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <h2 id="preview-title" className="text-sm font-semibold">Student view</h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch size="sm" checked={showAnswer} onCheckedChange={checked => setShowAnswer(Boolean(checked))} />Show answer</label>
          </div>
          <div className="pt-embed-compact pt-4">
            <StudentQuestionPreview id={original?.id ?? 'new'} number={1} prompt={draft.prompt} options={draft.options} answer={draft.answer} passage={passage} showAnswer={showAnswer} />
            <p className="mt-3 text-xs text-muted-foreground">Students see the choices in a shuffled order, so the letters here may differ from the test.</p>
          </div>
        </div>
      </aside>
    </div>

    {canEdit && <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 sm:pr-16">
        <p className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Saving…</>
            : saveError ? <span className="flex items-start gap-2 text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{saveError}</span>
            : dirty ? <span className="font-medium text-warning">Unsaved changes · also kept on this device</span>
            : <span className="flex items-center gap-1.5 text-muted-foreground"><Check className="h-4 w-4" aria-hidden="true" />{isNew ? 'Nothing written yet' : 'All changes saved to the draft'}</span>}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {saveError && saveError.startsWith('Someone else') && <Button type="button" variant="outline" onClick={() => { window.location.reload(); }}>Reload latest</Button>}
          {dirty && (confirmDiscard
            ? <span className="flex items-center gap-2 text-sm"><span>Discard your changes?</span><Button type="button" variant="outline" size="sm" onClick={() => { writeLocalDraft(storageKey, null); setDraft(initial); setConfirmDiscard(false); setShowErrors(false); setSaveError(''); }}>Discard</Button><Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDiscard(false)}>Keep</Button></span>
            : <Button type="button" variant="ghost" onClick={() => setConfirmDiscard(true)}>Discard changes</Button>)}
          {isNew && <Button type="button" variant="outline" disabled={saving || !dirty} onClick={() => void save(undefined, true)}>Save and add another</Button>}
          <Button type="submit" disabled={saving || !dirty}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save to draft</Button>
        </div>
      </div>
    </div>}
    {dialog}
  </form>;
}
