import { useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert, Plus, Loader2, Trash2, AlertTriangle, Search, X, CheckCircle2, FileDown, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiGet, apiSend, authHeaders } from '../../lib/api';
import { usePermissions } from '../../lib/permissions';

interface Rule {
  id: string; code: string; article: string; articleOrder: number;
  title: string; description: string; severity: 'MINOR' | 'MODERATE' | 'SERIOUS';
}

interface Violation {
  id: string; studentId: string; studentName: string; studentCode: string; className: string | null;
  ruleId: string; ruleCode: string; ruleTitle: string; article: string; severity: string;
  note: string | null; occurredAt: string; reportedByName: string; reportedById: string;
}

interface StudentSummary {
  total: number;
  bySeverity: { MINOR: number; MODERATE: number; SERIOUS: number };
  byRule: { ruleId: string; code: string; title: string; severity: string; count: number }[];
}

interface LoggedViolation {
  id: string; ruleCode: string; ruleTitle: string; severity: string;
}

const severityStyle = (s: string) =>
  s === 'SERIOUS' ? 'bg-red-100 text-red-700' : s === 'MODERATE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600';

const severityLabel = (s: string) => (s === 'SERIOUS' ? 'Serious' : s === 'MODERATE' ? 'Moderate' : 'Minor');

