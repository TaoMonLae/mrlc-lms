import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, Check, History, Loader2, Lock, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';
import { PLACEMENT_BAND_LABELS, type PlacementBand } from '../../../shared/placementTest';
import { StudentQuestionPreview, readLocalDraft, useUnsavedGuard, writeLocalDraft, type LocalDraft } from './placementEditing';

interface BankQuestion { id: string; band: PlacementBand; skill: string; passageId: string | null; prompt: string; options: string[]; answer: number; active: boolean }
interface BankPassage { id: string; title: string; body: string[]; updatedAt: string }
interface FormDetail { form: { id: string; name: string }; questions: BankQuestion[]; passages: BankPassage[]; canEdit: boolean }
interface Draft { title: string; text: string }

const same = (a: Draft | null, b: Draft | null) => JSON.stringify(a) === JSON.stringify(b);
const when = (value: string) => new Date(value).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
const paragraphs = (text: string) => text.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);

export default function PlacementPassageEditor() {
  const { formId = '', passageId = 'new' } = useParams();
  const isNew = passageId === 'new';
  const storageKey = `mrlc-placement-passage:${formId}:${passageId}`;
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [original, setOriginal] = useState<BankPassage | null>(null);
  const [initial, setInitial] = useState<Draft | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [restore, setRestore] = useState<LocalDraft<Draft> | null>(null);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = Boolean(draft && initial && !same(draft, initial));
  const { dialog, leave } = useUnsavedGuard(dirty && !saving);
  const backTo = `/placement-results/questions?form=${formId}`;

  const load = useCallback(async () => {
    setLoadError('');
    const data = await apiGet<FormDetail>(`/api/placement-bank/forms/${formId}`);
    setDetail(data);
    let base: Draft = { title: '', text: '' };
    let passage: BankPassage | null = null;
    if (!isNew) {
      passage = data.passages.find(p => p.id === passageId) ?? null;
      if (!passage) throw new Error('This passage no longer exists in the draft.');
      base = { title: passage.title, text: passage.body.join('\n\n') };
    }
    setOriginal(passage);
    setInitial(base);
    setDraft(base);
    const saved = readLocalDraft<Draft>(storageKey);
    setRestore(saved && !same(saved.value, base) ? saved : null);
  }, [formId, passageId, isNew, storageKey]);

  useEffect(() => { load().catch(err => setLoadError(err.message || 'This passage could not load')); }, [load]);

  useEffect(() => {
    if (!draft || !initial || restore) return;
    if (dirty) writeLocalDraft<Draft>(storageKey, { value: draft, savedAt: new Date().toISOString(), baseUpdatedAt: original?.updatedAt ?? null });
    else writeLocalDraft(storageKey, null);
  }, [draft, initial, dirty, restore, storageKey, original]);

  const body = useMemo(() => paragraphs(draft?.text ?? ''), [draft]);
  const errors = useMemo(() => {
    const result: Partial<Record<'title' | 'text', string>> = {};
    if (!draft?.title.trim()) result.title = 'Give the passage a title.';
    if (!body.length) result.text = 'Write the passage text.';
    return result;
  }, [draft, body]);
  const users = useMemo(() => (detail?.questions ?? []).filter(q => q.passageId === original?.id), [detail, original]);
  const canEdit = Boolean(detail?.canEdit);

  const save = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    if (!draft || saving) return;
    if (Object.keys(errors).length) {
      setShowErrors(true);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const payload = { title: draft.title.trim(), body, ...(original ? { expectedUpdatedAt: original.updatedAt } : {}) };
      if (original) await apiSend(`/api/placement-bank/passages/${original.id}`, 'PATCH', payload);
      else await apiSend(`/api/placement-bank/forms/${formId}/passages`, 'POST', payload);
      writeLocalDraft(storageKey, null);
      toast.success('Passage saved to the draft');
      leave(backTo);
    } catch (err: any) {
      setSaveError(err.message || 'The passage could not be saved. Your changes are kept on this device.');
    } finally {
      setSaving(false);
    }
  }, [draft, saving, errors, body, original, formId, storageKey, leave, backTo]);

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
  if (!detail || !draft) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading the passage</div>;

  const invalid = (key: 'title' | 'text') => showErrors && errors[key] ? true : undefined;
  const preview = { title: draft.title, body };

  return <form onSubmit={event => void save(event)} className="mx-auto max-w-7xl" noValidate>
    <div className="space-y-1">
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Question bank · {detail.form.name}</Link>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{isNew ? 'Add a passage' : 'Edit passage'}</h1>
      <p className="text-sm text-muted-foreground">{isNew ? 'A reading text, table or experiment that several questions can share.' : `Used by ${users.length} question${users.length === 1 ? '' : 's'}. A change here shows in all of them.`} Saving changes the draft only.</p>
    </div>

    {restore && <div role="status" className="mt-5 flex flex-col gap-3 rounded-sm border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm"><History className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>You have unsaved changes to this passage from {when(restore.savedAt)}.{original && restore.baseUpdatedAt && restore.baseUpdatedAt !== original.updatedAt ? ' The passage was saved by someone since then, so check their version before you restore yours.' : ''}</span></p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" onClick={() => { writeLocalDraft(storageKey, null); setRestore(null); }}>Discard them</Button>
        <Button type="button" onClick={() => { setDraft(restore.value); setRestore(null); }}><RotateCcw className="mr-2 h-4 w-4" />Restore my changes</Button>
      </div>
    </div>}

    {!canEdit && <p className="mt-5 flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground"><Lock className="h-4 w-4" aria-hidden="true" />You can view this passage. Teachers and administrators can edit it.</p>}

    <div className="mt-6 grid gap-6 pb-28 lg:grid-cols-[minmax(0,1fr)_minmax(340px,480px)]">
      <section aria-labelledby="passage-title" className="space-y-5 self-start rounded-sm border border-border bg-card p-5 shadow-sm">
        <h2 id="passage-title" className="sr-only">Passage</h2>
        <label className="block text-sm font-medium">Title
          <Input value={draft.title} disabled={!canEdit} maxLength={160} aria-invalid={invalid('title')} aria-describedby={invalid('title') ? 'title-error' : undefined} onChange={event => setDraft({ ...draft, title: event.target.value })} className="mt-1.5 aria-invalid:border-destructive" />
          {invalid('title') && <span id="title-error" className="mt-1 block text-xs font-medium text-destructive">{errors.title}</span>}
        </label>
        <label className="block text-sm font-medium">Text
          <Textarea value={draft.text} disabled={!canEdit} rows={18} aria-invalid={invalid('text')} aria-describedby={invalid('text') ? 'text-error' : 'text-hint'} onChange={event => setDraft({ ...draft, text: event.target.value })} className="mt-1.5 leading-relaxed aria-invalid:border-destructive" />
          {invalid('text') ? <span id="text-error" className="mt-1 block text-xs font-medium text-destructive">{errors.text}</span> : <span id="text-hint" className="mt-1 block text-xs font-normal text-muted-foreground">Leave an empty line between paragraphs. {body.length} paragraph{body.length === 1 ? '' : 's'}.</span>}
        </label>
      </section>

      <aside aria-labelledby="preview-title" className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <h2 id="preview-title" className="text-sm font-semibold">Student view</h2>
            {users.length > 0 && <label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch size="sm" checked={showAnswer} onCheckedChange={checked => setShowAnswer(Boolean(checked))} />Show answers</label>}
          </div>
          <div className="space-y-6 pt-4">
            {users.length === 0
              ? <StudentQuestionPreview id={original?.id ?? 'new-passage'} number={1} prompt="Questions that use this passage appear here once you link them." options={[]} passage={preview} />
              : users.map((q, i) => <div key={q.id}>
                <p className="mb-2 text-xs text-muted-foreground">{PLACEMENT_BAND_LABELS[q.band]} · {q.skill}{q.active ? '' : ' · Retired'}</p>
                <StudentQuestionPreview id={q.id} number={i + 1} prompt={q.prompt} options={q.options} answer={q.answer} passage={i === 0 ? preview : null} showAnswer={showAnswer} />
              </div>)}
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
          {saveError.startsWith('Someone else') && <Button type="button" variant="outline" onClick={() => window.location.reload()}>Reload latest</Button>}
          {dirty && (confirmDiscard
            ? <span className="flex items-center gap-2 text-sm"><span>Discard your changes?</span><Button type="button" variant="outline" size="sm" onClick={() => { writeLocalDraft(storageKey, null); setDraft(initial); setConfirmDiscard(false); setShowErrors(false); setSaveError(''); }}>Discard</Button><Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDiscard(false)}>Keep</Button></span>
            : <Button type="button" variant="ghost" onClick={() => setConfirmDiscard(true)}>Discard changes</Button>)}
          <Button type="submit" disabled={saving || !dirty}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save to draft</Button>
        </div>
      </div>
    </div>}
    {dialog}
  </form>;
}
