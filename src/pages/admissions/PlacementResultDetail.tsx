import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AlertTriangle, Archive, ArchiveRestore, ArrowLeft, Check, Loader2, Mail, Phone, Save, Send, UserPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';
import {
  HIGHEST_GRADE_OPTIONS,
  PLACEMENT_BAND_GRADES,
  PLACEMENT_BAND_LABELS,
  PLACEMENT_FLAG_LABELS,
  PLACEMENT_LEVEL_CLASS_NAMES,
  PLACEMENT_LEVEL_LABELS,
  PLACEMENT_LEVELS,
  PLACEMENT_STATUSES,
  countWords,
  type PlacementLevel,
  type PlacementSection,
  type SectionScore,
  type WritingRating,
} from '../../../shared/placementTest';
import { LevelBadge, statusLabel } from './PlacementResults';

interface EmailState { status: string; sentAt: string | null; queuedAt: string; attempts: number; lastError: string | null }

interface ReviewItem { id: string; section: string; band: keyof typeof PLACEMENT_BAND_LABELS; skill: string; passageTitle: string | null; prompt: string; options: string[]; correctIndex: number; chosenIndex: number | null; correct: boolean }

interface PlacementDetail {
  id: string;
  referenceNo: string;
  fullName: string;
  contactNumber: string;
  email: string;
  formId: string;
  formVersion: number | null;
  age: number | null;
  highestGrade: string | null;
  writingSample: string | null;
  sectionScores: SectionScore[];
  totalCorrect: number;
  totalQuestions: number;
  recommendedLevel: PlacementLevel;
  finalLevel: PlacementLevel | null;
  writingRating: WritingRating;
  reviewNotes: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  status: string;
  flags: string[];
  durationSeconds: number | null;
  submittedAt: string;
  admissionApplicationId: string | null;
  decisionEmailedAt: string | null;
  decisionEmailedByName: string | null;
  decisionEmailedLevel: PlacementLevel | null;
  receiptEmail: EmailState | null;
  decisionEmail: EmailState | null;
  emailConfigured: boolean;
  review: ReviewItem[];
  sections: PlacementSection[];
  writingPrompt: string;
  otherAttempts: { id: string; referenceNo: string; submittedAt: string; recommendedLevel: PlacementLevel; finalLevel: PlacementLevel | null }[];
  canCreateAdmission: boolean;
}

const writingOptions: { value: WritingRating; label: string; hint: string }[] = [
  { value: 'NOT_RATED', label: 'Not rated', hint: '' },
  { value: 'BEGINNING', label: 'Beginning', hint: 'Few complete sentences; meaning often unclear' },
  { value: 'DEVELOPING', label: 'Developing', hint: 'Simple sentences; meaning mostly clear with errors' },
  { value: 'SECURE', label: 'Secure', hint: 'Organised sentences; errors rarely block meaning' },
];

const emailStatusText = (state: EmailState | null) => {
  if (!state) return 'Not sent';
  if (state.status === 'SENT') return `Delivered to the mail server ${state.sentAt ? new Date(state.sentAt).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' }) : ''}`.trim();
  if (state.status === 'FAILED') return `Failed after ${state.attempts} tries`;
  if (state.status === 'CANCELLED') return 'Cancelled';
  return 'Waiting to send';
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return 'Not recorded';
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
};

