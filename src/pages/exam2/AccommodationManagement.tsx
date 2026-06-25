import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { Accessibility, Trash2, Plus } from 'lucide-react';

const TOGGLES: [string, string][] = [
  ['largerText', 'Larger text'], ['highContrast', 'High contrast'], ['screenReader', 'Screen reader'],
  ['reducedDistraction', 'Reduced distraction'], ['calculatorAllowed', 'Calculator'], ['additionalBreaks', 'Additional breaks'],
  ['separateRoom', 'Separate room'], ['readerSupport', 'Reader support'], ['scribeSupport', 'Scribe support'],
];

export default function AccommodationManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ studentId: '', extraTimePercent: '', extraTimeMinutes: '' });

  const load = () => apiGet('/api/accommodations').then((d) => setRows(d || [])).catch(() => setRows([]));
  useEffect(() => { load(); apiGet('/api/students').then((d) => setStudents(Array.isArray(d) ? d : [])).catch(() => setStudents([])); }, []);

  const create = async () => {
    if (!form.studentId) { toast.error('Select a student'); return; }
    try {
      await apiSend('/api/accommodations', 'POST', {
        ...form,
        extraTimePercent: form.extraTimePercent === '' ? null : Number(form.extraTimePercent),
        extraTimeMinutes: form.extraTimeMinutes === '' ? null : Number(form.extraTimeMinutes),
      });
      toast.success('Accommodation saved'); setForm({ studentId: '', extraTimePercent: '', extraTimeMinutes: '' }); load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };
  const remove = async (id: string) => { if (!confirm('Remove accommodation?')) return; await apiSend(`/api/accommodations/${id}`, 'DELETE'); load(); };

  const studentName = (s: any) => s?.user ? `${s.user.firstName} ${s.user.lastName}` : (s?.firstName ? `${s.firstName} ${s.lastName}` : s?.studentCode || s?.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Accessibility className="h-6 w-6 text-aubergine-600" /> Accommodations</h1>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-sm uppercase tracking-widest text-slate-800 dark:text-white">New accommodation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Student</Label>
            <select className="w-full h-10 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-canvas px-3 text-sm" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Select…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{studentName(s)}</option>)}
            </select>
          </div>
          <div><Label>Extra time %</Label><Input type="number" value={form.extraTimePercent} onChange={(e) => setForm({ ...form, extraTimePercent: e.target.value })} /></div>
          <div><Label>Extra minutes</Label><Input type="number" value={form.extraTimeMinutes} onChange={(e) => setForm({ ...form, extraTimeMinutes: e.target.value })} /></div>
        </div>
        <div className="flex flex-wrap gap-3">
          {TOGGLES.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"><input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} /> {label}</label>
          ))}
        </div>
        <Button onClick={create} className="bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-1" /> Add accommodation</Button>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-4">
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{studentName(r.student)}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {[r.extraTimePercent ? `+${r.extraTimePercent}%` : null, r.extraTimeMinutes ? `+${r.extraTimeMinutes}m` : null, ...TOGGLES.filter(([k]) => r[k]).map(([, l]) => l)].filter(Boolean).join(' · ') || 'No options set'}
              </p>
            </div>
            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        {rows.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 dark:border-surface-raised p-8 text-center text-slate-500">No accommodations configured.</div>}
      </div>
    </div>
  );
}
