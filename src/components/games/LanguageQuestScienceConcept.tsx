import { Atom, BookOpenCheck, FileText, FlaskConical, Image as ImageIcon, Landmark, Lightbulb, Microscope, ScrollText, Sigma, Target, TrendingUp } from 'lucide-react';

const SCIENCE_V2_PREFIX = 'SCIENCE_V2::';
const SOCIAL_STUDIES_V1_PREFIX = 'SOCIAL_STUDIES_V1::';
const RLA_V1_PREFIX = 'RLA_V1::';

type ScienceLabel = { marker: string; text: string };
type ScienceTableVisual = { type: 'table'; title: string; headers: string[]; rows: string[][]; caption?: string };
type ScienceProcessVisual = { type: 'process'; title: string; steps: string[]; caption?: string };
type ScienceImageVisual = { type: 'image'; title: string; src: string; alt: string; labels?: ScienceLabel[]; caption?: string };
type ScienceFormulaVisual = { type: 'formula'; title: string; formula: string; variables?: ScienceLabel[]; example?: string };
type ScienceBarVisual = { type: 'bar'; title: string; items: { label: string; value: number; unit?: string }[]; caption?: string };
type ScienceLineVisual = { type: 'line'; title: string; points: { x: number; y: number; label?: string }[]; xLabel: string; yLabel: string; caption?: string };
type ScienceLayersVisual = { type: 'layers'; title: string; layers: { name: string; detail: string }[]; caption?: string };
type ScienceCompareVisual = { type: 'compare'; title: string; leftTitle: string; rightTitle: string; left: string[]; shared?: string[]; right: string[] };
type ScienceEvidenceVisual = { type: 'evidence'; title: string; claim: string; evidence: string[]; reasoning: string };
type ReadingPassageVisual = { type: 'passage'; title: string; text: string; attribution?: string; kind?: 'informational' | 'literary' | 'argument' | 'editing' };

export type ScienceVisual =
  | ScienceTableVisual
  | ScienceProcessVisual
  | ScienceImageVisual
  | ScienceFormulaVisual
  | ScienceBarVisual
  | ScienceLineVisual
  | ScienceLayersVisual
  | ScienceCompareVisual
  | ScienceEvidenceVisual
  | ReadingPassageVisual;

export interface ScienceConceptDocument {
  version: 1 | 2;
  subject?: 'science' | 'social-studies' | 'rla';
  sourceType?: 'informational' | 'literary' | 'argument' | 'editing';
  summary: string;
  objectives: string[];
  explanation: string[];
  keyTerms?: ScienceLabel[];
  visual?: ScienceVisual;
  gedStrategy?: string;
  checkpoint?: string;
}

export function encodeScienceConcept(document: ScienceConceptDocument): string {
  return `${SCIENCE_V2_PREFIX}${JSON.stringify(document)}`;
}

export function parseScienceConcept(source: string): ScienceConceptDocument | null {
  const prefix = source.startsWith(SCIENCE_V2_PREFIX)
    ? SCIENCE_V2_PREFIX
    : source.startsWith(SOCIAL_STUDIES_V1_PREFIX)
      ? SOCIAL_STUDIES_V1_PREFIX
      : source.startsWith(RLA_V1_PREFIX)
        ? RLA_V1_PREFIX
      : null;
  if (!prefix) return null;
  try {
    const parsed = JSON.parse(source.slice(prefix.length)) as ScienceConceptDocument;
    if (![1, 2].includes(parsed?.version) || !Array.isArray(parsed.objectives) || !Array.isArray(parsed.explanation)) return null;
    return {
      ...parsed,
      subject: prefix === SOCIAL_STUDIES_V1_PREFIX
        ? 'social-studies'
        : prefix === RLA_V1_PREFIX
          ? 'rla'
          : (parsed.subject || 'science'),
    };
  } catch {
    return null;
  }
}

function PlainConcept({ source }: { source: string }) {
  return (
    <div className="space-y-4">
      {source.split(/\n{2,}/).map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex} className="whitespace-pre-line text-sm leading-7 text-slate-700 dark:text-slate-200">{paragraph}</p>
      ))}
    </div>
  );
}

