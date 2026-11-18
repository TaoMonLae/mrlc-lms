import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, ClipboardCheck, Copy, ExternalLink, Loader2, MailCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, qs } from '../../lib/api';
import { PLACEMENT_LEVEL_LABELS, PLACEMENT_LEVELS, PLACEMENT_SECTIONS, type PlacementLevel, type SectionScore } from '../../../shared/placementTest';

interface PlacementRow {
  id: string;
  referenceNo: string;
  fullName: string;
  contactNumber: string;
  email: string;
  formId: string;
  age: number | null;
  totalCorrect: number;
  totalQuestions: number;
  recommendedLevel: PlacementLevel;
  finalLevel: PlacementLevel | null;
  status: string;
  flags: string[];
  sectionScores: SectionScore[];
  submittedAt: string;
  reviewedByName: string | null;
  admissionApplicationId: string | null;
  decisionEmailedAt: string | null;
}

const statusTabs = [
  { value: '', label: 'Open' },
  { value: 'NEW', label: 'New' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'ARCHIVED', label: 'Archived' },
  { value: 'any', label: 'All' },
];

export const levelTone: Record<PlacementLevel, string> = {
  GED: 'border-success/50 bg-success/10 text-foreground',
  PRE_GED: 'border-primary/50 bg-primary/10 text-foreground',
  BELOW_PRE_GED: 'border-warning/50 bg-warning/10 text-foreground',
};

export function LevelBadge({ level, muted }: { level: PlacementLevel; muted?: boolean }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-semibold ${muted ? 'border-border bg-transparent text-muted-foreground' : levelTone[level]}`}>{PLACEMENT_LEVEL_LABELS[level]}</span>;
}

export const statusLabel: Record<string, string> = { NEW: 'New', REVIEWED: 'Reviewed', CONTACTED: 'Contacted', ARCHIVED: 'Archived' };

const sectionShort = Object.fromEntries(PLACEMENT_SECTIONS.map(s => [s.id, s.shortTitle === 'Social Studies' ? 'Soc.' : s.shortTitle]));

export default function PlacementResults() {
  const [rows, setRows] = useState<PlacementRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [level, setLevel] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async (q = query) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<{ items: PlacementRow[]; counts: Record<string, number> }>(`/api/placement-tests${qs({ status, level, q })}`);
      setRows(data.items);
      setCounts(data.counts);
    } catch (err: any) {
      setError(err.message || 'Placement tests could not load');
    } finally {
      setLoading(false);
    }
  }, [status, level, query]);

  useEffect(() => { void load(); }, [status, level]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    void load(query);
  };

  const publicLink = `${window.location.origin}/placement-test`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicLink);
      toast.success('Placement test link copied');
    } catch {
      toast.error('Copy failed. The link is ' + publicLink);
    }
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Placement tests</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Results from newcomers who took the public placement test. The level shown is a recommendation from the scores; a teacher confirms the class.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void copyLink()}><Copy className="mr-2 h-4 w-4" />Copy test link</Button>
        <a href="/placement-test" target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'outline' })}><ExternalLink className="mr-2 h-4 w-4" />Open test</a>
      </div>
    </div>

    <div className="rounded-sm border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {statusTabs.map(tab => {
            const count = tab.value === '' ? (counts.NEW ?? 0) + (counts.REVIEWED ?? 0) + (counts.CONTACTED ?? 0) : tab.value === 'any' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[tab.value] ?? 0;
            return <button key={tab.label} type="button" aria-pressed={status === tab.value} onClick={() => setStatus(tab.value)} className={`min-h-9 rounded-sm px-3 text-sm font-medium ${status === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{tab.label} <span className="tabular-nums opacity-80">{count}</span></button>;
          })}
        </div>
        <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="placement-level">Level</label>
          <select id="placement-level" value={level} onChange={event => setLevel(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All levels</option>
            {PLACEMENT_LEVELS.map(l => <option key={l} value={l}>{PLACEMENT_LEVEL_LABELS[l]}</option>)}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, phone or reference" className="pl-9 sm:w-64" aria-label="Search placement tests" />
          </div>
          <Button type="submit" variant="outline">Search</Button>
        </form>
      </div>

      {error && <div className="flex items-center gap-2 p-6 text-sm text-destructive" role="alert"><AlertTriangle className="h-4 w-4" />{error}<Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => void load()}>Retry</Button></div>}
      {loading && !error && <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading placement tests</div>}
      {!loading && !error && rows.length === 0 && <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <ClipboardCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium text-foreground">No placement tests here yet</p>
        <p className="max-w-md text-sm text-muted-foreground">Share the test link with newcomers. Each finished test appears here with a recommended level.</p>
      </div>}
      {!loading && !error && rows.length > 0 && <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Applicant</th>
              <th className="px-4 py-3 font-semibold">Submitted</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">By subject</th>
              <th className="px-4 py-3 font-semibold">Recommended</th>
              <th className="px-4 py-3 font-semibold">Placed</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/40">
              <td className="px-4 py-3">
                <Link to={`/placement-results/${row.id}`} className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline">{row.fullName}</Link>
                <div className="text-xs text-muted-foreground">{row.contactNumber} · {row.referenceNo} · Form {row.formId}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(row.submittedAt).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              <td className="px-4 py-3 tabular-nums">{row.totalCorrect}/{row.totalQuestions}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">{(row.sectionScores || []).map(s => <span key={s.section} title={`${s.section}: ${PLACEMENT_LEVEL_LABELS[s.level]}`} className={`rounded-sm border px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${levelTone[s.level]}`}>{sectionShort[s.section]} {s.correct}/{s.total}</span>)}</div>
              </td>
              <td className="px-4 py-3"><div className="flex items-center gap-1.5"><LevelBadge level={row.recommendedLevel} muted={!!row.finalLevel} />{row.flags.length > 0 && <span title={`${row.flags.length} item(s) to check`} className="inline-flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /><span className="sr-only">{row.flags.length} items to check</span>{row.flags.length}</span>}</div></td>
              <td className="px-4 py-3">{row.finalLevel ? <LevelBadge level={row.finalLevel} /> : <span className="text-muted-foreground">Not yet</span>}</td>
              <td className="px-4 py-3"><span className="text-sm">{statusLabel[row.status] ?? row.status}</span>{row.decisionEmailedAt && <div className="flex items-center gap-1 text-xs text-muted-foreground"><MailCheck className="h-3.5 w-3.5" aria-hidden="true" />Result emailed</div>}{row.admissionApplicationId && <div className="text-xs text-muted-foreground">Admission created</div>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </div>
  </div>;
}