export default function PlacementResultDetail() {
  const { id } = useParams();
  const [archiving, setArchiving] = useState(false);
  const [data, setData] = useState<PlacementDetail | null>(null);
  const [error, setError] = useState('');
  const [finalLevel, setFinalLevel] = useState<PlacementLevel | ''>('');
  const [writingRating, setWritingRating] = useState<WritingRating>('NOT_RATED');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('NEW');
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [includeScores, setIncludeScores] = useState(true);
  const [confirmingEmail, setConfirmingEmail] = useState(false);
  const [emailing, setEmailing] = useState(false);

  const apply = (detail: PlacementDetail) => {
    setData(detail);
    setFinalLevel(detail.finalLevel ?? '');
    setWritingRating(detail.writingRating);
    setNotes(detail.reviewNotes ?? '');
    setStatus(detail.status);
  };

  useEffect(() => {
    let active = true;
    apiGet<PlacementDetail>(`/api/placement-tests/${id}`).then(detail => { if (active) apply(detail); }).catch(err => { if (active) setError(err.message || 'This placement test could not load'); });
    return () => { active = false; };
  }, [id]);

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await apiSend(`/api/placement-tests/${data.id}`, 'PATCH', { finalLevel: finalLevel || null, writingRating, reviewNotes: notes, status });
      apply(await apiGet<PlacementDetail>(`/api/placement-tests/${data.id}`));
      toast.success('Placement saved');
    } catch (err: any) {
      toast.error(err.message || 'Could not save the placement');
    } finally {
      setSaving(false);
    }
  };

  const sendDecision = async () => {
    if (!data) return;
    setEmailing(true);
    try {
      await apiSend(`/api/placement-tests/${data.id}/email-decision`, 'POST', { message: emailMessage, includeScores });
      toast.success(data.emailConfigured ? `Result email queued for ${data.email}` : 'Result email saved. It will send when school email is set up.');
      setConfirmingEmail(false);
      setEmailMessage('');
      apply(await apiGet<PlacementDetail>(`/api/placement-tests/${data.id}`));
    } catch (err: any) {
      toast.error(err.message || 'Could not send the result email');
    } finally {
      setEmailing(false);
    }
  };

  const toggleArchive = async () => {
    if (!data) return;
    const archived = data.status !== 'ARCHIVED';
    setArchiving(true);
    try {
      await apiSend(`/api/placement-tests/${data.id}/archive`, 'POST', { archived });
      toast.success(archived ? 'Test archived. Find it under Archived on the results page.' : 'Test restored');
      apply(await apiGet<PlacementDetail>(`/api/placement-tests/${data.id}`));
    } catch (err: any) {
      toast.error(err.message || 'That did not work');
    } finally {
      setArchiving(false);
    }
  };

  const createAdmission = async () => {
    if (!data) return;
    setCreating(true);
    try {
      await apiSend(`/api/placement-tests/${data.id}`, 'PATCH', { finalLevel: finalLevel || null, writingRating, reviewNotes: notes });
      const created = await apiSend<{ admissionApplicationId: string; applicationNo: string }>(`/api/placement-tests/${data.id}/admission`, 'POST');
      toast.success(`Admission application ${created.applicationNo} created`);
      apply(await apiGet<PlacementDetail>(`/api/placement-tests/${data.id}`));
    } catch (err: any) {
      toast.error(err.message || 'Could not create the admission application');
    } finally {
      setCreating(false);
    }
  };

  if (error) return <div className="mx-auto max-w-3xl space-y-4"><Link to="/placement-results" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Placement tests</Link><p className="flex items-center gap-2 text-destructive" role="alert"><AlertTriangle className="h-4 w-4" />{error}</p></div>;
  if (!data) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading placement test</div>;

  const grade = HIGHEST_GRADE_OPTIONS.find(o => o.value === data.highestGrade)?.label;
  const words = countWords(data.writingSample);
  const reviewBySection = data.sections.map(section => ({ section, items: data.review.filter(item => item.section === section.id && (showAll || !item.correct)) }));

  return <div className="mx-auto max-w-7xl space-y-6">
    <Link to="/placement-results" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Placement tests</Link>

    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{data.fullName}</h1>
        <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">{data.referenceNo}</span> · {statusLabel[data.status] ?? data.status}</p>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <a href={`tel:${data.contactNumber.replace(/[^+\d]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Phone className="h-4 w-4" aria-hidden="true" />{data.contactNumber}</a>
          {<a href={`mailto:${data.email}`} className="inline-flex items-center gap-1.5 hover:text-foreground"><Mail className="h-4 w-4" aria-hidden="true" />{data.email}</a>}
          <span>Form {data.formId}{data.formVersion ? ` v${data.formVersion}` : ''}</span>
          <span>Age {data.age ?? 'not given'}</span>
          <span>Last grade: {grade ?? 'not given'}</span>
          <span>Time taken: {formatDuration(data.durationSeconds)}</span>
          <span>Submitted {new Date(data.submittedAt).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-sm border border-border bg-card p-5 shadow-sm" aria-labelledby="scores-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="scores-title" className="text-lg font-semibold">Scores by subject</h2>
            <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Recommended</span><LevelBadge level={data.recommendedLevel} /></div>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Each subject has easy, middle and hard questions. A subject reaches a level when the learner answers enough questions at that band and every band below it. The overall recommendation follows the weaker of Reading and Math.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-semibold">Subject</th>
                  {(['FOUNDATION', 'PRE_GED', 'GED'] as const).map(band => <th key={band} className="py-2 pr-4 font-semibold">{PLACEMENT_BAND_LABELS[band]}<span className="block font-normal normal-case tracking-normal">{PLACEMENT_BAND_GRADES[band]}</span></th>)}
                  <th className="py-2 pr-4 font-semibold">Total</th>
                  <th className="py-2 font-semibold">Subject level</th>
                </tr>
              </thead>
              <tbody>
                {data.sectionScores.map(score => <tr key={score.section} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium">{data.sections.find(s => s.id === score.section)?.title ?? score.section}</td>
                  {score.bands.map(band => <td key={band.band} className="py-3 pr-4 tabular-nums"><span className="inline-flex items-center gap-1.5">{band.correct}/{band.total}{band.mastered ? <Check className="h-4 w-4 text-success" aria-label="reached" /> : <X className="h-4 w-4 text-muted-foreground" aria-label="not reached" />}</span></td>)}
                  <td className="py-3 pr-4 tabular-nums">{score.correct}/{score.total}{score.answered < score.total && <span className="block text-xs text-muted-foreground">{score.total - score.answered} blank</span>}</td>
                  <td className="py-3"><LevelBadge level={score.level} /></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {data.flags.length > 0 && <div className="mt-4 rounded-sm border border-warning/40 bg-warning/5 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="h-4 w-4" aria-hidden="true" />Check before placing</p>
            <ul className="mt-1 list-disc pl-6 text-sm text-foreground">{data.flags.map(flag => <li key={flag}>{PLACEMENT_FLAG_LABELS[flag] ?? flag}</li>)}</ul>
          </div>}
          {data.otherAttempts.length > 0 && <p className="mt-4 text-sm text-muted-foreground">Same phone or email also submitted: {data.otherAttempts.map((a, i) => <span key={a.id}>{i > 0 && ', '}<Link className="text-primary underline underline-offset-4" to={`/placement-results/${a.id}`}>{a.referenceNo}</Link></span>)}</p>}
        </section>

        <section className="rounded-sm border border-border bg-card p-5 shadow-sm" aria-labelledby="writing-title">
          <h2 id="writing-title" className="text-lg font-semibold">Writing sample <span className="text-sm font-normal text-muted-foreground">· {words} words</span></h2>
          <p className="mt-1 text-sm text-muted-foreground">{data.writingPrompt}</p>
          <div className="mt-3 whitespace-pre-wrap rounded-sm border border-border bg-background p-4 text-[15px] leading-relaxed">{data.writingSample || <span className="text-muted-foreground">No writing was submitted.</span>}</div>
        </section>

        <section className="rounded-sm border border-border bg-card p-5 shadow-sm" aria-labelledby="answers-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="answers-title" className="text-lg font-semibold">{showAll ? 'All answers' : 'Missed and blank questions'}</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAll(v => !v)}>{showAll ? 'Show missed only' : 'Show all answers'}</Button>
          </div>
          {data.review.length === 0 && <p className="mt-3 text-sm text-muted-foreground">This test was taken on an older version, so answer-by-answer review is not available. Scores above are still valid.</p>}
          <div className="mt-2 space-y-6">
            {reviewBySection.filter(group => group.items.length > 0).map(group => <div key={group.section.id}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.section.title}</h3>
              <ol className="space-y-2">
                {group.items.map(item => <li key={item.id} className="rounded-sm border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="rounded-sm bg-muted px-1.5 py-0.5 font-medium">{PLACEMENT_BAND_LABELS[item.band]}</span><span>{item.skill}</span>{item.passageTitle && <span>· Passage: {item.passageTitle}</span>}</div>
                  <p className="mt-1.5 whitespace-pre-line text-sm font-medium">{item.prompt}</p>
                  <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                    {item.options.map((option, i) => {
                      const isCorrect = i === item.correctIndex;
                      const isChosen = i === item.chosenIndex;
                      return <li key={i} className={`flex items-start gap-1.5 rounded-sm px-2 py-1 ${isCorrect ? 'bg-success/10 text-foreground' : isChosen ? 'bg-destructive/10 text-foreground' : 'text-muted-foreground'}`}>
                        {isCorrect ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="correct answer" /> : isChosen ? <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-label="chosen answer" /> : <span className="w-4 shrink-0" />}
                        <span>{option}{isChosen && <span className="sr-only"> (chosen)</span>}</span>
                      </li>;
                    })}
                  </ul>
                  {item.chosenIndex === null && <p className="mt-1 text-xs font-medium text-warning">Left blank</p>}
                </li>)}
              </ol>
            </div>)}
            {data.review.length > 0 && !showAll && reviewBySection.every(group => group.items.length === 0) && <p className="text-sm text-muted-foreground">Every question was answered correctly.</p>}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-sm border border-border bg-card p-5 shadow-sm" aria-labelledby="decision-title">
          <h2 id="decision-title" className="text-lg font-semibold">Teacher placement</h2>
          <p className="mt-1 text-sm text-muted-foreground">Confirm or change the recommendation after reading the scores, the writing and, where possible, a short conversation.</p>
          <fieldset className="mt-4">
            <legend className="text-sm font-medium">Class</legend>
            <div className="mt-2 grid gap-2">
              {PLACEMENT_LEVELS.slice().reverse().map(level => <label key={level} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border px-3 text-sm ${finalLevel === level ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="final-level" value={level} checked={finalLevel === level} onChange={() => setFinalLevel(level)} className="h-4 w-4 accent-[var(--primary)]" />
                <span className="font-medium">{PLACEMENT_LEVEL_LABELS[level]}</span>
                {level === data.recommendedLevel && <span className="ml-auto text-xs text-muted-foreground">Recommended</span>}
              </label>)}
              <label className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border px-3 text-sm ${finalLevel === '' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="final-level" value="" checked={finalLevel === ''} onChange={() => setFinalLevel('')} className="h-4 w-4 accent-[var(--primary)]" />
                <span>Not decided yet</span>
              </label>
            </div>
          </fieldset>
          <div className="mt-4">
            <label htmlFor="writing-rating" className="text-sm font-medium">Writing</label>
            <select id="writing-rating" value={writingRating} onChange={event => setWritingRating(event.target.value as WritingRating)} aria-describedby="writing-rating-hint" className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {writingOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p id="writing-rating-hint" className="mt-1.5 text-xs text-muted-foreground">{writingOptions.find(o => o.value === writingRating)?.hint || 'Rate the writing sample after reading it.'}</p>
          </div>
          <div className="mt-4">
            <label htmlFor="review-status" className="text-sm font-medium">Status</label>
            <select id="review-status" value={status} onChange={event => setStatus(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {PLACEMENT_STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>
          </div>
          <div className="mt-4">
            <label htmlFor="review-notes" className="text-sm font-medium">Notes</label>
            <Textarea id="review-notes" value={notes} onChange={event => setNotes(event.target.value)} rows={4} maxLength={4000} className="mt-1.5" placeholder="Interview notes, language support needs, class suggestion" />
          </div>
          <Button type="button" className="mt-4 w-full" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save placement</Button>
          {data.reviewedByName && <p className="mt-2 text-xs text-muted-foreground">Last reviewed by {data.reviewedByName}{data.reviewedAt ? ` on ${new Date(data.reviewedAt).toLocaleDateString('en-MY', { dateStyle: 'medium' })}` : ''}</p>}
        </section>

        <section className="rounded-sm border border-border bg-card p-5 shadow-sm" aria-labelledby="email-title">
          <h2 id="email-title" className="text-lg font-semibold">Email the result</h2>
          <p className="mt-1 break-all text-sm text-muted-foreground">To {data.email}</p>
          {!data.emailConfigured && <p className="mt-3 flex items-start gap-2 rounded-sm border border-warning/40 bg-warning/5 p-2.5 text-xs text-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />School email is not set up on this server, so emails wait in the outbox until it is.</p>}
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Receipt</dt><dd className="text-right">{emailStatusText(data.receiptEmail)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Result</dt><dd className="text-right">{data.decisionEmailedAt ? <>{emailStatusText(data.decisionEmail)}<span className="block text-xs text-muted-foreground">{data.decisionEmailedLevel ? PLACEMENT_LEVEL_LABELS[data.decisionEmailedLevel] : ''} · by {data.decisionEmailedByName}</span></> : 'Not sent'}</dd></div>
          </dl>
          {data.decisionEmail?.lastError && <p className="mt-2 text-xs text-destructive">Last error: {data.decisionEmail.lastError}</p>}
          {!data.finalLevel
            ? <p className="mt-3 text-xs text-muted-foreground">Choose a class and save the placement first.</p>
            : finalLevel !== data.finalLevel
              ? <p className="mt-3 text-xs text-muted-foreground">Save your change to the class before emailing.</p>
              : !confirmingEmail
                ? <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => setConfirmingEmail(true)}><Mail className="mr-2 h-4 w-4" />{data.decisionEmailedAt ? 'Email the result again' : 'Email the result'}</Button>
                : <div className="mt-3 space-y-3 rounded-sm border border-border bg-background p-3">
                  <p className="text-sm">The email will say the class is <strong>{PLACEMENT_LEVEL_CLASS_NAMES[data.finalLevel]}</strong>. Your internal notes are not included.</p>
                  <div>
                    <label htmlFor="email-message" className="text-sm font-medium">Message to the applicant <span className="font-normal text-muted-foreground">optional</span></label>
                    <Textarea id="email-message" value={emailMessage} onChange={event => setEmailMessage(event.target.value)} rows={3} maxLength={1500} className="mt-1.5" placeholder="For example: Please come to the school office on Monday at 9 am with your UNHCR card." />
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeScores} onChange={event => setIncludeScores(event.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />Include scores by subject</label>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setConfirmingEmail(false)} disabled={emailing}>Cancel</Button>
                    <Button type="button" className="flex-1" onClick={() => void sendDecision()} disabled={emailing}>{emailing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send email</Button>
                  </div>
                </div>}
        </section>

        <section className="rounded-sm border border-border bg-card p-5 shadow-sm" aria-labelledby="admission-title">
          <h2 id="admission-title" className="text-lg font-semibold">Admission</h2>
          {data.admissionApplicationId
            ? <p className="mt-1 text-sm text-muted-foreground">An admission application exists for this learner. <Link to={`/admissions/${data.admissionApplicationId}`} className="text-primary underline underline-offset-4">Open application</Link></p>
            : data.canCreateAdmission
              ? <>
                <p className="mt-1 text-sm text-muted-foreground">Create an admission application with this learner’s name, contact and placement. Documents and guardian details are added in Admissions.</p>
                <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void createAdmission()} disabled={creating || !finalLevel}>{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}Create admission application</Button>
                {!finalLevel && <p className="mt-2 text-xs text-muted-foreground">Choose a class first.</p>}
              </>
              : <p className="mt-1 text-sm text-muted-foreground">Admissions staff create the application after the teacher confirms a class.</p>}
        </section>

        <div className="flex items-center justify-between gap-3 px-1 text-sm">
          <span className="text-muted-foreground">{data.status === 'ARCHIVED' ? 'This test is archived.' : 'Hide this test from the open list.'}</span>
          <Button type="button" variant="outline" onClick={() => void toggleArchive()} disabled={archiving}>{archiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : data.status === 'ARCHIVED' ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}{data.status === 'ARCHIVED' ? 'Restore' : 'Archive'}</Button>
        </div>
      </aside>
    </div>
  </div>;
}
