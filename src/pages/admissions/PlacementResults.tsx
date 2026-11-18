import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, Archive, ArchiveRestore, ClipboardCheck, Copy, Download, ExternalLink, Loader2, MailCheck, Search, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet, apiSend, qs } from '../../lib/api';
import { PLACEMENT_LEVEL_LABELS, PLACEMENT_LEVELS, PLACEMENT_SECTIONS, type PlacementLevel, type SectionScore } from '../../../shared/placementTest';
import { LevelBadge, PlacementHeader, downloadWithAuth, levelTone, statusLabel } from './placementShared';

export { LevelBadge, statusLabel } from './placementShared';

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

const sectionShort = Object.fromEntries(PLACEMENT_SECTIONS.map(s => [s.id, s.shortTitle === 'Social Studies' ? 'Soc.' : s.shortTitle]));

export default function PlacementResults() {
  const [rows, setRows] = useState<PlacementRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [level, setLevel] = useState('');
  const [form, setForm] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const filters = useMemo(() => ({ status, level, form, from, to }), [status, level, form, from, to]);

  const load = useCallback(async (q = query) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<{ items: PlacementRow[]; counts: Record<string, number> }>(`/api/placement-tests${qs({ ...filters, q })}`);
      setRows(data.items);
      setCounts(data.counts);
      setSelected(prev => new Set([...prev].filter(id => data.items.some(item => item.id === id))));
    } catch (err: any) {
      setError(err.message || 'Placement tests could not load');
    } finally {
      setLoading(false);
    }
  }, [filters, query]);

  useEffect(() => { void load(); }, [filters]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    void load(query);
  };

  const forms = useMemo(() => [...new Set(rows.map(r => r.formId))].sort(), [rows]);
  const allChecked = rows.length > 0 && rows.every(r => selected.has(r.id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map(r => r.id)));
  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const bulk = async (action: 'archive' | 'unarchive' | 'email-results') => {
    if (!selected.size) return;
    if (action === 'email-results' && !window.confirm(`Email the result to ${selected.size} selected applicant${selected.size === 1 ? '' : 's'}? Only tests with a class chosen are sent, and results already emailed for the same class are skipped.`)) return;
    setBusy(action);
    try {
      const result = await apiSend<{ updated?: number; sent?: number; skipped?: { referenceNo: string; reason: string }[]; emailConfigured?: boolean }>('/api/placement-tests/bulk', 'POST', { ids: [...selected], action });
      if (action === 'email-results') {
        const skipped = result.skipped?.length ?? 0;
        toast.success(`${result.sent} result email${result.sent === 1 ? '' : 's'} queued${skipped ? `, ${skipped} skipped` : ''}.`, skipped ? { description: result.skipped!.slice(0, 4).map(s => `${s.referenceNo}: ${s.reason}`).join(' · ') } : undefined);
        if (result.emailConfigured === false) toast.warning('School email is not set up on this server. The emails wait in the outbox until it is.');
      } else {
        toast.success(`${result.updated} test${result.updated === 1 ? '' : 's'} ${action === 'archive' ? 'archived' : 'restored'}.`);
      }
      setSelected(new Set());
      await load();
    } catch (err: any) {
      toast.error(err.message || 'That did not work');
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    setBusy('export');
    try {
      await downloadWithAuth(`/api/placement-tests/export.csv${qs({ ...filters, q: query })}`, 'placement-tests.csv');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setBusy(null);
    }
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

  const hasFilters = Boolean(level || form || from || to || query);
  const clearFilters = () => { setLevel(''); setForm(''); setFrom(''); setTo(''); setQuery(''); };

  return <div className="mx-auto max-w-7xl space-y-6">
    <PlacementHeader
      title="Placement tests"
      description="Results from newcomers who took the public placement test. The level shown is a recommendation from the scores; a teacher confirms the class."
      actions={<>
        <Button type="button" variant="outline" onClick={() => void copyLink()}><Copy className="mr-2 h-4 w-4" />Copy test link</Button>
        <a href="/placement-test" target="_blank" rel="noreferrer" className={`${buttonVariants({ variant: 'outline' })} border`}><ExternalLink className="mr-2 h-4 w-4" />Open test</a>
      </>}
    />

    <div className="rounded-sm border border-border bg-card shadow-sm">
      <div className="space-y-3 border-b border-border p-4">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1">
          {statusTabs.map(tab => {
            const count = tab.value === '' ? (counts.NEW ?? 0) + (counts.REVIEWED ?? 0) + (counts.CONTACTED ?? 0) : tab.value === 'any' ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[tab.value] ?? 0;
            return <button key={tab.label} type="button" aria-pressed={status === tab.value} onClick={() => setStatus(tab.value)} className={`min-h-9 rounded-sm px-3 text-sm font-medium ${status === tab.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{tab.label} <span className="tabular-nums opacity-80">{count}</span></button>;
          })}
        </div>
        <form onSubmit={search} className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, phone, email or reference" className="pl-9" aria-label="Search placement tests" />
          </div>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">Level
            <select value={level} onChange={event => setLevel(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="">All levels</option>
              {PLACEMENT_LEVELS.map(l => <option key={l} value={l}>{PLACEMENT_LEVEL_LABELS[l]}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">Form
            <select value={form} onChange={event => setForm(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              <option value="">All forms</option>
              {[...new Set([...forms, ...(form ? [form] : [])])].map(f => <option key={f} value={f}>Form {f}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">From
            <Input type="date" value={from} max={to || undefined} onChange={event => setFrom(event.target.value)} className="w-40" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">To
            <Input type="date" value={to} min={from || undefined} onChange={event => setTo(event.target.value)} className="w-40" />
          </label>
          <Button type="submit" variant="outline">Search</Button>
          {hasFilters && <Button type="button" variant="ghost" onClick={() => { clearFilters(); void load(''); }}><X className="mr-1.5 h-4 w-4" />Clear</Button>}
          <Button type="button" variant="outline" className="ml-auto" onClick={() => void exportCsv()} disabled={busy === 'export'}>{busy === 'export' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Export CSV</Button>
        </form>
      </div>

      {selected.size > 0 && <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary/5 px-4 py-2.5" role="region" aria-label="Actions for selected tests">
        <span className="mr-2 text-sm font-medium">{selected.size} selected</span>
        <Button type="button" size="sm" variant="outline" onClick={() => void bulk('email-results')} disabled={busy !== null}>{busy === 'email-results' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}Email results</Button>
        {status === 'ARCHIVED'
          ? <Button type="button" size="sm" variant="outline" onClick={() => void bulk('unarchive')} disabled={busy !== null}><ArchiveRestore className="mr-1.5 h-4 w-4" />Restore</Button>
          : <Button type="button" size="sm" variant="outline" onClick={() => void bulk('archive')} disabled={busy !== null}><Archive className="mr-1.5 h-4 w-4" />Archive</Button>}
        <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear selection</Button>
      </div>}

      {error && <div className="flex items-center gap-2 p-6 text-sm text-destructive" role="alert"><AlertTriangle className="h-4 w-4" />{error}<Button type="button" variant="outline" size="sm" className="ml-2" onClick={() => void load()}>Retry</Button></div>}
      {loading && !error && <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading placement tests</div>}
      {!loading && !error && rows.length === 0 && <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <ClipboardCheck className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium text-foreground">{hasFilters || status ? 'No tests match these filters' : 'No placement tests here yet'}</p>
        <p className="max-w-md text-sm text-muted-foreground">{hasFilters || status ? 'Try another status, level, form or date range.' : 'Share the test link with newcomers. Each finished test appears here with a recommended level.'}</p>
      </div>}
      {!loading && !error && rows.length > 0 && <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select all tests on this page" className="h-4 w-4 accent-[var(--primary)]" /></th>
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
            {rows.map(row => <tr key={row.id} className={`border-b border-border last:border-0 ${selected.has(row.id) ? 'bg-primary/5' : 'hover:bg-muted/40'}`}>
              <td className="px-4 py-3"><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggle(row.id)} aria-label={`Select ${row.fullName}`} className="h-4 w-4 accent-[var(--primary)]" /></td>
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