// Correct 1st/2nd/3rd/4th... suffixing, including the 11th–13th exception
// (a prior inline version always said "11st"/"12nd"/"13rd" and "21th" etc).
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'amber' | 'red' | 'aubergine' }) {
  const toneClasses: Record<string, string> = {
    slate: 'text-slate-700 dark:text-slate-200',
    amber: 'text-amber-600',
    red: 'text-red-600',
    aubergine: 'text-aubergine-600',
  };
  return (
    <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}

export default function ConductDashboard() {
  const { hasPermission, user, isAdmin } = usePermissions();
  const canManage = hasPermission('manage_conduct');

  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  const [severityFilter, setSeverityFilter] = useState('all');
  const [studentFilter, setStudentFilter] = useState('all');

  // Report dialog
  const [open, setOpen] = useState(false);
  const [reportStudentId, setReportStudentId] = useState('');
  const [reportRuleIds, setReportRuleIds] = useState<string[]>([]);
  const [ruleSearch, setRuleSearch] = useState('');
  const [note, setNote] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [justLogged, setJustLogged] = useState<{ violations: LoggedViolation[]; studentName: string } | null>(null);
  const [downloadingNotice, setDownloadingNotice] = useState(false);

  const loadViolations = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (severityFilter !== 'all') params.set('severity', severityFilter);
    if (studentFilter !== 'all') params.set('studentId', studentFilter);
    const qs = params.toString();
    apiGet<Violation[]>(`/api/conduct/violations${qs ? `?${qs}` : ''}`)
      .then((d) => setViolations(Array.isArray(d) ? d : []))
      .catch((e: any) => toast.error(e.message || 'Failed to load conduct records'))
      .finally(() => setLoading(false));
  };

  useEffect(loadViolations, [severityFilter, studentFilter]);

  useEffect(() => {
    apiGet<any[]>('/api/students')
      .then((ss) => setStudents(ss.map((s: any) => ({
        id: s.id, name: `${s.user?.firstName ?? s.firstName ?? ''} ${s.user?.lastName ?? s.lastName ?? ''}`.trim() || s.studentCode,
      }))))
      .catch(() => {});
    apiGet<Rule[]>('/api/conduct/rules').then(setRules).catch(() => {});
  }, []);

  // Group rules by article for the picker, filtered by the in-dialog search box.
  const rulesByArticle = useMemo(() => {
    const q = ruleSearch.trim().toLowerCase();
    const filtered = q
      ? rules.filter((r) => r.code.toLowerCase().includes(q) || r.title.toLowerCase().includes(q))
      : rules;
    const map = new Map<string, Rule[]>();
    for (const r of filtered) {
      if (!map.has(r.article)) map.set(r.article, []);
      map.get(r.article)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => (a[1][0]?.articleOrder ?? 0) - (b[1][0]?.articleOrder ?? 0));
  }, [rules, ruleSearch]);

  const selectedRules = useMemo(() => reportRuleIds.map((id) => rules.find((r) => r.id === id)).filter((r): r is Rule => !!r), [reportRuleIds, rules]);

  const toggleRule = (id: string) => {
    setReportRuleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Pull the student's existing counts as soon as they're picked, so staff
  // see "how many times" before they even submit.
  useEffect(() => {
    if (!reportStudentId) { setSummary(null); return; }
    setSummaryLoading(true);
    apiGet<StudentSummary>(`/api/conduct/students/${reportStudentId}/summary`)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false));
  }, [reportStudentId]);

  const openReport = () => {
    setReportStudentId('');
    setReportRuleIds([]);
    setRuleSearch('');
    setNote('');
    setActionTaken('');
    setSummary(null);
    setJustLogged(null);
    setOpen(true);
  };

  const submitReport = async () => {
    if (!reportStudentId) { toast.error('Select a student'); return; }
    if (reportRuleIds.length === 0) { toast.error('Select at least one rule that was broken'); return; }
    setSubmitting(true);
    try {
      const result = await apiSend<{ violations: LoggedViolation[]; studentTotals: { minor: number; moderate: number; serious: number } }>(
        '/api/conduct/violations/batch', 'POST', {
          studentId: reportStudentId,
          ruleIds: reportRuleIds,
          note: note.trim() || undefined,
          actionTaken: actionTaken.trim() || undefined,
        },
      );
      const studentName = students.find((s) => s.id === reportStudentId)?.name || 'Student';
      toast.success(`Logged ${result.violations.length} violation${result.violations.length === 1 ? '' : 's'} for ${studentName}.`);
      setJustLogged({ violations: result.violations, studentName });
      loadViolations();
    } catch (e: any) {
      toast.error(e.message || 'Failed to log violation');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadNotice = async () => {
    if (!justLogged || justLogged.violations.length === 0) return;
    setDownloadingNotice(true);
    try {
      const ids = justLogged.violations.map((v) => v.id).join(',');
      const res = await fetch(`/api/conduct/violations/notice?ids=${encodeURIComponent(ids)}`, { headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate notice');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Disciplinary-Notice-${justLogged.studentName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || 'Failed to download the disciplinary notice');
    } finally {
      setDownloadingNotice(false);
    }
  };

  const removeViolation = async (v: Violation) => {
    if (!confirm(`Remove this record (${v.studentName} — rule ${v.ruleCode})? This cannot be undone.`)) return;
    try {
      await apiSend(`/api/conduct/violations/${v.id}`, 'DELETE');
      toast.success('Record removed');
      setViolations((prev) => prev.filter((x) => x.id !== v.id));
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove record');
    }
  };

  // Lightweight report cards over the records currently in view (respects the
  // active filters below), so "how are we doing" is visible at a glance
  // without a separate reporting page.
  const stats = useMemo(() => {
    const byStudent = new Map<string, number>();
    let minor = 0, moderate = 0, serious = 0;
    for (const v of violations) {
      byStudent.set(v.studentId, (byStudent.get(v.studentId) || 0) + 1);
      if (v.severity === 'MINOR') minor += 1;
      else if (v.severity === 'MODERATE') moderate += 1;
      else if (v.severity === 'SERIOUS') serious += 1;
    }
    const flagged = Array.from(byStudent.values()).filter((c) => c >= 3).length;
    return { total: violations.length, minor, moderate, serious, flagged };
  }, [violations]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-aubergine-600" /> Conduct
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
            Log rule violations against the school handbook and track how many times each student has broken a rule.
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={(o) => (o ? openReport() : setOpen(false))}>
            <DialogTrigger render={<Button><Plus className="mr-2 h-4 w-4" /> Report Violation</Button>} />
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{justLogged ? 'Violation Logged' : 'Report a Rule Violation'}</DialogTitle></DialogHeader>

              {justLogged ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      Logged {justLogged.violations.length} violation{justLogged.violations.length === 1 ? '' : 's'} for {justLogged.studentName}
                    </p>
                    <ul className="mt-2.5 space-y-1.5">
                      {justLogged.violations.map((v) => (
                        <li key={v.id} className="flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-100">
                          <span className="font-mono text-emerald-500 dark:text-emerald-400">{v.ruleCode}</span>
                          <span className="truncate">{v.ruleTitle}</span>
                          <Badge className={`${severityStyle(v.severity)} border-0 text-[9px] shrink-0`}>{severityLabel(v.severity)}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-slate-500">
                    Generate a printable Disciplinary Notice — with the rule(s) broken, escalation context, and signature lines — to send home or file.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Student</Label>
                    <Select value={reportStudentId} onValueChange={setReportStudentId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select student">
                          {students.find((s) => s.id === reportStudentId)?.name || 'Select student'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {reportStudentId && (
                    <div className="rounded-lg border border-slate-200 dark:border-surface-raised bg-slate-50 dark:bg-surface-raised/30 p-3 text-xs">
                      {summaryLoading ? (
                        <span className="text-slate-400">Loading history…</span>
                      ) : summary && summary.total > 0 ? (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-semibold text-slate-700 dark:text-slate-200">{summary.total} prior violation{summary.total === 1 ? '' : 's'}:</span>
                          <span className="text-slate-500">{summary.bySeverity.MINOR} minor</span>
                          <span className="text-slate-500">{summary.bySeverity.MODERATE} moderate</span>
                          <span className="text-slate-500">{summary.bySeverity.SERIOUS} serious</span>
                        </div>
                      ) : (
                        <span className="text-emerald-600">No prior violations on record.</span>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Rules broken *</Label>
                      {reportRuleIds.length > 0 && (
                        <span className="text-[11px] font-medium text-slate-400">{reportRuleIds.length} selected</span>
                      )}
                    </div>

                    {selectedRules.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRules.map((r) => (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 rounded-full bg-aubergine-50 dark:bg-aubergine-900/30 text-aubergine-700 dark:text-aubergine-300 text-[11px] font-medium pl-2.5 pr-1 py-1"
                          >
                            <span className="font-mono">{r.code}</span> {r.title}
                            <button
                              type="button"
                              onClick={() => toggleRule(r.id)}
                              aria-label={`Remove ${r.code}`}
                              className="rounded-full p-0.5 hover:bg-aubergine-100 dark:hover:bg-aubergine-800"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        value={ruleSearch}
                        onChange={(e) => setRuleSearch(e.target.value)}
                        placeholder="Search rules by code or title…"
                        className="h-9 w-full rounded-lg border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-aubergine-500/30"
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 dark:border-surface-raised divide-y divide-slate-100 dark:divide-slate-800">
                      {rulesByArticle.length === 0 && (
                        <p className="p-4 text-center text-xs text-slate-400">
                          {rules.length === 0 ? 'No rules found — ask an admin to seed the conduct rule catalog.' : 'No rules match your search.'}
                        </p>
                      )}
                      {rulesByArticle.map(([article, list]) => (
                        <div key={article}>
                          <div className="sticky top-0 bg-slate-50 dark:bg-surface-raised/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {article}
                          </div>
                          {list.map((r) => {
                            const checked = reportRuleIds.includes(r.id);
                            const priorForRule = summary?.byRule.find((x) => x.ruleId === r.id)?.count || 0;
                            return (
                              <label
                                key={r.id}
                                className={`flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-raised/40 ${checked ? 'bg-aubergine-50/60 dark:bg-aubergine-900/20' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleRule(r.id)}
                                  className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-aubergine-600 focus:ring-aubergine-500"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                                    <span className="font-mono text-xs text-slate-400">{r.code}</span>
                                    <span className="font-medium text-slate-800 dark:text-slate-200">{r.title}</span>
                                    <Badge className={`${severityStyle(r.severity)} border-0 text-[9px] shrink-0`}>{severityLabel(r.severity)}</Badge>
                                  </span>
                                  {reportStudentId && priorForRule > 0 && (
                                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600">
                                      <AlertTriangle className="h-3 w-3" /> This will be the {ordinal(priorForRule + 1)} time for this rule
                                    </span>
                                  )}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Note (optional)</Label>
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened, where, and any context…" rows={3} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Recommended action / consequence (optional)</Label>
                    <Textarea
                      value={actionTaken}
                      onChange={(e) => setActionTaken(e.target.value)}
                      placeholder="e.g. Verbal warning, after-school detention, parent meeting scheduled…"
                      rows={2}
                    />
                    <p className="text-[11px] text-slate-400">Printed on the Disciplinary Notice under "Recommended Action".</p>
                  </div>
                </div>
              )}

              <DialogFooter>
                {justLogged ? (
                  <>
                    <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
                    <Button onClick={downloadNotice} disabled={downloadingNotice}>
                      {downloadingNotice ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileDown className="h-4 w-4 mr-1" />}
                      Download Disciplinary Notice
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button onClick={submitReport} disabled={submitting || !reportStudentId || reportRuleIds.length === 0}>
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                      {reportRuleIds.length > 1 ? `Log ${reportRuleIds.length} Violations` : 'Log Violation'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Records" value={stats.total} tone="slate" />
        <StatCard label="Minor" value={stats.minor} tone="slate" />
        <StatCard label="Moderate" value={stats.moderate} tone="amber" />
        <StatCard label="Serious" value={stats.serious} tone="red" />
        <StatCard label="Flagged (3+)" value={stats.flagged} tone="aubergine" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={studentFilter} onValueChange={setStudentFilter}>
          <SelectTrigger className="w-[220px] h-9">
            <SelectValue>{studentFilter === 'all' ? 'All Students' : students.find((s) => s.id === studentFilter)?.name || 'All Students'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Students</SelectItem>
            {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue>{severityFilter === 'all' ? 'All Severities' : severityLabel(severityFilter)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="MINOR">Minor</SelectItem>
            <SelectItem value="MODERATE">Moderate</SelectItem>
            <SelectItem value="SERIOUS">Serious</SelectItem>
          </SelectContent>
        </Select>
        {stats.flagged > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
            <Users className="h-3.5 w-3.5" /> {stats.flagged} student{stats.flagged === 1 ? '' : 's'} with 3+ violations in view
          </span>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-4 py-3">Rule</th>
                <th className="px-4 py-3 text-center">Severity</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reported By</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading…</td></tr>}
              {!loading && violations.length === 0 && <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No conduct records yet.</td></tr>}
              {!loading && violations.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                  <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">
                    {v.studentName} <span className="text-xs text-slate-400 font-mono">{v.studentCode}</span>
                    {v.className && <span className="block text-xs text-slate-400">{v.className}</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    <span className="font-mono text-xs text-slate-400">{v.ruleCode}</span> {v.ruleTitle}
                    <span className="block text-xs text-slate-400">{v.article}</span>
                  </td>
                  <td className="px-4 py-3 text-center"><Badge className={`${severityStyle(v.severity)} border-0`}>{severityLabel(v.severity)}</Badge></td>
                  <td className="px-4 py-3 text-slate-500">{new Date(v.occurredAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-500">{v.reportedByName}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[240px] truncate" title={v.note || ''}>{v.note || '—'}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-slate-400 hover:text-aubergine-600"
                      title="Download disciplinary notice for this record"
                      onClick={async () => {
                        try {
                          const r = await fetch(`/api/conduct/violations/notice?ids=${v.id}`, { headers: authHeaders() });
                          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Failed to generate notice');
                          const blob = await r.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Disciplinary-Notice-${v.studentCode}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        } catch (e: any) {
                          toast.error(e.message || 'Failed to download notice');
                        }
                      }}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
                    {(isAdmin || v.reportedById === user?.id) && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-500 hover:text-rose-600" onClick={() => removeViolation(v)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
