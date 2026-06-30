import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { formatMoney } from '../../lib/locale';
import { format } from 'date-fns';

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [emp, setEmp] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [balance, setBalance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const [e, dep, des, bal] = await Promise.all([
        apiGet(`/api/employees/${id}`),
        apiGet('/api/departments'),
        apiGet('/api/designations'),
        apiGet(`/api/employees/${id}/leave-balance`),
      ]);
      setEmp(e);
      setEdit({
        firstName: e.firstName, lastName: e.lastName, email: e.email ?? '',
        phone: e.phone ?? '', status: e.status,
        departmentId: e.department?.id ?? '', designationId: e.designation?.id ?? '',
        baseSalary: String(e.baseSalary ?? 0),
      });
      setDepartments(Array.isArray(dep) ? dep : []);
      setDesignations(Array.isArray(des) ? des : []);
      setBalance(bal?.balance ?? []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function save() {
    setSaving(true);
    try {
      await apiSend(`/api/employees/${id}`, 'PUT', {
        firstName: edit.firstName, lastName: edit.lastName,
        email: edit.email || undefined, phone: edit.phone || undefined,
        status: edit.status,
        departmentId: edit.departmentId || undefined,
        designationId: edit.designationId || undefined,
        baseSalary: Number(edit.baseSalary) || 0,
      });
      toast.success('Saved');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!emp) return;
    if (!window.confirm(`Remove ${emp.firstName} ${emp.lastName}? They will be marked terminated; payroll and leave history is kept.`)) return;
    try {
      await apiSend(`/api/employees/${id}`, 'DELETE');
      toast.success('Employee removed');
      navigate('/staff');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove employee');
    }
  }

  if (loading || !emp || !edit) {
    return <div className="py-20 text-center text-sm text-slate-400">Loading…</div>;
  }

  const deptDesignations = designations.filter((d) => !edit.departmentId || d.departmentId === edit.departmentId);

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to staff
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{emp.firstName} {emp.lastName}</h1>
          <p className="font-mono text-xs text-slate-400">{emp.employeeCode}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{emp.status.replace('_', ' ')}</Badge>
          {emp.status !== 'TERMINATED' && (
            <Button variant="outline" size="sm" className="text-rose-600" onClick={remove}>
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg border border-slate-200 p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700">Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>First name</Label><Input value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} /></div>
            <div className="space-y-1"><Label>Last name</Label><Input value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} /></div>
            <div className="space-y-1"><Label>Email</Label><Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Select value={edit.departmentId || 'none'} onValueChange={(v) => setEdit({ ...edit, departmentId: v === 'none' ? '' : v, designationId: '' })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Designation</Label>
              <Select value={edit.designationId || 'none'} onValueChange={(v) => setEdit({ ...edit, designationId: v === 'none' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {deptDesignations.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Base salary (monthly)</Label><Input type="number" min="0" value={edit.baseSalary} onChange={(e) => setEdit({ ...edit, baseSalary: e.target.value })} /></div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}</Button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Leave balance ({new Date().getFullYear()})</h2>
            {balance.length === 0 ? <p className="text-xs text-slate-400">No leave types defined.</p> : (
              <ul className="space-y-1 text-sm">
                {balance.map((b) => (
                  <li key={b.leaveTypeId} className="flex justify-between">
                    <span className="text-slate-600">{b.name}</span>
                    <span className="font-medium">{b.remaining == null ? `${b.used} used` : `${b.remaining}/${b.daysPerYear} left`}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Payslips</h2>
        {(!emp.payslips || emp.payslips.length === 0) ? <p className="text-xs text-slate-400">No payslips yet.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-1">Period</th><th className="py-1 text-right">Base</th><th className="py-1 text-right">Allowances</th><th className="py-1 text-right">Deductions</th><th className="py-1 text-right">Net pay</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emp.payslips.map((p: any) => (
                <tr key={p.id}>
                  <td className="py-1">{p.payrollRun ? `${p.payrollRun.periodMonth}/${p.payrollRun.periodYear}` : '—'}</td>
                  <td className="py-1 text-right">{formatMoney(p.baseSalary, p.currency)}</td>
                  <td className="py-1 text-right">{formatMoney(p.allowances, p.currency)}</td>
                  <td className="py-1 text-right">{formatMoney(p.deductions, p.currency)}</td>
                  <td className="py-1 text-right font-medium">{formatMoney(p.netPay, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Leave history</h2>
        {(!emp.leaveRequests || emp.leaveRequests.length === 0) ? <p className="text-xs text-slate-400">No leave requests.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr><th className="py-1">Type</th><th className="py-1">Dates</th><th className="py-1 text-right">Days</th><th className="py-1">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emp.leaveRequests.map((r: any) => (
                <tr key={r.id}>
                  <td className="py-1">{r.leaveType?.name ?? '—'}</td>
                  <td className="py-1">{format(new Date(r.startDate), 'd MMM')} – {format(new Date(r.endDate), 'd MMM yyyy')}</td>
                  <td className="py-1 text-right">{r.days}</td>
                  <td className="py-1"><Badge>{r.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
