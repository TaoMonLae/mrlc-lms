import { LoadError } from '../../components/ui/load-error';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [desTitle, setDesTitle] = useState('');
  const [desDept, setDesDept] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [dep, des] = await Promise.all([
        apiGet('/api/departments'),
        apiGet('/api/designations'),
      ]);
      setDepartments(Array.isArray(dep) ? dep : []);
      setDesignations(Array.isArray(des) ? des : []);
    } catch (err: any) {
      setError(err.message || 'Could not load departments.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function addDept() {
    if (!deptName.trim()) { toast.error('Name is required'); return; }
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      await apiSend('/api/departments', 'POST', { name: deptName.trim(), code: deptCode.trim() || undefined });
      toast.success('Department added');
      setDeptName(''); setDeptCode(''); load();
    } catch (err: any) { toast.error(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function delDept(id: string) {
    if (busyRef.current) return;
    if (!confirm('Delete this department?')) return;
    busyRef.current = true; setBusy(true);
    try { await apiSend(`/api/departments/${id}`, 'DELETE'); toast.success('Deleted'); load(); }
    catch (err: any) { toast.error(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function addDes() {
    if (!desTitle.trim()) { toast.error('Title is required'); return; }
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      await apiSend('/api/designations', 'POST', { title: desTitle.trim(), departmentId: desDept || undefined });
      toast.success('Designation added');
      setDesTitle(''); setDesDept(''); load();
    } catch (err: any) { toast.error(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  }

  async function delDes(id: string) {
    if (busyRef.current) return;
    if (!confirm('Delete this designation?')) return;
    busyRef.current = true; setBusy(true);
    try { await apiSend(`/api/designations/${id}`, 'DELETE'); toast.success('Deleted'); load(); }
    catch (err: any) { toast.error(err.message); }
    finally { busyRef.current = false; setBusy(false); }
  }

  if (error) return <LoadError title="Departments & designations" message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <Link to="/staff" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to staff
      </Link>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Departments &amp; designations</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Departments</h2>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-28 flex-1 space-y-1"><Label htmlFor="deptName">Name</Label><Input id="deptName" value={deptName} onChange={(e) => setDeptName(e.target.value)} /></div>
            <div className="w-24 space-y-1"><Label htmlFor="deptCode">Code</Label><Input id="deptCode" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} /></div>
            <Button disabled={busy || loading} aria-label="Add department" onClick={addDept}><Plus className="h-4 w-4" /></Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {loading ? <li className="py-3 text-sm text-slate-400">Loading…</li> :
              departments.length === 0 ? <li className="py-3 text-sm text-slate-400">No departments yet.</li> :
              departments.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{d.name} {d.code && <span className="text-xs text-slate-400">({d.code})</span>} <span className="text-xs text-slate-400">· {d._count?.employees ?? 0} staff</span></span>
                  <Button variant="ghost" size="sm" disabled={busy || loading} aria-label={`Delete department ${d.name}`} onClick={() => delDept(d.id)}><Trash2 className="h-4 w-4 text-slate-400" /></Button>
                </li>
              ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Designations</h2>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-28 flex-1 space-y-1"><Label htmlFor="desTitle">Title</Label><Input id="desTitle" value={desTitle} onChange={(e) => setDesTitle(e.target.value)} /></div>
            <div className="w-36 space-y-1">
              <Label htmlFor="designation-department">Department</Label>
              <Select value={desDept || 'none'} onValueChange={(v) => setDesDept(v === 'none' ? '' : v)}>
                <SelectTrigger id="designation-department"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={busy || loading} aria-label="Add designation" onClick={addDes}><Plus className="h-4 w-4" /></Button>
          </div>
          <ul className="divide-y divide-slate-100">
            {loading ? <li className="py-3 text-sm text-slate-400">Loading…</li> :
              designations.length === 0 ? <li className="py-3 text-sm text-slate-400">No designations yet.</li> :
              designations.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{d.title} {d.department && <span className="text-xs text-slate-400">· {d.department.name}</span>}</span>
                  <Button variant="ghost" size="sm" disabled={busy || loading} aria-label={`Delete designation ${d.title}`} onClick={() => delDes(d.id)}><Trash2 className="h-4 w-4 text-slate-400" /></Button>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
