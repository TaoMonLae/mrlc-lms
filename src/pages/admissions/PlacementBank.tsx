import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router';
import { AlertTriangle, ArrowDown, BarChart3, ArrowUp, Check, CheckCircle2, Copy, Eye, EyeOff, FileText, History, MonitorPlay, Loader2, Lock, Pencil, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { apiGet, apiSend } from '../../lib/api';
import { PLACEMENT_BANDS, PLACEMENT_BAND_GRADES, PLACEMENT_BAND_LABELS, PLACEMENT_SECTIONS, type PlacementBand, type PlacementSectionId } from '../../../shared/placementTest';
import { PlacementHeader } from './placementShared';
import { StudentQuestionPreview } from './placementEditing';

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

const when = (value: string) => new Date(value).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });

export default function PlacementBank() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const formId = params.get('form') ?? '';
  const setParamsRef = useRef(setParams);
  setParamsRef.current = setParams;
  const setFormId = useCallback((id: string) => setParamsRef.current(prev => { const next = new URLSearchParams(prev); next.set('form', id); return next; }, { replace: true }), []);
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [stats, setStats] = useState<Record<string, QuestionStats>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<Set<string>>(new Set());
  const [showRetired, setShowRetired] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadForms = useCallback(async (select?: string) => {
    const data = await apiGet<{ forms: FormSummary[]; canEdit: boolean }>('/api/placement-bank');
    setForms(data.forms);
    setCanEdit(data.canEdit);
    const current = new URLSearchParams(window.location.search).get('form');
    const next = select ?? (current && data.forms.some(f => f.id === current) ? current : data.forms[0]?.id ?? '');
    if (next && next !== current) setFormId(next);
  }, [setFormId]);

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
  useEffect(() => {
    if (!detail || !location.hash.startsWith('#q-')) return;
    const id = location.hash.slice(1);
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: 'center' });
      el.classList.add('bg-primary/5');
      window.setTimeout(() => el.classList.remove('bg-primary/5'), 2400);
    });
  }, [detail, location.hash]);

  const togglePreview = (id: string) => setPreviewing(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const editBase = `/placement-results/questions/${formId}`;

  const passageUse = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of detail?.questions ?? []) if (q.passageId) map.set(q.passageId, (map.get(q.passageId) ?? 0) + 1);
    return map;
  }, [detail]);

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
            <Link to={`${editBase}/preview`} className={buttonVariants({ variant: 'outline' }) + ' border'}><MonitorPlay className="mr-2 h-4 w-4" aria-hidden="true" />Preview as student</Link>
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
          {canEdit && <Link to={`${editBase}/passages/new`} className={buttonVariants({ variant: 'outline' }) + ' border'}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Add passage</Link>}
        </div>
        {detail.passages.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No passages in this form.</p> : <ul className="mt-3 divide-y divide-border">
          {detail.passages.map(p => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3"><FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div className="min-w-0"><p className="truncate font-medium">{p.title}</p><p className="text-xs text-muted-foreground">{p.body.length} paragraph{p.body.length === 1 ? '' : 's'} · used by {passageUse.get(p.id) ?? 0} question{passageUse.get(p.id) === 1 ? '' : 's'}</p></div></div>
            {canEdit && <div className="flex gap-1">
              <Link to={`${editBase}/passages/${p.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Edit<span className="sr-only"> {p.title}</span></Link>
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
            {canEdit && <Link to={`${editBase}/questions/new?section=${section.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' }) + ' border'}><Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />Add question</Link>}
          </div>
          {PLACEMENT_BANDS.map(band => {
            const items = inSection.filter(q => q.band === band).sort((a, b) => a.sortOrder - b.sortOrder);
            return <div key={band} className="border-b border-border last:border-0">
              <p className="bg-muted/40 px-5 py-1.5 text-xs font-semibold text-muted-foreground">{PLACEMENT_BAND_LABELS[band]} <span className="font-normal">· {PLACEMENT_BAND_GRADES[band]}</span></p>
              {items.length === 0 ? <p className="px-5 py-3 text-sm text-destructive">No {PLACEMENT_BAND_LABELS[band]} questions. Publishing needs at least one.</p> : <ol className="divide-y divide-border">
                {items.map((q, index) => <li key={q.id} id={`q-${q.id}`} className={`grid scroll-mt-24 gap-3 px-5 py-3 transition-colors duration-700 md:grid-cols-[minmax(0,1fr)_auto] ${q.active ? '' : 'text-muted-foreground'}`}>
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
                  <div className="flex flex-wrap items-start gap-1">
                    <Button type="button" variant="ghost" size="sm" aria-expanded={previewing.has(q.id)} aria-controls={`preview-${q.id}`} onClick={() => togglePreview(q.id)}>{previewing.has(q.id) ? <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}Preview</Button>
                    <Link to={`${editBase}/questions/${q.id}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}><Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />{canEdit ? 'Edit' : 'Open'}</Link>
                  {canEdit && <>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Move up: ${q.skill}`} disabled={index === 0 || busy !== null} onClick={() => void run(`mv-${q.id}`, async () => { await apiSend(`/api/placement-bank/questions/${q.id}/move`, 'POST', { direction: 'up' }); await loadDetail(formId); })}><ArrowUp className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" aria-label={`Move down: ${q.skill}`} disabled={index === items.length - 1 || busy !== null} onClick={() => void run(`mv-${q.id}`, async () => { await apiSend(`/api/placement-bank/questions/${q.id}/move`, 'POST', { direction: 'down' }); await loadDetail(formId); })}><ArrowDown className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => void run(`act-${q.id}`, async () => { await apiSend(`/api/placement-bank/questions/${q.id}/active`, 'POST', { active: !q.active }); await refresh(); })}>{q.active ? <><X className="mr-1.5 h-3.5 w-3.5" />Retire</> : <><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Restore</>}</Button>
                    {!q.active && <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => void run(`del-${q.id}`, async () => {
                      if (!window.confirm('Delete this retired question from the draft? Published versions keep their copy.')) return;
                      await apiSend(`/api/placement-bank/questions/${q.id}`, 'DELETE');
                      await refresh();
                    })}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete</Button>}
                  </>}
                  </div>
                  {previewing.has(q.id) && <div id={`preview-${q.id}`} className="max-w-3xl pt-1 md:col-span-2">
                    <StudentQuestionPreview id={q.id} number={index + 1} prompt={q.prompt} options={q.options} answer={q.answer} passage={q.passageId ? detail.passages.find(p => p.id === q.passageId) ?? null : null} showAnswer />
                  </div>}
                </li>)}
              </ol>}
            </div>;
          })}
        </section>;
      })}
    </>}

  </div>;
}
