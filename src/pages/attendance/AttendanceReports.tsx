import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type AttendanceClass = { id: string; name: string };
type AttendanceReportRow = {
  studentId: string;
  name: string;
  code: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
};
type AttendanceReport = {
  rows: AttendanceReportRow[];
  classAverage: number;
  perfectCount: number;
  atRiskCount: number;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AttendanceReportsPage() {
  const now = new Date();
  const [classes, setClasses] = useState<AttendanceClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1));
  const [year] = useState<number>(now.getFullYear());
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/classes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (Array.isArray(data)) {
          setClasses(data.map((c: any) => ({ id: c.id, name: c.name })));
        }
      })
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('auth_token');
        const monthParam = `${year}-${String(selectedMonth).padStart(2, '0')}`;
        const params = new URLSearchParams({ classId: selectedClass, month: monthParam });
        const res = await fetch(`/api/reports/attendance?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch report');
        const data = await res.json();
        setReport(data);
      } catch (error) {
        console.error('Error fetching attendance report:', error);
        toast.error('Failed to load attendance report');
        setReport(null);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [selectedClass, selectedMonth, year]);

  const rows = report?.rows ?? [];
  const classLabel = selectedClass === 'all' ? 'All Classes' : classes.find((c) => c.id === selectedClass)?.name || 'Selected Class';
  const monthLabel = `${MONTHS[Number(selectedMonth) - 1]} ${year}`;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/attendance" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Record Attendance
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Reports</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Monthly overview of student attendance records.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="text-slate-700" onClick={() => window.print()} disabled={loading || rows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="space-y-2 w-full sm:w-[250px]">
          <Label>Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 w-full sm:w-[200px]">
          <Label>Month</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, idx) => (
                <SelectItem key={m} value={String(idx + 1)}>{m} {year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1"></div>

        {report && (
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 flex-wrap">
            <div>Class Average: <span className="font-bold text-slate-900 dark:text-white">{report.classAverage}%</span></div>
            <div>Perfect: <span className="font-bold text-emerald-600">{report.perfectCount}</span></div>
            <div>At Risk: <span className="font-bold text-red-600">{report.atRiskCount}</span></div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
        <div className="hidden print:block p-6 border-b">
          <h2 className="text-xl font-bold text-slate-900">Attendance Report</h2>
          <p className="text-sm text-slate-600">{classLabel} · {monthLabel}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
              <tr>
                <th className="px-6 py-4 min-w-[200px]">Student</th>
                <th className="px-6 py-4">Student ID</th>
                <th className="px-4 py-4 text-center text-emerald-600">Present</th>
                <th className="px-4 py-4 text-center text-red-600">Absent</th>
                <th className="px-4 py-4 text-center text-amber-600">Late</th>
                <th className="px-4 py-4 text-center text-blue-600">Excused</th>
                <th className="px-4 py-4 text-center">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading report...</td>
                </tr>
              )}
              {!loading && rows.map(student => (
                <tr key={student.studentId} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-slate-900 dark:text-white">
                    <Link to={`/students/${student.studentId}`} className="hover:underline hover:text-aubergine-600">{student.name}</Link>
                  </td>
                  <td className="px-6 py-3 text-slate-500 font-mono">{student.code || '—'}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600">{student.present}</td>
                  <td className="px-4 py-3 text-center font-bold text-red-600">{student.absent}</td>
                  <td className="px-4 py-3 text-center font-bold text-amber-600">{student.late}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{student.excused}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="outline" className={student.rate >= 80 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-red-600 border-red-200 bg-red-50'}>
                      {student.rate}%
                    </Badge>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No attendance records found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        @media print {
          nav, aside, header, .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
