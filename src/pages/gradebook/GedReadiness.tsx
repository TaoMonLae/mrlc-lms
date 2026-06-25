import React, { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { apiGet, apiSend } from '../../lib/api';
import { usePermissions } from '../../lib/permissions';

const SUBJECT_LABELS: Record<string, string> = {
  RLA: 'RLA',
  MATH: 'Math',
  SCIENCE: 'Science',
  SOCIAL_STUDIES: 'Social Studies',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_READY: 'Not Ready',
  DEVELOPING: 'Developing',
  NEAR_READY: 'Near Ready',
  READY: 'Ready',
  TEST_SCHEDULED: 'Test Scheduled',
  PASSED: 'Passed',
};

export const STATUS_STYLES: Record<string, string> = {
  NOT_READY: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  DEVELOPING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  NEAR_READY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  TEST_SCHEDULED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  PASSED: 'bg-emerald-600 text-white',
};

type Row = { studentId: string; name: string; code: string; readiness: Record<string, string> };
type Matrix = { subjects: string[]; statuses: string[]; rows: Row[] };

export default function GedReadinessPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_ged_readiness') || hasPermission('manage_grades');

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');

  useEffect(() => {
    apiGet<any[]>('/api/classes').then((cs) => {
      const list = cs.map((c) => ({ id: c.id, name: c.name }));
      setClasses(list);
      if (list[0]) setClassId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    apiGet<Matrix>(`/api/ged-readiness?classId=${classId}`)
      .then(setMatrix)
      .catch(() => toast.error('Failed to load GED readiness'))
      .finally(() => setLoading(false));
  }, [classId]);

  const updateStatus = async (studentId: string, subject: string, status: string) => {
    setMatrix((prev) => prev && {
      ...prev,
      rows: prev.rows.map((r) => r.studentId === studentId ? { ...r, readiness: { ...r.readiness, [subject]: status } } : r),
    });
    const key = `${studentId}:${subject}`;
    setSaving(key);
    try {
      await apiSend('/api/ged-readiness', 'PUT', { studentId, subject, status });
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Target className="h-6 w-6 text-aubergine-600" /> GED Readiness
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Track each student's readiness across the four GED subjects.</p>
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Class">{classes.find((c) => c.id === classId)?.name || 'Class'}</SelectValue></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
            <tr>
              <th className="px-6 py-4 min-w-[220px]">Student</th>
              {(matrix?.subjects || ['RLA', 'MATH', 'SCIENCE', 'SOCIAL_STUDIES']).map((s) => (
                <th key={s} className="px-4 py-4 min-w-[170px]">{SUBJECT_LABELS[s] || s}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading…</td></tr>}
            {!loading && (matrix?.rows.length ?? 0) === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No students in this class.</td></tr>}
            {!loading && matrix?.rows.map((r) => (
              <tr key={r.studentId} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{r.name} <span className="text-xs text-slate-400 font-mono ml-1">{r.code}</span></td>
                {matrix.subjects.map((sub) => (
                  <td key={sub} className="px-4 py-3">
                    {canManage ? (
                      <Select value={r.readiness[sub]} onValueChange={(v) => updateStatus(r.studentId, sub, v)}>
                        <SelectTrigger className={`h-9 ${saving === `${r.studentId}:${sub}` ? 'opacity-60' : ''}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {matrix.statuses.map((st) => <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold ${STATUS_STYLES[r.readiness[sub]] || ''}`}>
                        {STATUS_LABELS[r.readiness[sub]] || r.readiness[sub]}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([k, l]) => (
          <span key={k} className={`px-2.5 py-1 rounded-md text-xs font-semibold ${STATUS_STYLES[k]}`}>{l}</span>
        ))}
      </div>
    </div>
  );
}
