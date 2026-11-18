import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, ArrowRight, ClipboardCheck, Clock, Loader2, Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { apiGet } from '../../lib/api';
import { DEFAULT_THRESHOLDS, PLACEMENT_BANDS, PLACEMENT_BAND_LABELS, PLACEMENT_FLAG_LABELS, PLACEMENT_LEVEL_LABELS, PLACEMENT_SECTIONS, PLACEMENT_WRITING_PROMPT, scorePlacement, type PlacementBand, type PlacementSectionId, type PlacementThresholds } from '../../../shared/placementTest';
import { LevelBadge } from './placementShared';
import { StudentQuestionPreview } from './placementEditing';

interface BankQuestion { id: string; section: PlacementSectionId; band: PlacementBand; skill: string; passageId: string | null; prompt: string; options: string[]; answer: number; sortOrder: number; active: boolean }
interface BankPassage { id: string; title: string; body: string[] }
interface FormDetail { form: { id: string; name: string; hasChanges: boolean; latest: { version: number } | null }; questions: BankQuestion[]; passages: BankPassage[]; canEdit: boolean }

type Part = PlacementSectionId | 'WRITING' | 'RESULT';
const PARTS: Part[] = [...PLACEMENT_SECTIONS.map(s => s.id), 'WRITING', 'RESULT'];
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function PlacementFormPreview() {
  const { formId = '' } = useParams();
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [error, setError] = useState('');
  const [sectionId, setSectionIdRaw] = useState<Part>('RLA');
  const [thresholds, setThresholds] = useState<PlacementThresholds>(DEFAULT_THRESHOLDS);
  const [limitMinutes, setLimitMinutes] = useState(90);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [writing, setWriting] = useState('');
  const setSectionId = (part: Part) => { setSectionIdRaw(part); window.scrollTo({ top: 0 }); };
  const [showAnswers, setShowAnswers] = useState(false);
  const [chosen, setChosen] = useState<Record<string, number>>({});

  useEffect(() => {
    apiGet<FormDetail>(`/api/placement-bank/forms/${formId}`).then(setDetail).catch(err => setError(err.message || 'This form could not load'));
  }, [formId]);

  useEffect(() => {
    apiGet<{ foundationMastery: number; preGedMastery: number; gedMastery: number; timeLimitMinutes?: number }>('/api/placement-settings')
      .then(s => { setThresholds({ FOUNDATION: s.foundationMastery, PRE_GED: s.preGedMastery, GED: s.gedMastery }); if (s.timeLimitMinutes) setLimitMinutes(s.timeLimitMinutes); })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const ordered = useMemo(() => {
    const bandRank = (b: PlacementBand) => PLACEMENT_BANDS.indexOf(b);
    return (detail?.questions ?? []).filter(q => q.active).sort((a, b) => PLACEMENT_SECTIONS.findIndex(s => s.id === a.section) - PLACEMENT_SECTIONS.findIndex(s => s.id === b.section) || bandRank(a.band) - bandRank(b.band) || a.sortOrder - b.sortOrder);
  }, [detail]);
  const passages = useMemo(() => new Map((detail?.passages ?? []).map(p => [p.id, p])), [detail]);
  const result = useMemo(() => detail ? scorePlacement(chosen, {
    snapshot: { versionId: 'preview', form: detail.form.id, version: 0, passages: detail.passages, questions: ordered.map(q => ({ id: q.id, form: detail.form.id, section: q.section, band: q.band, skill: q.skill, passageId: q.passageId ?? undefined, prompt: q.prompt, options: q.options, answer: q.answer })) },
    thresholds,
    writingSample: writing,
  }) : null, [detail, ordered, chosen, thresholds, writing]);
  const choose = (id: string, value: number) => { if (!startedAt) setStartedAt(Date.now()); setChosen(prev => ({ ...prev, [id]: value })); };
  const restart = () => { setChosen({}); setWriting(''); setStartedAt(null); setSectionId('RLA'); };

  if (error) return <div className="mx-auto max-w-3xl space-y-4"><Link to="/placement-results/questions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Question bank</Link><p className="flex items-center gap-2 text-destructive" role="alert"><AlertTriangle className="h-4 w-4" />{error}</p></div>;
  if (!detail) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading the preview</div>;

  const section = PLACEMENT_SECTIONS.find(s => s.id === sectionId);
  const inSection = ordered.filter(q => q.section === sectionId);
  const answered = Object.keys(chosen).filter(id => ordered.some(q => q.id === id)).length;
  const right = ordered.filter(q => chosen[q.id] === q.answer).length;
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const partIndex = PARTS.indexOf(sectionId);
  const nextPart = PARTS[partIndex + 1];
  const partLabel = (part: Part) => part === 'WRITING' ? 'Writing' : part === 'RESULT' ? 'Result' : PLACEMENT_SECTIONS.find(s => s.id === part)?.shortTitle ?? part;
  const tab = (active: boolean) => `min-h-10 rounded-sm px-3 text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`;
  const backTo = `/placement-results/questions?form=${detail.form.id}`;

  return <div className="mx-auto max-w-6xl">
    <div className="space-y-1">
      <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Question bank · {detail.form.name}</Link>
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Preview {detail.form.name} as a student</h1>
      <p className="max-w-3xl text-sm text-muted-foreground">Take the current draft{detail.form.hasChanges && detail.form.latest ? `, which differs from live version ${detail.form.latest.version},` : ''} the way a newcomer does, then open Result to see the class it would recommend with today’s cut-offs. Nothing you do here is saved or counted in question history.</p>
    </div>

    <div className="sticky top-0 z-10 -mx-4 mt-5 border-y border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Test parts" className="flex flex-wrap gap-1">
          {PLACEMENT_SECTIONS.map(s => {
            const count = ordered.filter(q => q.section === s.id).length;
            const done = ordered.filter(q => q.section === s.id && chosen[q.id] !== undefined).length;
            return <button key={s.id} type="button" aria-pressed={sectionId === s.id} onClick={() => setSectionId(s.id)} className={tab(sectionId === s.id)}>{s.shortTitle} <span className="tabular-nums opacity-80">{done}/{count}</span></button>;
          })}
          <button type="button" aria-pressed={sectionId === 'WRITING'} onClick={() => setSectionId('WRITING')} className={tab(sectionId === 'WRITING')}>Writing</button>
          <button type="button" aria-pressed={sectionId === 'RESULT'} onClick={() => setSectionId('RESULT')} className={tab(sectionId === 'RESULT')}><ClipboardCheck className="mr-1.5 inline h-4 w-4 align-[-3px]" aria-hidden="true" />Result</button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground"><Clock className="h-4 w-4" aria-hidden="true" />{startedAt ? `${clock(elapsed)} of ${limitMinutes}:00` : `${limitMinutes} min`}</span>
          <span className="tabular-nums text-muted-foreground">{answered} of {ordered.length} answered{showAnswers && answered ? ` · ${right} right` : ''}</span>
          {(answered > 0 || writing) && <Button type="button" variant="ghost" size="sm" onClick={restart}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Start again</Button>}
          <label className="flex items-center gap-2"><Switch checked={showAnswers} onCheckedChange={checked => setShowAnswers(Boolean(checked))} />Show answers</label>
        </div>
      </div>
    </div>

    <div className="mt-6 pb-16">
      {sectionId === 'RESULT' && result ? <section aria-labelledby="result-title" className="max-w-4xl">
        <h2 id="result-title" className="text-xl font-semibold">Result of this preview</h2>
        <p className="mt-1 text-sm text-muted-foreground">Scored the same way as a real test, using the current cut-offs ({thresholds.FOUNDATION}% Foundation, {thresholds.PRE_GED}% Pre-GED, {thresholds.GED}% GED). A level counts only when every easier level is also passed.</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-y border-border py-4">
          <div><p className="text-xs text-muted-foreground">Recommended class</p><div className="mt-1"><LevelBadge level={result.recommendedLevel} /></div></div>
          <div><p className="text-xs text-muted-foreground">Score</p><p className="text-xl font-semibold tabular-nums">{result.totalCorrect} / {result.totalQuestions}</p></div>
          <div><p className="text-xs text-muted-foreground">Answered</p><p className="text-xl font-semibold tabular-nums">{result.answered}</p></div>
          {startedAt && <div><p className="text-xs text-muted-foreground">Time used</p><p className="text-xl font-semibold tabular-nums">{clock(elapsed)}</p></div>}
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2 pr-4 font-medium">Subject</th>{PLACEMENT_BANDS.map(b => <th key={b} className="py-2 pr-4 text-right font-medium">{PLACEMENT_BAND_LABELS[b]}</th>)}<th className="py-2 text-right font-medium">Level</th></tr></thead>
            <tbody>{result.sections.map(sec => <tr key={sec.section} className="border-t border-border">
              <td className="py-2.5 pr-4 font-medium">{PLACEMENT_SECTIONS.find(s => s.id === sec.section)?.title}</td>
              {sec.bands.map(b => <td key={b.band} className={`py-2.5 pr-4 text-right tabular-nums ${b.mastered ? 'text-success' : 'text-muted-foreground'}`}>{b.correct}/{b.total}<span className="sr-only">{b.mastered ? ', passed' : ', not passed'}</span></td>)}
              <td className="py-2.5 text-right">{PLACEMENT_LEVEL_LABELS[sec.level]}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">The class comes from Reading and Math. Science or Social Studies below Pre-GED lowers a GED result to Pre-GED. Teachers still read the writing and make the final decision.</p>
        {result.flags.length > 0 && <p className="mt-3 text-sm text-warning">A real test like this would be flagged for review: {result.flags.map(f => PLACEMENT_FLAG_LABELS[f] ?? f).join('; ')}.</p>}
        {answered === 0 && <p className="mt-4 text-sm"><button type="button" className="font-medium text-primary underline underline-offset-4" onClick={() => setSectionId('RLA')}>Start with Reading</button> to see a result.</p>}
      </section> : sectionId === 'WRITING' ? <section aria-labelledby="writing-title" className="max-w-3xl space-y-3">
        <h2 id="writing-title" className="text-xl font-semibold">{PLACEMENT_WRITING_PROMPT.title}</h2>
        <p className="text-base leading-relaxed">{PLACEMENT_WRITING_PROMPT.prompt}</p>
        <p className="text-sm text-muted-foreground">{PLACEMENT_WRITING_PROMPT.help}</p>
        <label htmlFor="preview-writing" className="sr-only">Your writing</label>
        <textarea id="preview-writing" value={writing} onChange={event => { if (!startedAt) setStartedAt(Date.now()); setWriting(event.target.value); }} rows={9} maxLength={PLACEMENT_WRITING_PROMPT.maxLength} className="w-full rounded-md border border-input bg-background p-3 text-base leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
        <p className="text-xs text-muted-foreground">The writing task is the same on every form and is not edited in the question bank.</p>
      </section> : <section aria-labelledby="part-title">
        <h2 id="part-title" className="text-xl font-semibold">{section?.title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{section?.description}</p>
        {inSection.length === 0 && <p className="mt-6 text-sm text-destructive">This part has no questions in the draft.</p>}
        <div className="mt-6 space-y-8">
          {inSection.map((q, i) => {
            const passage = q.passageId ? passages.get(q.passageId) ?? null : null;
            const firstOfPassage = passage && inSection.findIndex(other => other.passageId === q.passageId) === i;
            return <article key={q.id} id={`q-${q.id}`} aria-label={`Question ${i + 1}`} className="scroll-mt-20">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{PLACEMENT_BAND_LABELS[q.band]} · {q.skill}{passage && !firstOfPassage ? ` · Uses “${passage.title}” above` : ''}</span>
                {detail.canEdit && <Link to={`/placement-results/questions/${detail.form.id}/questions/${q.id}`} className="inline-flex min-h-8 items-center gap-1.5 rounded-sm px-2 font-medium text-foreground hover:bg-muted"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Edit<span className="sr-only"> question {i + 1}</span></Link>}
              </div>
              <div className="pt-embed-wide">
                <StudentQuestionPreview id={q.id} number={i + 1} prompt={q.prompt} options={q.options} answer={q.answer} passage={firstOfPassage ? passage : null} showAnswer={showAnswers} chosen={chosen[q.id]} onChoose={value => choose(q.id, value)} />
              </div>
              {showAnswers && chosen[q.id] !== undefined && chosen[q.id] !== q.answer && <p className="mt-2 text-sm font-medium text-destructive">Not the correct answer.</p>}
            </article>;
          })}
        </div>
      </section>}
      {nextPart && <div className="mt-10 flex justify-end border-t border-border pt-5">
        <Button type="button" onClick={() => setSectionId(nextPart)}>{nextPart === 'RESULT' ? 'See the result' : `Next: ${partLabel(nextPart)}`}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button>
      </div>}
    </div>
  </div>;
}
