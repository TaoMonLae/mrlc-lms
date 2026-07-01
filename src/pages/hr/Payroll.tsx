import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Plus, Printer, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { formatMoney } from '../../lib/locale';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-slate-200 text-slate-600',
  APPROVED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-emerald-100 text-emerald-700',
};

export default function Payroll() {
  const now = new Date();
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [selected, setSelected] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ year: '', month: '1', notes: '' });
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await apiGet('/api/payroll-runs');
      setRuns(Array.isArray(r) ? r : []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function openRun(id: string) {
    try { setSelected(await apiGet(`/api/payroll-runs/${id}`)); }
    catch (err: any) { toast.error(err.message); }
  }

  async function createRun() {
    try {
      await apiSend('/api/payroll-runs', 'POST', { periodYear: Number(year), periodMonth: Number(month) });
      toast.success('Payroll run created');
      setOpen(false); load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function setStatus(next: string) {
    if (!selected) return;
    try {
      await apiSend(`/api/payroll-runs/${selected.id}/status`, 'PUT', { status: next });
      toast.success(`Marked ${next}`);
      openRun(selected.id); load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function refresh() {
    setRefreshing(true);
    await load();
    if (selected) await openRun(selected.id);
    setRefreshing(false);
  }

  function openEdit() {
    if (!selected) return;
    setEditForm({ year: String(selected.periodYear), month: String(selected.periodMonth), notes: selected.notes ?? '' });
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!selected) return;
    try {
      await apiSend(`/api/payroll-runs/${selected.id}`, 'PUT', {
        periodYear: Number(editForm.year), periodMonth: Number(editForm.month), notes: editForm.notes,
      });
      toast.success('Payroll run updated');
      setEditOpen(false);
      await load();
      openRun(selected.id);
    } catch (err: any) { toast.error(err.message); }
  }

  async function removeRun() {
    if (!selected) return;
    if (!window.confirm(`Delete the ${MONTHS[selected.periodMonth - 1]} ${selected.periodYear} payroll run and its payslips?`)) return;
    try {
      await apiSend(`/api/payroll-runs/${selected.id}`, 'DELETE');
      toast.success('Payroll run deleted');
      setSelected(null);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function savePayslip(p: any, baseSalary: number, allowances: number, deductions: number) {
    try {
      await apiSend(`/api/payslips/${p.id}`, 'PUT', { baseSalary, allowances, deductions });
      openRun(selected.id);
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><Wallet className="h-5 w-5" /></div>
          <h1 className="text-xl font-semibold text-slate-900">Payroll</h1>
        </div>
        <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button><Plus className="mr-1 h-4 w-4" /> New run</Button>} />
          <DialogContent>
            <DialogHeader><DialogTitle>New payroll run</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-500">A draft payslip is created for every active employee from their base salary.</p>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label>Month</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="w-28 space-y-1"><Label>Year</Label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createRun}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700">Runs</h2>
          {loading ? <p className="text-sm text-slate-400">Loading…</p> :
            runs.length === 0 ? <p className="text-sm text-slate-400">No payroll runs yet.</p> :
            <ul className="space-y-1">
              {runs.map((r) => (
                <li key={r.id}>
                  <button onClick={() => openRun(r.id)} className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm ${selected?.id === r.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span>{MONTHS[r.periodMonth - 1]} {r.periodYear} <span className="text-xs text-slate-400">· {r._count?.payslips ?? 0} payslips</span></span>
                    <Badge className={STATUS_STYLES[r.status]}>{r.status}</Badge>
                  </button>
                </li>
              ))}
            </ul>}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400">Select a run to view payslips</div>
          ) : (
            <div className="space-y-4 rounded-lg border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-800">{MONTHS[selected.periodMonth - 1]} {selected.periodYear}</h2>
                  <p className="text-sm text-slate-500">Total net: {formatMoney(selected.totalNet ?? 0, selected.payslips?.[0]?.currency)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_STYLES[selected.status]}>{selected.status}</Badge>
                  <Button size="sm" variant="outline" render={<Link to={`/payroll/runs/${selected.id}/print`} />}>
                    <Printer className="mr-1 h-4 w-4" /> Print all
                  </Button>
                  {selected.status === 'DRAFT' && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit" onClick={openEdit}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                  )}
                  {selected.status !== 'PAID' && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Delete" onClick={removeRun}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  )}
                  {selected.status === 'DRAFT' && <Button size="sm" onClick={() => setStatus('APPROVED')}>Approve</Button>}
                  {selected.status === 'APPROVED' && <Button size="sm" onClick={() => setStatus('PAID')}>Mark paid</Button>}
                  {selected.status === 'APPROVED' && <Button size="sm" variant="outline" onClick={() => setStatus('DRAFT')}>Reopen</Button>}
                </div>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-500">
                  <tr><th className="py-1">Payee</th><th className="py-1">Type</th><th className="py-1 text-right">Base</th><th className="py-1 text-right">Allowances</th><th className="py-1 text-right">Deductions</th><th className="py-1 text-right">Net</th><th className="py-1"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selected.payslips?.map((p: any) => (
                    <PayslipRow key={p.id} payslip={p} editable={selected.status === 'DRAFT'} onSave={savePayslip} />
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit payroll run</DialogTitle></DialogHeader>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label>Month</Label>
              <Select value={editForm.month} onValueChange={(v) => setEditForm({ ...editForm, month: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="w-28 space-y-1"><Label>Year</Label><Input type="number" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>Notes</Label><Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function payeeName(p: any): string {
  if (p.employee) return `${p.employee.firstName} ${p.employee.lastName}`;
  if (p.teacher) return `${p.teacher.user?.firstName ?? ''} ${p.teacher.user?.lastName ?? ''}`.trim() || p.teacher.teacherCode;
  return '—';
}

function PayslipRow({ payslip, editable, onSave }: { payslip: any; editable: boolean; onSave: (p: any, b: number, a: number, d: number) => void }) {
  const [base, setBase] = useState(String(payslip.baseSalary));
  const [allowances, setAllowances] = useState(String(payslip.allowances));
  const [deductions, setDeductions] = useState(String(payslip.deductions));
  const net = (Number(base) || 0) + (Number(allowances) || 0) - (Number(deductions) || 0);
  const dirty = Number(base) !== payslip.baseSalary || Number(allowances) !== payslip.allowances || Number(deductions) !== payslip.deductions;
  return (
    <tr>
      <td className="py-1">{payeeName(payslip)}</td>
      <td className="py-1"><span className="text-xs text-slate-400">{payslip.teacher ? 'Teacher' : 'Staff'}</span></td>
      <td className="py-1 text-right">
        {editable ? <Input className="h-7 w-24 text-right" type="number" value={base} onChange={(e) => setBase(e.target.value)} /> : formatMoney(payslip.baseSalary, payslip.currency)}
      </td>
      <td className="py-1 text-right">
        {editable ? <Input className="h-7 w-24 text-right" type="number" value={allowances} onChange={(e) => setAllowances(e.target.value)} /> : formatMoney(payslip.allowances, payslip.currency)}
      </td>
      <td className="py-1 text-right">
        {editable ? <Input className="h-7 w-24 text-right" type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} /> : formatMoney(payslip.deductions, payslip.currency)}
      </td>
      <td className="py-1 text-right font-medium">{formatMoney(editable ? net : payslip.netPay, payslip.currency)}</td>
      <td className="py-1 text-right">
        {editable && dirty
          ? <Button size="sm" variant="ghost" className="h-6" onClick={() => onSave(payslip, Number(base) || 0, Number(allowances) || 0, Number(deductions) || 0)}>Save</Button>
          : <Link to={`/payroll/payslips/${payslip.id}/print`} className="text-slate-400 hover:text-slate-600" title="Print payslip"><Printer className="inline h-4 w-4" /></Link>}
      </td>
    </tr>
  );
}
