import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';

export default function Departments() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [desTitle, setDesTitle] = useState('');
  const [desDept, setDesDept] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [dep, des] = await Promise.all([
        apiGet('/api/departments'),
        apiGet('/api/designations'),
      ]);
      setDepartments(Array.isArray(dep) ? dep : []);
      setDesignations(Array.isArray(des) ? des : []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function addDept() {
    if (!deptName.trim()) { toast.error('Name is required'); return; }
    try {
      await apiSend('/api/departments', 'POST', { name: deptName.trim(), code: deptCode.trim() || undefined });
      toast.success('Department added');
      setDeptName(''); setDeptCode(''); load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function delDept(id: string) {
    try { await apiSend(`/api/departments/${id}`, 'DELETE'); toast.success('Deleted'); load(); }
    catch (err: any) { toast.error(err.message); }
  }

  async function addDes() {
    if (!desTitle.trim()) { toast.error('Title is required'); return; }
    try {
      await apiSend('/api/designations', 'POST', { title: desTitle.trim(), departmentId: desDept || undefined });
      toast.success('Designation added');
      setDesTitle(''); setDesDept(''); load();
    } catch (err: any) { toast.error(err.message); }
  }

  async function delDes(id: string) {
    try { await apiSend(`/api/designations/${id}`, 'DELETE'); toast.success('Deleted'); load(); }
    catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to staff
      </Link>
      <h1 className="text-xl font-semibold text-slate-900">Departments &amp; designations</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Departments</h2>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1"><Label>Name</Label><Input value={deptName} onChange={(e) => setDeptName(e.target.value)} /></div>
            <div className="w-24 space-y-1"><Label>Code</Label><Input value={deptCode} onChange={(e) => setDeptCode(e.target.value)} /></div>
            <Button onClick={addDept}><Plus className="h-4 w-4" /></Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {loading ? <li className="py-3 text-sm text-slate-400">Loading…</li> :
              departments.length === 0 ? <li className="py-3 text-sm text-slate-400">No departments yet.</li> :
              departments.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{d.name} {d.code && <span className="text-xs text-slate-400">({d.code})</span>} <span className="text-xs text-slate-400">· {d._count?.employees ?? 0} staff</span></span>
                  <Button variant="ghost" size="sm" onClick={() => delDept(d.id)}><Trash2 className="h-4 w-4 text-slate-400" /></Button>
                </li>
              ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-700">Designations</h2>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1"><Label>Title</Label><Input value={desTitle} onChange={(e) => setDesTitle(e.target.value)} /></div>
            <div className="w-36 space-y-1">
              <Label>Department</Label>
              <Select value={desDept || 'none'} onValueChange={(v) => setDesDept(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addDes}><Plus className="h-4 w-4" /></Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {loading ? <li className="py-3 text-sm text-slate-400">Loading…</li> :
              designations.length === 0 ? <li className="py-3 text-sm text-slate-400">No designations yet.</li> :
              designations.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{d.title} {d.department && <span className="text-xs text-slate-400">· {d.department.name}</span>}</span>
                  <Button variant="ghost" size="sm" onClick={() => delDes(d.id)}><Trash2 className="h-4 w-4 text-slate-400" /></Button>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
