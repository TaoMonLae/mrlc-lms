import { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, Plus, Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
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

const severityStyle = (s: string) =>
  s === 'SERIOUS' ? 'bg-red-100 text-red-700' : s === 'MODERATE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600';

const severityLabel = (s: string) => (s === 'SERIOUS' ? 'Serious' : s === 'MODERATE' ? 'Moderate' : 'Minor');

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
  const [reportRuleId, setReportRuleId] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

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

  // Group rules by article for the picker.
  const rulesByArticle = useMemo(() => {
    const map = new Map<string, Rule[]>();
    for (const r of rules) {
      if (!map.has(r.article)) map.set(r.article, []);
      map.get(r.article)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => (a[1][0]?.articleOrder ?? 0) - (b[1][0]?.articleOrder ?? 0));
  }, [rules]);

  const selectedRule = rules.find((r) => r.id === reportRuleId);

  // Pull the student's existing counts as soon as they're picked, so staff
  // see "how many times" before they even submit -- and again after
  // submitting, for the report we care about most (the running total).
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
    setReportRuleId('');
    setNote('');
    setSummary(null);
    setOpen(true);
  };

  const submitReport = async () => {
    if (!reportStudentId) { toast.error('Select a student'); return; }
    if (!reportRuleId) { toast.error('Select the rule that was broken'); return; }
    setSubmitting(true);
    try {
      const result = await apiSend<{ ruleViolationCount: number; severity: string }>('/api/conduct/violations', 'POST', {
        studentId: reportStudentId, ruleId: reportRuleId, note: note.trim() || undefined,
      });
      const studentName = students.find((s) => s.id === reportStudentId)?.name || 'Student';
      const ordinal = result.ruleViolationCount === 1 ? 'the 1st time' : `the ${result.ruleViolationCount}th time`;
      toast.success(`Logged. This is ${ordinal} ${studentName} has broken rule ${selectedRule?.code}.`);
      setOpen(false);
      loadViolations();
    } catch (e: any) {
      toast.error(e.message || 'Failed to log violation');
    } finally {
      setSubmitting(false);
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
              <DialogHeader><DialogTitle>Report a Rule Violation</DialogTitle></DialogHeader>
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
                  <Label>Rule broken</Label>
                  <Select value={reportRuleId} onValueChange={setReportRuleId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select the rule">
                        {selectedRule ? `${selectedRule.code} — ${selectedRule.title}` : 'Select the rule'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {rulesByArticle.map(([article, list]) => (
                        <div key={article}>
                          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">{article}</div>
                          {list.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.code} — {r.title} <span className="text-slate-400">({severityLabel(r.severity)})</span>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRule && (
                    <div className="flex items-center gap-2 pt-1">
                      <Badge className={`${severityStyle(selectedRule.severity)} border-0 text-[10px]`}>{severityLabel(selectedRule.severity)}</Badge>
                      <p className="text-xs text-slate-500">{selectedRule.description}</p>
                    </div>
                  )}
                  {reportStudentId && selectedRule && summary && (() => {
                    const priorForRule = summary.byRule.find((r) => r.ruleId === selectedRule.id)?.count || 0;
                    if (priorForRule === 0) return null;
                    return (
                      <p className="flex items-center gap-1.5 text-xs text-amber-600 pt-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        This will be the {priorForRule + 1}{priorForRule + 1 === 2 ? 'nd' : priorForRule + 1 === 3 ? 'rd' : 'th'} time for this specific rule.
                      </p>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <Label>Note (optional)</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What happened, where, and any context…" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                <Button onClick={submitReport} disabled={submitting || !reportStudentId || !reportRuleId}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null} Log Violation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
                  <td className="px-4 py-3 text-right">
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
