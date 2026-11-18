import React, { Fragment, useEffect, useState } from 'react';
import { Check, MessageSquareText, Target } from 'lucide-react';
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
  NOT_READY: 'bg-muted text-muted-foreground',
  DEVELOPING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  NEAR_READY: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  TEST_SCHEDULED: 'bg-lavender text-accent-purple',
  PASSED: 'bg-emerald-600 text-white',
};

type Row = { studentId: string; name: string; code: string; readiness: Record<string, string>; reviewedAt?: Record<string, string | null>; notes?: Record<string, string> };

const STALE_DAYS = 60;
const daysSince = (value: string | null | undefined) => value ? Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000) : null;
const isStale = (value: string | null | undefined) => { const days = daysSince(value); return days == null || days > STALE_DAYS; };
const reviewLabel = (value: string | null | undefined) => {
  const days = daysSince(value);
  if (days == null) return 'Never reviewed';
  if (days === 0) return 'Reviewed today';
  return `Reviewed ${new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short' }).format(new Date(value!))}`;
};
type Matrix = { subjects: string[]; statuses: string[]; rows: Row[] };

export default function GedReadinessPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_ged_readiness') || hasPermission('manage_grades');

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [openNotes, setOpenNotes] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

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

  const updateStatus = async (studentId: string, subject: string, status: string, note?: string) => {
    const now = new Date().toISOString();
    setMatrix((prev) => prev && {
      ...prev,
      rows: prev.rows.map((r) => r.studentId === studentId ? {
        ...r,
        readiness: { ...r.readiness, [subject]: status },
        reviewedAt: { ...(r.reviewedAt || {}), [subject]: now },
        notes: note === undefined ? r.notes : { ...(r.notes || {}), [subject]: note },
      } : r),
    });
    const key = `${studentId}:${subject}`;
    setSaving(key);
    try {
      await apiSend('/api/ged-readiness', 'PUT', note === undefined ? { studentId, subject, status } : { studentId, subject, status, note });
      if (note !== undefined) toast.success('Note saved. Families see it in the Family Portal.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    } finally {
      setSaving('');
    }
  };

  const staleCount = matrix?.rows.reduce((sum, r) => sum + matrix.subjects.filter((sub) => isStale(r.reviewedAt?.[sub])).length, 0) ?? 0;
  const totalCells = (matrix?.rows.length ?? 0) * (matrix?.subjects.length ?? 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="h-6 w-6 text-aubergine-600" /> GED Readiness
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track each student's readiness across the four GED subjects.</p>
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Class">{classes.find((c) => c.id === classId)?.name || 'Class'}</SelectValue></SelectTrigger>
          <SelectContent>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {canManage && totalCells > 0 && staleCount > 0 && (
        <div role="status" className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <span className="font-semibold">{staleCount} of {totalCells} ratings</span> have not been reviewed in the last {STALE_DAYS} days. Families see the review date in the Family Portal, so please confirm or update them. Choosing "Still accurate" records today's review without changing the rating.
        </div>
      )}

      <div className="bg-card border border-border rounded-sm shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
            <tr>
              <th className="px-6 py-4 min-w-[220px]">Student</th>
              {(matrix?.subjects || ['RLA', 'MATH', 'SCIENCE', 'SOCIAL_STUDIES']).map((s) => (
                <th key={s} className="px-4 py-4 min-w-[170px]">{SUBJECT_LABELS[s] || s}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && (matrix?.rows.length ?? 0) === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No students in this class.</td></tr>}
            {!loading && matrix?.rows.map((r) => (
              <Fragment key={r.studentId}>
              <tr className="hover:bg-muted/50 align-top">
                <td className="px-6 py-3 font-medium text-foreground">
                  {r.name} <span className="text-xs text-muted-foreground font-mono ml-1">{r.code}</span>
                  {canManage && <button type="button" onClick={() => setOpenNotes(openNotes === r.studentId ? '' : r.studentId)} aria-expanded={openNotes === r.studentId} className="mt-1 flex min-h-8 items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />Notes for family{Object.values(r.notes || {}).filter(Boolean).length ? ` (${Object.values(r.notes || {}).filter(Boolean).length})` : ''}
                  </button>}
                </td>
                {matrix.subjects.map((sub) => {
                  const stale = isStale(r.reviewedAt?.[sub]);
                  return (
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
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px]">
                      <span className={stale ? 'font-semibold text-warning' : 'text-muted-foreground'}>{reviewLabel(r.reviewedAt?.[sub])}</span>
                      {canManage && stale && <button type="button" disabled={saving === `${r.studentId}:${sub}`} onClick={() => updateStatus(r.studentId, sub, r.readiness[sub])} className="inline-flex min-h-7 items-center gap-1 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><Check className="h-3 w-3" aria-hidden="true" />Still accurate</button>}
                    </div>
                  </td>
                  );
                })}
              </tr>
              {canManage && openNotes === r.studentId && (
                <tr className="bg-muted/40">
                  <td colSpan={matrix.subjects.length + 1} className="px-6 py-4">
                    <p className="text-xs text-muted-foreground">Families read these notes in the Family Portal. Keep them short, kind and practical. Many families read in Burmese or Mon.</p>
                    <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {matrix.subjects.map((sub) => {
                        const key = `${r.studentId}:${sub}`;
                        const draft = noteDrafts[key] ?? r.notes?.[sub] ?? '';
                        return (
                          <div key={sub}>
                            <Label htmlFor={`note-${key}`} className="text-xs font-semibold">{SUBJECT_LABELS[sub] || sub}</Label>
                            <textarea id={`note-${key}`} value={draft} maxLength={500} rows={3} onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [key]: e.target.value }))} className="mt-1 block w-full resize-y rounded-md border border-input bg-card p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" placeholder="For example: Practise fractions 15 minutes each evening." />
                            <button type="button" disabled={saving === key || draft === (r.notes?.[sub] ?? '')} onClick={() => updateStatus(r.studentId, sub, r.readiness[sub], draft)} className="mt-2 inline-flex min-h-9 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Save note</button>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
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
