import React, { useEffect, useState } from 'react';
import { fetchOrMock } from '../../lib/api';
import {
  CalendarCheck,
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface AttendanceRecord { id?: string; date: string; status: string; subject: string; time?: string; remarks?: string; reason?: string; delay?: string; }
interface AttendanceSummary { total: number; present: number; absent: number; late: number; percentage: number; }

const MOCK_RECORDS: AttendanceRecord[] = [
  { date: '2024-05-13', status: 'PRESENT', subject: 'Mathematics', time: '08:00 AM' },
  { date: '2024-05-13', status: 'PRESENT', subject: 'Physics', time: '09:45 AM' },
  { date: '2024-05-12', status: 'ABSENT', subject: 'English', time: '08:00 AM', reason: 'Medical' },
  { date: '2024-05-11', status: 'LATE', subject: 'History', time: '10:00 AM', delay: '15 mins' },
  { date: '2024-05-10', status: 'PRESENT', subject: 'Social Studies', time: '13:00 PM' },
  { date: '2024-05-09', status: 'PRESENT', subject: 'Math', time: '08:00 AM' },
];
const MOCK_SUMMARY: AttendanceSummary = { total: 22, present: 19, absent: 2, late: 1, percentage: 86.4 };

export default function StudentAttendance() {
  const [month, setMonth] = useState('May 2024');
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 });

  useEffect(() => {
    fetchOrMock<{ records: AttendanceRecord[]; summary: AttendanceSummary }>(
      '/api/student/attendance',
      { records: MOCK_RECORDS, summary: MOCK_SUMMARY },
      { emptyWhen: (d) => !d?.records?.length },
    ).then((r) => { setAttendanceData(r.data.records); setSummary(r.data.summary); });
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-aubergine-600" />
            My Attendance
          </h1>
          <p className="text-sm text-slate-500 mt-1">Track your daily presence and punctuality.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Present" value={summary.present} total={summary.total} color="emerald" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard title="Absent" value={summary.absent} total={summary.total} color="rose" icon={<XCircle className="h-5 w-5" />} />
        <StatCard title="Late" value={summary.late} total={summary.total} color="amber" icon={<Clock className="h-5 w-5" />} />
        <StatCard title="Percentage" value={`${summary.percentage}%`} label="Overall" color="indigo" icon={<CalendarCheck className="h-5 w-5" />} />
      </div>

      {/* Main List */}
      <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-surface-raised/50 pb-4">
          <div>
            <CardTitle className="text-lg">Attendance History</CardTitle>
            <CardDescription>View detailed records for the selected period</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="May 2024">May 2024</SelectItem>
                <SelectItem value="April 2024">April 2024</SelectItem>
                <SelectItem value="March 2024">March 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100 dark:border-surface-raised">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {attendanceData.map((record, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(record.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 uppercase tracking-tighter">
                        <Clock className="h-3 w-3" /> {record.time}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{record.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <Badge className={`
                          h-6 px-2 text-[10px] font-bold uppercase tracking-widest border-none
                          ${record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                            record.status === 'ABSENT' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                            'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                        `}>
                          {record.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500 italic max-w-[200px] truncate">
                        {record.remarks || record.reason || record.delay || '-'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Warning */}
      <div className="bg-aubergine-50 dark:bg-aubergine-900/10 p-4 rounded-xl border border-aubergine-100 dark:border-aubergine-900/30 flex gap-4">
        <AlertCircle className="h-5 w-5 text-aubergine-600 shrink-0 mt-0.5" />
        <div className="text-xs text-aubergine-800 dark:text-aubergine-400 leading-relaxed">
          <p className="font-bold uppercase tracking-widest mb-1 text-[10px]">Attendance Policy</p>
          <p>Maintenance of 75% attendance is mandatory to appear for end-of-year examinations. If you have been absent due to medical reasons, please submit your medical certificate to the school office within 3 days.</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, total, label, color, icon }: any) {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50",
    rose: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50",
    amber: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50",
    indigo: "bg-aubergine-50 text-aubergine-600 border-aubergine-100 dark:bg-aubergine-900/20 dark:text-aubergine-400 dark:border-aubergine-900/50"
  };

  return (
    <Card className="border-none shadow-sm dark:bg-surface-indigo">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${colors[color]}`}>
            {icon}
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{title}</span>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 uppercase tracking-tight">{value}</p>
            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-tighter">
              {total ? `Out of ${total} days` : label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
