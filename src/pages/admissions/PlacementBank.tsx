import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowDown, BarChart3, ArrowUp, Check, CheckCircle2, Copy, FileText, History, Loader2, Lock, Pencil, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';
import { PLACEMENT_BANDS, PLACEMENT_BAND_GRADES, PLACEMENT_BAND_LABELS, PLACEMENT_SECTIONS, type PlacementBand, type PlacementSectionId } from '../../../shared/placementTest';
import { PlacementHeader } from './placementShared';

interface FormSummary {
  id: string;
  name: string;
  active: boolean;
  draftCount: number;
  retiredCount: number;
  latest: { id: string; version: number; publishedAt: string; publishedByName: string | null; questionCount: number } | null;
  hasChanges: boolean;
  errorCount: number;
}

interface BankQuestion { id: string; section: PlacementSectionId; band: PlacementBand; skill: string; passageId: string | null; prompt: string; options: string[]; answer: number; sortOrder: number; active: boolean }
interface BankPassage { id: string; title: string; body: string[]; sortOrder: number }
interface VersionRow { id: string; version: number; publishedAt: string; publishedByName: string | null; questionCount: number; submissions: number }
interface FormDetail {
  form: FormSummary;
  questions: BankQuestion[];
  passages: BankPassage[];
  versions: VersionRow[];
  validation: { errors: string[]; warnings: string[]; blueprint: Record<string, Record<string, number>>; questionCount: number };
  canEdit: boolean;
  canPublish: boolean;
}

interface QuestionStats { seen: number; correct: number; wrong: number; blank: number; wrongChoices: { text: string; count: number }[]; lastSeenAt: string | null }

const pct = (part: number, whole: number) => whole ? Math.round((part / whole) * 100) : 0;

function statsTone(stat: QuestionStats) {
  if (stat.seen < 5) return '';
  const rate = pct(stat.correct, stat.seen);
  if (rate < 25) return 'Very few students get this right. Check that the answer key and the wording are clear.';
  if (rate > 95) return 'Almost every student gets this right. It may be too easy for its level.';
  if (pct(stat.blank, stat.seen) >= 40) return 'Many students leave this blank. The question may be unclear or too long.';
  return '';
}

interface QuestionDraft { id?: string; section: PlacementSectionId; band: PlacementBand; skill: string; passageId: string; prompt: string; options: string[]; answer: number; active: boolean }
interface PassageDraft { id?: string; title: string; text: string }

const emptyQuestion = (section: PlacementSectionId = 'RLA', band: PlacementBand = 'FOUNDATION'): QuestionDraft => ({ section, band, skill: '', passageId: '', prompt: '', options: ['', '', '', ''], answer: 0, active: true });
const letter = (i: number) => String.fromCharCode(65 + i);
const when = (value: string) => new Date(value).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });

