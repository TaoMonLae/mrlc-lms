import { useEffect, useState } from 'react';
import { CalendarCheck, Plus, Check, X } from 'lucide-react';
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
import { apiGet, apiSend, qs } from '../../lib/api';
import { format } from 'date-fns';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export default function Leave() {
  const [requests, setRequests] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [reqOpen, setReqOpen] = useState(false);
  const [form, setForm] = useState({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });

  const [typeOpen, setTypeOpen] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: '', daysPerYear: '', paid: true });

  async function load() {
    setLoading(true);
    try {
      const [reqs, t, emp] = await Promise.all([
        apiGet(`/api/leave-requests${qs({ status: statusFilter })}`),
        apiGet('/api/leave-types'),
        apiGet('/api/employees?status=ACTIVE'),
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setTypes(Array.isArray(t) ? t : []);
      setEmployees(Array.isArray(emp) ? emp : []);
    } catch (err: any) { toast.error(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [statusFilter]);

  async function createRequest() {
    if (!form.employeeId || !form.leaveTypeId || !form.startDate || !form.endDate) {
      toast.error('Employee, type and dates are required'); return;
    }
    try {
      await apiSend('/api/leave-requests', 'POST', form);
      toast.success('Leave request submitted');
      setReqOpen(false);
      setForm({ employeeId: '', leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function decide(id: string, status: string) {
    try {
      await apiSend(`/api/leave-requests/${id}/status`, 'PUT', { status });
      toast.success(`Request ${status.toLowerCase()}`);
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function addType() {
    if (!typeForm.name.trim()) { toast.error('Name is required'); return; }
    try {
      await apiSend('/api/leave-types', 'POST', {
        name: typeForm.name.trim(),
        daysPerYear: typeForm.daysPerYear ? Number(typeForm.daysPerYear) : 0,
        paid: typeForm.paid,
      });
      toast.success('Leave type added');
      setTypeOpen(false);
      setTypeForm({ name: '', daysPerYear: '', paid: true });
      load();
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2 text-amber-700"><CalendarCheck className="h-5 w-5" /></div>
          <h1 className="text-xl font-semibold text-slate-900">Leave</h1>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
            <DialogTrigger render={<Button variant="outline">Leave types</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Leave types</DialogTitle></DialogHeader>
              <ul className="divide-y divide-slate-100 text-sm">
                {types.length === 0 ? <li className="py-2 text-slate-400">None defined yet.</li> :
                  types.map((t) => (
                    <li key={t.id} className="flex justify-between py-2">
                      <span>{t.name}</span>
                      <span className="text-xs text-slate-400">{t.daysPerYear > 0 ? `${t.daysPerYear} days/yr` : 'uncapped'} · {t.paid ? 'paid' : 'unpaid'}</span>
                    </li>
                  ))}
              </ul>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1"><Label>Name</Label><Input value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Days/yr</Label><Input type="number" min="0" value={typeForm.daysPerYear} onChange={(e) => setTypeForm({ ...typeForm, daysPerYear: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={addType}><Plus className="mr-1 h-4 w-4" /> Add type</Button></DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={reqOpen} onOpenChange={setReqOpen}>
            <DialogTrigger render={<Button><Plus className="mr-1 h-4 w-4" /> New request</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>New leave request</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Employee *</Label>
                  <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Leave type *</Label>
                  <Select value={form.leaveTypeId} onValueChange={(v) => setForm({ ...form, leaveTypeId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Start *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div className="space-y-1"><Label>End *</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
                <Button onClick={createRequest}>Submit</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Dates</th>
              <th className="px-4 py-2 text-right">Days</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr> :
              requests.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No leave requests</td></tr> :
              requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">{r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '—'}</td>
                  <td className="px-4 py-2">{r.leaveType?.name ?? '—'}</td>
                  <td className="px-4 py-2">{format(new Date(r.startDate), 'd MMM')} – {format(new Date(r.endDate), 'd MMM yyyy')}</td>
                  <td className="px-4 py-2 text-right">{r.days}</td>
                  <td className="px-4 py-2"><Badge className={STATUS_STYLES[r.status]}>{r.status}</Badge></td>
                  <td className="px-4 py-2 text-right">
                    {r.status === 'PENDING' && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => decide(r.id, 'APPROVED')}><Check className="h-4 w-4 text-emerald-600" /></Button>
                        <Button size="sm" variant="outline" onClick={() => decide(r.id, 'REJECTED')}><X className="h-4 w-4 text-rose-600" /></Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