function ImageVisual({ visual }: { visual: ScienceImageVisual }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/60">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-800 dark:text-white">
        <ImageIcon className="h-4 w-4 text-sky-600" /> {visual.title}
      </div>
      <div className="bg-slate-50 p-3 dark:bg-slate-900/70 sm:p-5">
        <img src={visual.src} alt={visual.alt} className="mx-auto max-h-[360px] w-full object-contain" />
      </div>
      {(visual.labels?.length || visual.caption) && (
        <figcaption className="space-y-3 p-4">
          {visual.labels?.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {visual.labels.map((label) => (
                <div key={`${label.marker}-${label.text}`} className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sky-600 text-[10px] font-black text-white">{label.marker}</span>
                  <span>{label.text}</span>
                </div>
              ))}
            </div>
          ) : null}
          {visual.caption ? <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{visual.caption}</p> : null}
        </figcaption>
      )}
    </figure>
  );
}

function TableVisual({ visual }: { visual: ScienceTableVisual }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950/60">
      <div className="border-b border-slate-100 px-4 py-3 text-sm font-black text-slate-900 dark:border-slate-800 dark:text-white">{visual.title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left text-xs sm:text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>{visual.headers.map((header) => <th key={header} className="border-b border-slate-200 px-4 py-3 font-black text-slate-700 dark:border-slate-700 dark:text-slate-200">{header}</th>)}</tr>
          </thead>
          <tbody>{visual.rows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-slate-100 last:border-0 dark:border-slate-800">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700 dark:text-slate-200">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      {visual.caption ? <figcaption className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">{visual.caption}</figcaption> : null}
    </figure>
  );
}

function ProcessVisual({ visual }: { visual: ScienceProcessVisual }) {
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60 sm:p-5">
      <figcaption className="mb-4 text-sm font-black text-slate-900 dark:text-white">{visual.title}</figcaption>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        {visual.steps.map((step, index) => (
          <div key={`${step}-${index}`} className="flex flex-1 items-center gap-2 sm:flex-col">
            <div className="flex min-h-16 flex-1 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center text-xs font-bold leading-5 text-slate-800 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-slate-100">{step}</div>
            {index + 1 < visual.steps.length ? <span className="shrink-0 rotate-90 text-lg font-black text-sky-600 sm:rotate-0">→</span> : null}
          </div>
        ))}
      </div>
      {visual.caption ? <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{visual.caption}</p> : null}
    </figure>
  );
}

function FormulaVisual({ visual }: { visual: ScienceFormulaVisual }) {
  return (
    <figure className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-500/25 dark:bg-violet-500/10">
      <figcaption className="flex items-center gap-2 text-sm font-black text-violet-900 dark:text-violet-100"><Sigma className="h-4 w-4" /> {visual.title}</figcaption>
      <div className="my-4 overflow-x-auto rounded-xl bg-white px-4 py-5 text-center font-mono text-xl font-black text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white">{visual.formula}</div>
      {visual.variables?.length ? <div className="grid gap-2 sm:grid-cols-2">{visual.variables.map((item) => <div key={item.marker} className="text-xs leading-5 text-slate-700 dark:text-slate-200"><strong>{item.marker}</strong> — {item.text}</div>)}</div> : null}
      {visual.example ? <p className="mt-4 rounded-xl bg-white/80 px-4 py-3 text-xs font-semibold leading-5 text-slate-700 dark:bg-slate-950/50 dark:text-slate-200"><strong>Worked example:</strong> {visual.example}</p> : null}
    </figure>
  );
}

function BarVisual({ visual }: { visual: ScienceBarVisual }) {
  const max = Math.max(...visual.items.map((item) => Math.abs(item.value)), 1);
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60 sm:p-5">
      <figcaption className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><TrendingUp className="h-4 w-4 text-emerald-600" /> {visual.title}</figcaption>
      <div className="space-y-3">{visual.items.map((item) => <div key={item.label} className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 text-xs"><span className="font-bold text-slate-700 dark:text-slate-200">{item.label}</span><div className="h-5 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-md bg-emerald-500/80" style={{ width: `${Math.max(3, Math.abs(item.value) / max * 100)}%` }} /></div><span className="font-mono font-bold text-slate-600 dark:text-slate-300">{item.value}{item.unit || ''}</span></div>)}</div>
      {visual.caption ? <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">{visual.caption}</p> : null}
    </figure>
  );
}

function LineVisual({ visual }: { visual: ScienceLineVisual }) {
  const width = 520;
  const height = 260;
  const pad = 42;
  const xs = visual.points.map((point) => point.x);
  const ys = visual.points.map((point) => point.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const sx = (x: number) => pad + ((x - minX) / Math.max(1, maxX - minX)) * (width - pad * 2);
  const sy = (y: number) => height - pad - ((y - minY) / Math.max(1, maxY - minY)) * (height - pad * 2);
  const points = visual.points.map((point) => `${sx(point.x)},${sy(point.y)}`).join(' ');
  return (
    <figure className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60 sm:p-5">
      <figcaption className="mb-3 text-sm font-black text-slate-900 dark:text-white">{visual.title}</figcaption>
      <div className="overflow-x-auto"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${visual.title}. ${visual.xLabel} by ${visual.yLabel}.`} className="min-w-[420px] w-full"><line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="currentColor" className="text-slate-400" /><line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="currentColor" className="text-slate-400" /><polyline points={points} fill="none" stroke="currentColor" strokeWidth="4" className="text-sky-600" />{visual.points.map((point, index) => <g key={index}><circle cx={sx(point.x)} cy={sy(point.y)} r="6" fill="currentColor" className="text-sky-700 dark:text-sky-300" />{point.label ? <text x={sx(point.x)} y={sy(point.y) - 12} textAnchor="middle" fontSize="11" fill="currentColor" className="text-slate-600 dark:text-slate-300">{point.label}</text> : null}</g>)}<text x={width / 2} y={height - 8} textAnchor="middle" fontSize="12" fill="currentColor" className="text-slate-600 dark:text-slate-300">{visual.xLabel}</text><text x="13" y={height / 2} transform={`rotate(-90 13 ${height / 2})`} textAnchor="middle" fontSize="12" fill="currentColor" className="text-slate-600 dark:text-slate-300">{visual.yLabel}</text></svg></div>
      {visual.caption ? <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{visual.caption}</p> : null}
    </figure>
  );
}

function LayersVisual({ visual }: { visual: ScienceLayersVisual }) {
  return <figure className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60"><figcaption className="mb-4 text-sm font-black text-slate-900 dark:text-white">{visual.title}</figcaption><div className="space-y-2">{visual.layers.map((layer, index) => <div key={layer.name} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900" style={{ marginInline: `${Math.min(index * 12, 42)}px` }}><p className="text-xs font-black text-slate-900 dark:text-white">{layer.name}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{layer.detail}</p></div>)}</div>{visual.caption ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{visual.caption}</p> : null}</figure>;
}

function CompareVisual({ visual }: { visual: ScienceCompareVisual }) {
  const list = (items: string[]) => <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{items.map((item) => <li key={item}>• {item}</li>)}</ul>;
  return <figure className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/60"><figcaption className="mb-4 text-sm font-black text-slate-900 dark:text-white">{visual.title}</figcaption><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-sky-50 p-4 dark:bg-sky-500/10"><p className="text-xs font-black text-sky-900 dark:text-sky-100">{visual.leftTitle}</p>{list(visual.left)}</div><div className="rounded-xl bg-violet-50 p-4 dark:bg-violet-500/10"><p className="text-xs font-black text-violet-900 dark:text-violet-100">Both</p>{list(visual.shared || [])}</div><div className="rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10"><p className="text-xs font-black text-emerald-900 dark:text-emerald-100">{visual.rightTitle}</p>{list(visual.right)}</div></div></figure>;
}

function EvidenceVisual({ visual }: { visual: ScienceEvidenceVisual }) {
  return <figure className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/25 dark:bg-amber-500/10"><figcaption className="mb-3 text-sm font-black text-amber-950 dark:text-amber-100">{visual.title}</figcaption><div className="space-y-3 text-xs leading-5"><div className="rounded-xl bg-white/80 p-3 dark:bg-slate-950/50"><strong>Claim:</strong> {visual.claim}</div><div className="rounded-xl bg-white/80 p-3 dark:bg-slate-950/50"><strong>Evidence:</strong><ul className="mt-1 space-y-1">{visual.evidence.map((item) => <li key={item}>• {item}</li>)}</ul></div><div className="rounded-xl bg-white/80 p-3 dark:bg-slate-950/50"><strong>Reasoning:</strong> {visual.reasoning}</div></div></figure>;
}

function PassageVisual({ visual }: { visual: ReadingPassageVisual }) {
  const label = visual.kind === 'literary'
    ? 'Literary source'
    : visual.kind === 'editing'
      ? 'Editing source'
      : visual.kind === 'argument'
        ? 'Argument source'
        : 'Informational source';
  return (
    <figure className="overflow-hidden rounded-2xl border border-violet-200 bg-white dark:border-violet-500/25 dark:bg-slate-950/60">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 bg-violet-50/70 px-4 py-3 dark:border-violet-500/20 dark:bg-violet-500/10">
        <figcaption className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><FileText className="h-4 w-4 text-violet-600" /> {visual.title}</figcaption>
        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700 shadow-sm dark:bg-slate-950 dark:text-violet-300">{label}</span>
      </div>
      <blockquote className="whitespace-pre-line px-5 py-5 text-sm leading-7 text-slate-700 dark:text-slate-200 sm:px-6">{visual.text}</blockquote>
      {visual.attribution ? <p className="border-t border-violet-100 px-5 py-3 text-xs leading-5 text-slate-500 dark:border-violet-500/20 dark:text-slate-400">{visual.attribution}</p> : null}
    </figure>
  );
}

function ScienceVisualBlock({ visual }: { visual: ScienceVisual }) {
  if (visual.type === 'passage') return <PassageVisual visual={visual} />;
  if (visual.type === 'image') return <ImageVisual visual={visual} />;
  if (visual.type === 'table') return <TableVisual visual={visual} />;
  if (visual.type === 'process') return <ProcessVisual visual={visual} />;
  if (visual.type === 'formula') return <FormulaVisual visual={visual} />;
  if (visual.type === 'bar') return <BarVisual visual={visual} />;
  if (visual.type === 'line') return <LineVisual visual={visual} />;
  if (visual.type === 'layers') return <LayersVisual visual={visual} />;
  if (visual.type === 'compare') return <CompareVisual visual={visual} />;
  return <EvidenceVisual visual={visual} />;
}

export function LanguageQuestScienceConcept({ source }: { source: string }) {
  const document = parseScienceConcept(source);
  if (!document) return <PlainConcept source={source} />;
  const isSocialStudies = document.subject === 'social-studies';
  const isRla = document.subject === 'rla';
  const SubjectIcon = isRla ? BookOpenCheck : isSocialStudies ? Landmark : Microscope;
  const ConceptIcon = isRla ? FileText : isSocialStudies ? ScrollText : Atom;
  const TermsIcon = isRla ? ScrollText : isSocialStudies ? BookOpenCheck : FlaskConical;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-500/25 dark:bg-sky-500/10 sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-600 text-white"><SubjectIcon className="h-5 w-5" /></span><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">{isRla ? 'RLA reading and writing skill' : isSocialStudies ? 'Social studies idea' : 'Science idea'}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{document.summary}</p></div></div>
      </section>

      <section>
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white"><Target className="h-4 w-4 text-violet-600" /> Learning goals</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">{document.objectives.map((objective) => <div key={objective} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold leading-5 text-slate-700 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-200"><BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{objective}</div>)}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/50 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white"><ConceptIcon className="h-4 w-4 text-sky-600" /> Learn the concept</h2>
        <div className="mt-3 space-y-3">{document.explanation.map((paragraph) => <p key={paragraph} className="text-sm leading-7 text-slate-700 dark:text-slate-200">{paragraph}</p>)}</div>
      </section>

      {document.visual ? <ScienceVisualBlock visual={document.visual} /> : null}

      {document.keyTerms?.length ? <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"><h2 className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white"><TermsIcon className="h-4 w-4 text-emerald-600" /> Key terms</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{document.keyTerms.map((term) => <div key={term.marker} className="rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-700 shadow-sm dark:bg-slate-950/60 dark:text-slate-200"><strong>{term.marker}</strong> — {term.text}</div>)}</div></section> : null}

      {document.gedStrategy ? <aside className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/25 dark:bg-amber-500/10"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200"><Lightbulb className="h-4 w-4" /> GED strategy</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{document.gedStrategy}</p></aside> : null}

      {document.checkpoint ? <aside className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-500/25 dark:bg-violet-500/10"><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-800 dark:text-violet-200">Check your understanding</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">{document.checkpoint}</p></aside> : null}
    </div>
  );
}
