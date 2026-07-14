import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CalendarClock, CheckCircle2, HeartPulse, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiSend } from '@/src/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RiskReason = { code: string; label: string; severity: 'HIGH' | 'MEDIUM' };
type StudentRisk = {
  id: string; studentCode: string; name: string; className: string; profilePhotoUrl?: string | null;
  risk: 'HIGH' | 'MEDIUM' | 'LOW'; score: number; reasons: RiskReason[];
  metrics: { attendanceRate: number | null; missingHomework: number; examAverage: number | null; developingGed: number };
  activeInterventions: number; openCases: number;
};
type Intervention = {
  id: string; title: string; reason: string; priority: string; status: string; dueDate?: string | null;
  notes?: string | null; outcome?: string | null;
  student: { id: string; studentCode: string; user?: { firstName: string; lastName: string } | null; class?: { name: string } | null };
  assignedTo?: { id: string; firstName: string; lastName: string; role: string } | null;
};
type Assignee = { id: string; firstName: string; lastName: string; role: string };

const riskClass = { HIGH: 'bg-rose-100 text-rose-800', MEDIUM: 'bg-amber-100 text-amber-800', LOW: 'bg-emerald-100 text-emerald-800' };

export default function StudentSuccessHub() {
  const [students, setStudents] = useState<StudentRisk[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<StudentRisk | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', reason: '', priority: 'MEDIUM', assignedToId: '', dueDate: '', notes: '' });

  const load = async () => {
    setLoading(true);
    try {
      const [riskData, plans, people] = await Promise.all([
        apiGet<{ students: StudentRisk[] }>('/api/student-success'),
        apiGet<Intervention[]>('/api/interventions'),
        apiGet<Assignee[]>('/api/interventions/assignees'),
      ]);
      setStudents(riskData.students || []); setInterventions(plans || []); setAssignees(people || []);
    } catch (error: any) {
      toast.error(error?.message || 'Could not load student success data');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const summary = useMemo(() => ({
    high: students.filter((student) => student.risk === 'HIGH').length,
    medium: students.filter((student) => student.risk === 'MEDIUM').length,
    open: interventions.filter((plan) => !['COMPLETED', 'CANCELLED'].includes(plan.status)).length,
    overdue: interventions.filter((plan) => plan.dueDate && new Date(plan.dueDate) < new Date() && !['COMPLETED', 'CANCELLED'].includes(plan.status)).length,
  }), [students, interventions]);

  const openForm = (student: StudentRisk) => {
    setSelected(student);
    setForm({ title: '', reason: student.reasons.map((reason) => reason.label).join('; '), priority: student.risk === 'HIGH' ? 'HIGH' : 'MEDIUM', assignedToId: '', dueDate: '', notes: '' });
    requestAnimationFrame(() => document.getElementById('intervention-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  };
  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected) return; setSaving(true);
    try {
      await apiSend('/api/interventions', 'POST', { studentId: selected.id, ...form, assignedToId: form.assignedToId || null, dueDate: form.dueDate || null });
      toast.success('Intervention plan created'); setSelected(null); await load();
    } catch (error: any) { toast.error(error?.message || 'Could not create intervention'); }
    finally { setSaving(false); }
  };
  const updateStatus = async (id: string, status: string) => {
    try { await apiSend(`/api/interventions/${id}`, 'PATCH', { status }); toast.success('Plan updated'); await load(); }
    catch (error: any) { toast.error(error?.message || 'Could not update plan'); }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold"><HeartPulse className="h-6 w-6 text-aubergine-600" /> Student Success</h1><p className="mt-1 text-sm text-slate-500">Transparent warnings across attendance, homework, exams, and GED readiness.</p></div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">High priority</p><p className="mt-1 text-2xl font-bold text-rose-600">{summary.high}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Watch closely</p><p className="mt-1 text-2xl font-bold text-amber-600">{summary.medium}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Open plans</p><p className="mt-1 text-2xl font-bold text-blue-600">{summary.open}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Overdue actions</p><p className="mt-1 text-2xl font-bold text-aubergine-600">{summary.overdue}</p></CardContent></Card>
      </div>

      {selected && <Card id="intervention-form" className="border-aubergine-200"><CardHeader><CardTitle className="text-lg">New plan for {selected.name}</CardTitle></CardHeader><CardContent><form onSubmit={createPlan} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="plan-title">Plan title</Label><Input id="plan-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Four-week attendance support" /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="plan-reason">Reason</Label><Textarea id="plan-reason" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        <div className="space-y-2"><Label>Priority</Label><Select value={form.priority} onValueChange={(value) => value && setForm({ ...form, priority: value })}><SelectTrigger aria-label="Intervention priority"><SelectValue /></SelectTrigger><SelectContent>{['LOW','MEDIUM','HIGH','URGENT'].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Assigned person</Label><Select value={form.assignedToId || 'unassigned'} onValueChange={(value) => setForm({ ...form, assignedToId: value === 'unassigned' ? '' : value || '' })}><SelectTrigger aria-label="Assigned person"><SelectValue placeholder="Unassigned" /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{assignees.map((person) => <SelectItem key={person.id} value={person.id}>{person.firstName} {person.lastName} · {person.role}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="plan-due">Review date</Label><Input id="plan-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="plan-notes">First action</Label><Input id="plan-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Contact student, arrange support…" /></div>
        <div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create plan'}</Button><Button type="button" variant="ghost" onClick={() => setSelected(null)}>Cancel</Button></div>
      </form></CardContent></Card>}

      <Card><CardHeader><CardTitle className="text-lg">Students needing attention</CardTitle></CardHeader><CardContent className="space-y-3">
        {!loading && students.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No active students found.</p>}
        {students.map((student) => <div key={student.id} className="rounded-xl border p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{student.name}</h3><Badge className={riskClass[student.risk]}>{student.risk} · {student.score}</Badge><span className="text-xs text-slate-500">{student.studentCode} · {student.className}</span></div>
            <div className="mt-2 flex flex-wrap gap-2">{student.reasons.length ? student.reasons.map((reason) => <span key={reason.code} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-white/10 dark:text-slate-200">{reason.label}</span>) : <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> No current threshold warnings</span>}</div>
            <p className="mt-2 text-xs text-slate-500">Attendance {student.metrics.attendanceRate ?? '—'}% · Missing homework {student.metrics.missingHomework} · Exam average {student.metrics.examAverage ?? '—'}% · Active plans {student.activeInterventions}</p>
          </div><Button size="sm" onClick={() => openForm(student)}><Plus className="mr-1 h-4 w-4" />Plan support</Button>
        </div></div>)}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-lg">Intervention plans</CardTitle></CardHeader><CardContent className="space-y-3">
        {interventions.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No intervention plans yet.</p>}
        {interventions.map((plan) => <div key={plan.id} className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{plan.title}</h3><Badge variant="outline">{plan.priority}</Badge></div><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{plan.student.user?.firstName} {plan.student.user?.lastName} · {plan.student.class?.name || 'Unassigned'}</p><p className="mt-1 text-xs text-slate-500">{plan.reason}{plan.assignedTo ? ` · Assigned to ${plan.assignedTo.firstName} ${plan.assignedTo.lastName}` : ''}{plan.dueDate ? ` · Review ${new Date(plan.dueDate).toLocaleDateString()}` : ''}</p></div>
          <Select value={plan.status} onValueChange={(value) => value && void updateStatus(plan.id, value)}><SelectTrigger className="w-full md:w-44" aria-label={`Status for ${plan.title}`}><SelectValue /></SelectTrigger><SelectContent>{['OPEN','IN_PROGRESS','MONITORING','COMPLETED','CANCELLED'].map((value) => <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
        </div>)}
      </CardContent></Card>
      <div className="flex items-start gap-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300"><Activity className="mt-0.5 h-4 w-4 shrink-0" /><span>Risk levels are rule-based and explain every reason. They support professional judgment; they never automatically label, discipline, or restrict a student.</span></div>
      {summary.overdue > 0 && <p className="flex items-center gap-2 text-sm text-rose-600"><CalendarClock className="h-4 w-4" />{summary.overdue} action{summary.overdue === 1 ? '' : 's'} overdue.</p>}
      {summary.high > 0 && <span className="sr-only" role="status"><AlertTriangle />{summary.high} high-priority students</span>}
    </div>
  );
}
