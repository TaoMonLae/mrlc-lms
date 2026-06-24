import React, { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { apiGet } from '../../lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  ASSIGNMENT: 'Assignment', QUIZ: 'Quiz', MIDTERM: 'Midterm', FINAL: 'Final', MOCK_GED: 'Mock GED',
};
const SUBJECT_LABELS: Record<string, string> = { RLA: 'RLA', MATH: 'Math', SCIENCE: 'Science', SOCIAL_STUDIES: 'Social Studies' };
const STATUS_LABELS: Record<string, string> = {
  NOT_READY: 'Not Ready', DEVELOPING: 'Developing', NEAR_READY: 'Near Ready', READY: 'Ready', TEST_SCHEDULED: 'Scheduled', PASSED: 'Passed',
};
const GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'];

interface Report {
  studentCount: number;
  gradedCount: number;
  classAverage: number | null;
  categoryAverages: Record<string, number | null>;
  distribution: Record<string, number>;
  warnings: number;
  readinessDistribution: Record<string, Record<string, number>>;
}

export default function GradebookClassReport() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('all');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<any[]>('/api/classes').then((cs) => {
      const list = cs.map((c) => ({ id: c.id, name: c.name }));
      setClasses(list);
      if (list[0]) setClassId(list[0].id);
    }).catch(() => {});
    apiGet<any[]>('/api/subjects').then((ss) => setSubjects(ss.map((s) => ({ id: s.id, name: s.name })))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    const params = new URLSearchParams({ classId, ...(subjectId !== 'all' ? { subjectId } : {}) });
    apiGet<Report>(`/api/reports/class-performance?${params}`)
      .then(setReport)
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
  }, [classId, subjectId]);

  const maxDist = report ? Math.max(1, ...GRADES.map((g) => report.distribution[g] || 0)) : 1;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-aubergine-600" /> Class Performance
          </h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Grade distribution, category averages and GED readiness across the class.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && <div className="py-16 text-center text-slate-500">Loading…</div>}

      {!loading && report && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Students', value: report.studentCount },
              { label: 'Graded', value: report.gradedCount },
              { label: 'Class Average', value: report.classAverage != null ? `${report.classAverage}%` : '—' },
              { label: 'Academic Warnings', value: report.warnings, warn: report.warnings > 0 },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.warn ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade distribution */}
            <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm">Grade Distribution</h3>
              <div className="flex items-end gap-3 h-44">
                {GRADES.map((g) => (
                  <div key={g} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-slate-500">{report.distribution[g] || 0}</span>
                    <div className="w-full rounded-t bg-aubergine-500" style={{ height: `${((report.distribution[g] || 0) / maxDist) * 130}px` }} />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{g}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category averages */}
            <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm">Category Averages</h3>
              <div className="space-y-3">
                {Object.keys(CATEGORY_LABELS).map((c) => {
                  const v = report.categoryAverages[c];
                  return (
                    <div key={c}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{CATEGORY_LABELS[c]}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{v != null ? `${v}%` : '—'}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-surface-raised overflow-hidden">
                        <div className="h-full bg-aubergine-500" style={{ width: `${v ?? 0}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* GED readiness distribution */}
          <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-sm">GED Readiness Distribution</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-2 pr-4">Subject</th>
                    {Object.keys(STATUS_LABELS).map((st) => <th key={st} className="py-2 px-3 text-center">{STATUS_LABELS[st]}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.keys(SUBJECT_LABELS).map((sub) => (
                    <tr key={sub}>
                      <td className="py-2 pr-4 font-medium text-slate-900 dark:text-white">{SUBJECT_LABELS[sub]}</td>
                      {Object.keys(STATUS_LABELS).map((st) => (
                        <td key={st} className="py-2 px-3 text-center text-slate-600 dark:text-slate-300">{report.readinessDistribution?.[sub]?.[st] || 0}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