export default function PlacementBank() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [formId, setFormId] = useState('');
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [stats, setStats] = useState<Record<string, QuestionStats>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionDraft | null>(null);
  const [passage, setPassage] = useState<PassageDraft | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [showRetired, setShowRetired] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadForms = useCallback(async (select?: string) => {
    const data = await apiGet<{ forms: FormSummary[]; canEdit: boolean }>('/api/placement-bank');
    setForms(data.forms);
    setCanEdit(data.canEdit);
    setFormId(current => select ?? (current && data.forms.some(f => f.id === current) ? current : data.forms[0]?.id ?? ''));
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    if (!id) return;
    const [form, usage] = await Promise.all([
      apiGet<FormDetail>(`/api/placement-bank/forms/${id}`),
      apiGet<Record<string, QuestionStats>>(`/api/placement-bank/forms/${id}/stats`).catch(() => ({})),
    ]);
    setDetail(form);
    setStats(usage);
  }, []);

  useEffect(() => {
    loadForms().catch(err => setError(err.message || 'The question bank could not load')).finally(() => setLoading(false));
  }, [loadForms]);

  useEffect(() => {
    if (!formId) return;
    setDetail(null);
    loadDetail(formId).catch(err => setError(err.message || 'This form could not load'));
  }, [formId, loadDetail]);

  const refresh = async () => {
    await Promise.all([loadForms(), loadDetail(formId)]);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try { await fn(); }
    catch (err: any) {
      const details = err?.data?.details?.errors as string[] | undefined;
      toast.error(err.message || 'That did not work', details?.length ? { description: details.slice(0, 3).join(' ') } : undefined);
    }
    finally { setBusy(null); }
  };

  const passageTitle = useMemo(() => new Map((detail?.passages ?? []).map(p => [p.id, p.title])), [detail]);
  const passageUse = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of detail?.questions ?? []) if (q.passageId) map.set(q.passageId, (map.get(q.passageId) ?? 0) + 1);
    return map;
  }, [detail]);

  const saveQuestion = (event: FormEvent) => {
    event.preventDefault();
    if (!question || !detail) return;
    const options = question.options.map(o => o.trim());
    if (!question.prompt.trim()) return setFieldError('Write the question.');
    if (!question.skill.trim()) return setFieldError('Name the skill this question checks, for example “Main idea” or “Percent”.');
    if (options.length < 2 || options.some(o => !o)) return setFieldError('Fill in every answer choice, or remove the empty ones.');
    if (new Set(options).size !== options.length) return setFieldError('Two answer choices are the same.');
    setFieldError('');
    void run('question', async () => {
      const body = { section: question.section, band: question.band, skill: question.skill.trim(), passageId: question.passageId || null, prompt: question.prompt.trim(), options, answer: question.answer, active: question.active };
      if (question.id) await apiSend(`/api/placement-bank/questions/${question.id}`, 'PATCH', body);
      else await apiSend(`/api/placement-bank/forms/${detail.form.id}/questions`, 'POST', body);
      toast.success(question.id ? 'Question saved to the draft' : 'Question added to the draft');
      setQuestion(null);
      await refresh();
    });
  };

  const savePassage = (event: FormEvent) => {
    event.preventDefault();
    if (!passage || !detail) return;
    const body = passage.text.split(/\n\s*\n/).map(p => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    if (!passage.title.trim()) return setFieldError('Give the passage a title.');
    if (!body.length) return setFieldError('Write the passage text.');
    setFieldError('');
    void run('passage', async () => {
      if (passage.id) await apiSend(`/api/placement-bank/passages/${passage.id}`, 'PATCH', { title: passage.title.trim(), body });
      else await apiSend(`/api/placement-bank/forms/${detail.form.id}/passages`, 'POST', { title: passage.title.trim(), body });
      toast.success('Passage saved to the draft');
      setPassage(null);
      await refresh();
    });
  };

  const publish = () => detail && run('publish', async () => {
    if (!window.confirm(`Publish Form ${detail.form.id}? New tests will use this version. Tests already started keep the version they were given.`)) return;
    const result = await apiSend<{ version: number; unchanged: boolean }>(`/api/placement-bank/forms/${detail.form.id}/publish`, 'POST');
    toast.success(result.unchanged ? 'Nothing changed since the last version.' : `Form ${detail.form.id} version ${result.version} published`);
    await refresh();
  });

  const createForm = (copyFrom?: string) => run('new-form', async () => {
    const created = await apiSend<{ id: string }>('/api/placement-bank/forms', 'POST', copyFrom ? { copyFrom } : {});
    toast.success(`Form ${created.id} created${copyFrom ? ` from Form ${copyFrom}` : ''}. It is not in the rotation until you publish it and turn it on.`);
    await loadForms(created.id);
  });

  const setActive = (active: boolean) => detail && run('active', async () => {
    await apiSend(`/api/placement-bank/forms/${detail.form.id}`, 'PATCH', { active });
    toast.success(active ? `Form ${detail.form.id} is now in the rotation` : `Form ${detail.form.id} removed from the rotation`);
    await refresh();
  });

  if (error) return <div className="mx-auto max-w-7xl space-y-6"><PlacementHeader title="Question bank" description="Write and publish the questions newcomers see." /><p className="flex items-center gap-2 text-sm text-destructive" role="alert"><AlertTriangle className="h-4 w-4" />{error}</p></div>;
  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading the question bank</div>;

  const v = detail?.validation;
  const visible = (detail?.questions ?? []).filter(q => showRetired || q.active);

  return <div className="mx-auto max-w-7xl space-y-6">
    <PlacementHeader
      title="Question bank"
      description="Teachers edit a draft and an administrator publishes it. Each test is scored against the exact version the student received, so editing never changes results already sent."
      actions={canEdit && <>
        <Button type="button" variant="outline" onClick={() => void createForm(formId || undefined)} disabled={busy !== null || !formId}><Copy className="mr-2 h-4 w-4" />Copy Form {formId}</Button>
        <Button type="button" variant="outline" onClick={() => void createForm()} disabled={busy !== null}><Plus className="mr-2 h-4 w-4" />Blank form</Button>
      </>}
    />

    {!canEdit && <p className="flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground"><Lock className="h-4 w-4" aria-hidden="true" />You can view the question bank. Teachers and administrators can edit it.</p>}

    <div role="group" aria-label="Forms" className="flex flex-wrap gap-2">
      {forms.map(form => <button key={form.id} type="button" aria-pressed={form.id === formId} onClick={() => setFormId(form.id)} className={`min-h-11 rounded-sm border px-3 py-1.5 text-left text-sm transition-colors ${form.id === formId ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-input'}`}>
        <span className="block font-semibold">{form.name}</span>
        <span className="block text-xs text-muted-foreground">{form.latest ? `v${form.latest.version} · ${form.latest.questionCount} questions` : 'Not published'}{form.active ? ' · In rotation' : ' · Off'}{form.hasChanges && form.latest ? ' · Draft changed' : ''}</span>
      </button>)}
    </div>

    {!detail && <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading Form {formId}</div>}

    {detail && v && <>
      <section aria-labelledby="status-title" className="rounded-sm border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 id="status-title" className="text-lg font-semibold">{detail.form.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.form.latest ? <>Live: version {detail.form.latest.version}, {detail.form.latest.questionCount} questions, published {when(detail.form.latest.publishedAt)}{detail.form.latest.publishedByName ? ` by ${detail.form.latest.publishedByName}` : ''}.</> : 'This form has never been published, so newcomers cannot receive it yet.'}
            </p>
            <p className="mt-1 text-sm">
              {detail.form.hasChanges
                ? <span className="font-medium text-warning">The draft has changes that newcomers do not see yet.</span>
                : <span className="inline-flex items-center gap-1.5 text-success"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />The draft matches the live version.</span>}
            </p>
            {!detail.canPublish && detail.form.hasChanges && <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Lock className="h-4 w-4" aria-hidden="true" />An administrator reviews and publishes the draft.</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm"><Switch checked={detail.form.active} onCheckedChange={checked => setActive(Boolean(checked))} disabled={!canEdit || busy !== null || (!detail.form.latest && !detail.form.active)} />In rotation</label>
            <Button type="button" variant="outline" onClick={() => setShowHistory(s => !s)} aria-expanded={showHistory}><History className="mr-2 h-4 w-4" />History</Button>
            {detail.canPublish && <Button type="button" onClick={() => void publish()} disabled={busy !== null || v.errors.length > 0 || !detail.form.hasChanges}>{busy === 'publish' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Publish draft</Button>}
          </div>
        </div>

        {showHistory && <div className="mt-4 overflow-x-auto border-t border-border pt-4">
          {detail.versions.length === 0 ? <p className="text-sm text-muted-foreground">No versions yet.</p> : <table className="w-full min-w-[520px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="py-1.5 pr-4 font-semibold">Version</th><th className="py-1.5 pr-4 font-semibold">Published</th><th className="py-1.5 pr-4 font-semibold">By</th><th className="py-1.5 pr-4 font-semibold">Questions</th><th className="py-1.5 font-semibold">Tests taken</th></tr></thead>
            <tbody>{detail.versions.map(row => <tr key={row.id} className="border-t border-border"><td className="py-2 pr-4 font-medium">v{row.version}</td><td className="py-2 pr-4">{when(row.publishedAt)}</td><td className="py-2 pr-4">{row.publishedByName ?? '—'}</td><td className="py-2 pr-4 tabular-nums">{row.questionCount}</td><td className="py-2 tabular-nums">{row.submissions}</td></tr>)}</tbody>
          </table>}
        </div>}

        <div className="mt-5 grid gap-5 border-t border-border pt-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <h3 className="text-sm font-semibold">Questions in the draft</h3>
            <table className="mt-2 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 pr-3 font-medium">Subject</th>{PLACEMENT_BANDS.map(b => <th key={b} className="py-1 pr-3 text-right font-medium">{PLACEMENT_BAND_LABELS[b]}</th>)}</tr></thead>
              <tbody>{PLACEMENT_SECTIONS.map(s => <tr key={s.id} className="border-t border-border"><td className="py-1.5 pr-3">{s.title}</td>{PLACEMENT_BANDS.map(b => { const n = v.blueprint[s.id]?.[b] ?? 0; return <td key={b} className={`py-1.5 pr-3 text-right tabular-nums ${n === 0 ? 'font-semibold text-destructive' : n < 3 ? 'text-warning' : ''}`}>{n}</td>; })}</tr>)}</tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">Foundation is {PLACEMENT_BAND_GRADES.FOUNDATION}, Pre-GED {PLACEMENT_BAND_GRADES.PRE_GED}, GED {PLACEMENT_BAND_GRADES.GED}.</p>
          </div>
          <div className="space-y-4 lg:border-l lg:border-border lg:pl-5">
            {v.errors.length > 0 && <div role="alert">
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive"><X className="h-4 w-4" aria-hidden="true" />Fix before publishing</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-6 text-sm">{v.errors.slice(0, 8).map(e => <li key={e}>{e}</li>)}</ul>
            </div>}
            {v.warnings.length > 0 && <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Worth checking</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-6 text-sm">{v.warnings.slice(0, 6).map(w => <li key={w}>{w}</li>)}</ul>
            </div>}
            {v.errors.length === 0 && v.warnings.length === 0 && <p className="flex items-center gap-2 text-sm text-success"><Check className="h-4 w-4" aria-hidden="true" />Every subject has questions at all three levels, and the counts match the other forms.</p>}
          </div>
        </div>
      </section>

      <section aria-labelledby="passages-title" className="rounded-sm border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="passages-title" className="text-lg font-semibold">Passages</h2>
            <p className="text-sm text-muted-foreground">Reading texts, tables and experiments that several questions share.</p>
          </div>
          {canEdit && <Button type="button" variant="outline" onClick={() => { setFieldError(''); setPassage({ title: '', text: '' }); }}><Plus className="mr-2 h-4 w-4" />Add passage</Button>}
        </div>
        {detail.passages.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No passages in this form.</p> : <ul className="mt-3 divide-y divide-border">
          {detail.passages.map(p => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0"><p className="truncate font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.body.length} paragraph{p.body.length === 1 ? '' : 's'} · used by {passageUse.get(p.id) ?? 0} question{passageUse.get(p.id) === 1 ? '' : 's'}</p></div></div>
            {canEdit && <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => { setFieldError(''); setPassage({ id: p.id, title: p.title, text: p.body.join('\n\n') }); }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit<span className="sr-only"> {p.title}</span></Button>
              <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => void run(`del-p-${p.id}`, async () => {
                if (!window.confirm(`Delete the passage “${p.title}” from the draft?`)) return;
                await apiSend(`/api/placement-bank/passages/${p.id}`, 'DELETE');
                toast.success('Passage deleted from the draft');
                await refresh();
              })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete<span className="sr-only"> {p.title}</span></Button>
            </div>}
          </li>)}
        </ul>}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Questions</h2>
        {detail.form.retiredCount > 0 && <label className="flex items-center gap-2 text-sm"><Switch checked={showRetired} onCheckedChange={checked => setShowRetired(Boolean(checked))} />Show {detail.form.retiredCount} retired</label>}
      </div>

      {PLACEMENT_SECTIONS.map(section => {
        const inSection = visible.filter(q => q.section === section.id);
        return <section key={section.id} aria-labelledby={`sec-${section.id}`} className="rounded-sm border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h3 id={`sec-${section.id}`} className="font-semibold">{section.title} <span className="font-normal text-muted-foreground">· {inSection.filter(q => q.active).length} questions</span></h3>
            {canEdit && <Button type="button" variant="outline" size="sm" onClick={() => { setFieldError(''); setQuestion(emptyQuestion(section.id)); }}><Plus className="mr-1.5 h-4 w-4" />Add question</Button>}
          </div>
          {PLACEMENT_BANDS.map(band => {
            const items = inSection.filter(q => q.band === band).sort((a, b) => a.sortOrder - b.sortOrder);
            return <div key={band} className="border-b border-border last:border-0">
              <p className="bg-muted/40 px-5 py-1.5 text-xs font-semibold text-muted-foreground">{PLACEMENT_BAND_LABELS[band]} <span className="font-normal">· {PLACEMENT_BAND_GRADES[band]}</span></p>
              {items.length === 0 ? <p className="px-5 py-3 text-sm text-destructive">No {PLACEMENT_BAND_LABELS[band]} questions. Publishing needs at least one.</p> : <ol className="divide-y divide-border">
                {items.map((q, index) => <li key={q.id} className={`grid gap-3 px-5 py-3 md:grid-cols-[minmax(0,1fr)_auto] ${q.active ? '' : 'opacity-60'}`}>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground"><span className="font-medium text-foreground">{q.skill}</span>{q.passageId && <span>· Passage: {passageTitle.get(q.passageId) ?? 'missing'}</span>}{!q.active && <span className="rounded-sm border border-border px-1.5 font-medium">Retired</span>}</p>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm font-medium">{q.prompt}</p>
                    <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium text-success">Correct:</span> {q.options[q.answer]} <span className="mx-1">·</span>{q.options.length} choices</p>
                    {(() => {
                      const stat = stats[q.id];
                      if (!stat?.seen) return <p className="mt-1 text-xs text-muted-foreground">No students have had this question yet.</p>;
                      const note = statsTone(stat);
                      return <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"><BarChart3 className="h-3.5 w-3.5" aria-hidden="true" /><span><span className="font-medium text-foreground tabular-nums">{stat.seen}</span> students · <span className="tabular-nums">{pct(stat.correct, stat.seen)}%</span> right · <span className="tabular-nums">{stat.wrong}</span> missed · <span className="tabular-nums">{stat.blank}</span> blank</span>{note && <span className="font-medium text-warning">{note}</span>}</p>;
                    })()}
                  </div>
                  {canEdit && <div className="flex flex-wrap items-start gap-1">
                    <Button type="button" variant="ghost" size="sm" aria-label={`Move up: ${q.skill}`} disabled={index === 0 || busy !== null} onClick={() => void run(`mv-${q.id}`, async () => { await apiSend(`/api/placement-bank/questions/${q.id}/move`, 'POST', { direction: 'up' }); await loadDetail(formId); })}><ArrowUp className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Move down: ${q.skill}`} disabled={index === items.length - 1 || busy !== null} onClick={() => void run(`mv-${q.id}`, async () => { await apiSend(`/api/placement-bank/questions/${q.id}/move`, 'POST', { direction: 'down' }); await loadDetail(formId); })}><ArrowDown className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setFieldError(''); setQuestion({ id: q.id, section: q.section, band: q.band, skill: q.skill, passageId: q.passageId ?? '', prompt: q.prompt, options: [...q.options], answer: q.answer, active: q.active }); }}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
                    <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => void run(`act-${q.id}`, async () => { await apiSend(`/api/placement-bank/questions/${q.id}/active`, 'POST', { active: !q.active }); await refresh(); })}>{q.active ? <><X className="mr-1.5 h-3.5 w-3.5" />Retire</> : <><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Restore</>}</Button>
                    {!q.active && <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => void run(`del-${q.id}`, async () => {
                      if (!window.confirm('Delete this retired question from the draft? Published versions keep their copy.')) return;
                      await apiSend(`/api/placement-bank/questions/${q.id}`, 'DELETE');
                      await refresh();
                    })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>}
                  </div>}
                </li>)}
              </ol>}
            </div>;
          })}
        </section>;
      })}
    </>}

    <Sheet open={question !== null} onOpenChange={open => { if (!open) setQuestion(null); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        {question && detail && <form onSubmit={saveQuestion} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{question.id ? 'Edit question' : 'Add question'}</SheetTitle>
            <SheetDescription>Form {detail.form.id} draft. Students see the answer choices in a shuffled order.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 px-4">
            {question.id && (() => {
              const stat = stats[question.id];
              if (!stat?.seen) return <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">No students have had this question yet, so changing it affects no results.</p>;
              const note = statsTone(stat);
              return <section aria-labelledby="history-title" className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <h3 id="history-title" className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4" aria-hidden="true" />Before you change it</h3>
                <dl className="mt-2 grid grid-cols-4 gap-2 text-center">
                  <div><dt className="text-xs text-muted-foreground">Students</dt><dd className="text-base font-semibold tabular-nums">{stat.seen}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Right</dt><dd className="text-base font-semibold tabular-nums text-success">{stat.correct}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Missed</dt><dd className="text-base font-semibold tabular-nums text-destructive">{stat.wrong}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Blank</dt><dd className="text-base font-semibold tabular-nums">{stat.blank}</dd></div>
                </dl>
                {stat.wrongChoices.length > 0 && <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground">Most common wrong answers</p>
                  <ul className="mt-1 space-y-0.5">{stat.wrongChoices.map(c => <li key={c.text} className="flex justify-between gap-3"><span className="min-w-0 truncate">{c.text}</span><span className="shrink-0 tabular-nums text-muted-foreground">{c.count} student{c.count === 1 ? '' : 's'}</span></li>)}</ul>
                </div>}
                {note && <p className="mt-2 font-medium text-warning">{note}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Counts cover every published version that included this question. Results already sent keep the version their student had.</p>
              </section>;
            })()}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Subject
                <select value={question.section} onChange={event => setQuestion({ ...question, section: event.target.value as PlacementSectionId })} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {PLACEMENT_SECTIONS.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium">Level
                <select value={question.band} onChange={event => setQuestion({ ...question, band: event.target.value as PlacementBand })} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {PLACEMENT_BANDS.map(b => <option key={b} value={b}>{PLACEMENT_BAND_LABELS[b]}</option>)}
                </select>
                <span className="mt-1 block text-xs font-normal text-muted-foreground">{PLACEMENT_BAND_GRADES[question.band]}</span>
              </label>
            </div>
            <label className="block text-sm font-medium">Skill
              <Input value={question.skill} maxLength={80} onChange={event => setQuestion({ ...question, skill: event.target.value })} className="mt-1.5" placeholder="For example: Main idea, Percent, Food chains" />
            </label>
            <label className="block text-sm font-medium">Passage <span className="font-normal text-muted-foreground">optional</span>
              <select value={question.passageId} onChange={event => setQuestion({ ...question, passageId: event.target.value })} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No passage</option>
                {detail.passages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium">Question
              <Textarea value={question.prompt} rows={4} maxLength={1500} onChange={event => setQuestion({ ...question, prompt: event.target.value })} className="mt-1.5" />
            </label>
            <fieldset>
              <legend className="text-sm font-medium">Answer choices</legend>
              <p className="text-xs text-muted-foreground">Select the correct answer. Use wrong answers that come from real mistakes students make.</p>
              <div className="mt-2 space-y-2">
                {question.options.map((option, i) => <div key={i} className={`flex items-center gap-2 rounded-md border p-1.5 pl-2.5 ${question.answer === i ? 'border-success bg-success/5' : 'border-border'}`}>
                  <input type="radio" name="correct" checked={question.answer === i} onChange={() => setQuestion({ ...question, answer: i })} aria-label={`Choice ${letter(i)} is correct`} className="h-4 w-4 accent-[var(--success)]" />
                  <span className="w-4 text-xs font-semibold text-muted-foreground" aria-hidden="true">{letter(i)}</span>
                  <Input value={option} maxLength={400} aria-label={`Choice ${letter(i)}`} onChange={event => setQuestion({ ...question, options: question.options.map((o, j) => j === i ? event.target.value : o) })} className="h-9 flex-1" />
                  {question.answer === i && <span className="text-xs font-medium text-success">Correct</span>}
                  <Button type="button" variant="ghost" size="sm" aria-label={`Remove choice ${letter(i)}`} disabled={question.options.length <= 2} onClick={() => setQuestion({ ...question, options: question.options.filter((_, j) => j !== i), answer: question.answer === i ? 0 : question.answer > i ? question.answer - 1 : question.answer })}><X className="h-4 w-4" /></Button>
                </div>)}
              </div>
              {question.options.length < 6 && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setQuestion({ ...question, options: [...question.options, ''] })}><Plus className="mr-1.5 h-4 w-4" />Add choice</Button>}
            </fieldset>
            {fieldError && <p className="text-sm font-medium text-destructive" role="alert">{fieldError}</p>}
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setQuestion(null)}>Cancel</Button>
            <Button type="submit" disabled={busy === 'question'}>{busy === 'question' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save to draft</Button>
          </SheetFooter>
        </form>}
      </SheetContent>
    </Sheet>

    <Sheet open={passage !== null} onOpenChange={open => { if (!open) setPassage(null); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        {passage && detail && <form onSubmit={savePassage} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>{passage.id ? 'Edit passage' : 'Add passage'}</SheetTitle>
            <SheetDescription>Form {detail.form.id} draft. Leave an empty line between paragraphs.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 px-4">
            <label className="block text-sm font-medium">Title
              <Input value={passage.title} maxLength={160} onChange={event => setPassage({ ...passage, title: event.target.value })} className="mt-1.5" />
            </label>
            <label className="block text-sm font-medium">Text
              <Textarea value={passage.text} rows={14} onChange={event => setPassage({ ...passage, text: event.target.value })} className="mt-1.5 leading-relaxed" />
            </label>
            {fieldError && <p className="text-sm font-medium text-destructive" role="alert">{fieldError}</p>}
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setPassage(null)}>Cancel</Button>
            <Button type="submit" disabled={busy === 'passage'}>{busy === 'passage' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save to draft</Button>
          </SheetFooter>
        </form>}
      </SheetContent>
    </Sheet>
  </div>;
}
