import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiGet, apiSend, qs } from '../../lib/api';
import { formatMoney } from '../../lib/locale';

interface Department { id: string; name: string }
interface Designation { id: string; title: string; departmentId?: string | null }
interface Employee {
  id: string; employeeCode: string; firstName: string; lastName: string;
  email?: string | null; phone?: string | null; status: string;
  baseSalary: number; currency: string;
  department?: Department | null; designation?: Designation | null;
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  ON_LEAVE: 'bg-amber-100 text-amber-700',
  SUSPENDED: 'bg-orange-100 text-orange-700',
  TERMINATED: 'bg-slate-200 text-slate-600',
};

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  departmentId: '', designationId: '', baseSalary: '', status: 'ACTIVE',
};

export default function StaffDirectory() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [emp, dep, des] = await Promise.all([
        apiGet<Employee[]>('/api/employees'),
        apiGet<Department[]>('/api/departments'),
        apiGet<Designation[]>('/api/designations'),
      ]);
      setEmployees(Array.isArray(emp) ? emp : []);
      setDepartments(Array.isArray(dep) ? dep : []);
      setDesignations(Array.isArray(des) ? des : []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => employees.filter((e) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      (e.email ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    const matchesDept = deptFilter === 'ALL' || e.department?.id === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  }), [employees, search, statusFilter, deptFilter]);

  const deptDesignations = designations.filter(
    (d) => !form.departmentId || d.departmentId === form.departmentId,
  );

  async function handleDelete(emp: Employee) {
    if (!window.confirm(`Remove ${emp.firstName} ${emp.lastName}? They will be marked terminated; payroll and leave history is kept.`)) return;
    try {
      await apiSend(`/api/employees/${emp.id}`, 'DELETE');
      toast.success('Employee removed');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove employee');
    }
  }

  async function handleCreate() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    setSaving(true);
    try {
      await apiSend('/api/employees', 'POST', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        departmentId: form.departmentId || undefined,
        designationId: form.designationId || undefined,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : 0,
        status: form.status,
      });
      toast.success('Employee added');
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add employee');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700"><Briefcase className="h-5 w-5" /></div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Staff</h1>
            <p className="text-sm text-slate-500">{employees.length} employees</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/staff/departments"><Button variant="outline">Departments</Button></Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger render={<Button><Plus className="mr-1 h-4 w-4" /> Add employee</Button>} />
            <DialogContent>
              <DialogHeader><DialogTitle>Add employee</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>First name *</Label>
                  <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Last name *</Label>
                  <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Department</Label>
                  <Select value={form.departmentId || 'none'} onValueChange={(v) => setForm({ ...form, departmentId: v === 'none' ? '' : v, designationId: '' })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Designation</Label>
                  <Select value={form.designationId || 'none'} onValueChange={(v) => setForm({ ...form, designationId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {deptDesignations.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Base salary (monthly)</Label>
                  <Input type="number" min="0" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
          <Input className="pl-8" placeholder="Search name, code, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'].map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All departments</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Designation</th>
              <th className="px-4 py-2 text-right">Base salary</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No employees found</td></tr>
            ) : filtered.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 font-mono text-xs text-slate-500">{e.employeeCode}</td>
                <td className="px-4 py-2">
                  <Link to={`/staff/${e.id}`} className="font-medium text-indigo-600 hover:underline">
                    {e.firstName} {e.lastName}
                  </Link>
                  {e.email && <div className="text-xs text-slate-400">{e.email}</div>}
                </td>
                <td className="px-4 py-2 text-slate-600">{e.department?.name ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{e.designation?.title ?? '—'}</td>
                <td className="px-4 py-2 text-right">{formatMoney(e.baseSalary, e.currency)}</td>
                <td className="px-4 py-2">
                  <Badge className={STATUS_STYLES[e.status] ?? ''}>{e.status.replace('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Edit" render={<Link to={`/staff/${e.id}`} />}>
                      <Pencil className="h-4 w-4 text-slate-500" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Remove" onClick={() => handleDelete(e)}>
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
