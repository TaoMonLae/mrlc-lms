import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Search, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CLASSES = [
  { id: 'c1', name: 'GED Social Studies' },
  { id: 'c2', name: 'Pre-GED English' },
  { id: 'c3', name: 'GED Math Prep' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Generate fake calendar data for demo
const generateDays = () => Array.from({ length: 15 }, (_, i) => i + 1);
const MOCK_REPORT_DATA = [
  { id: 's1', name: 'Min Khant Aung', present: 13, absent: 1, late: 1, excused: 0, days: generateDays().map(() => Math.random() > 0.1 ? 'P' : Math.random() > 0.5 ? 'A' : 'L') },
  { id: 's2', name: 'Zun Pwint Phyu', present: 14, absent: 0, late: 0, excused: 1, days: generateDays().map(() => Math.random() > 0.05 ? 'P' : 'E') },
  { id: 's3', name: 'Aung Ko Myat', present: 11, absent: 2, late: 2, excused: 0, days: generateDays().map(() => Math.random() > 0.2 ? 'P' : Math.random() > 0.5 ? 'A' : 'L') },
  { id: 's5', name: 'Kyaw Zin Latt', present: 15, absent: 0, late: 0, excused: 0, days: generateDays().map(() => 'P') },
];

export default function AttendanceReportsPage() {
  const [selectedClass, setSelectedClass] = useState<string>('c1');
  const [selectedMonth, setSelectedMonth] = useState<string>('May');

  const days = generateDays();

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'P': return 'bg-emerald-100 text-emerald-700 font-bold dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'A': return 'bg-red-100 text-red-700 font-bold dark:bg-red-900/30 dark:text-red-400';
      case 'L': return 'bg-amber-100 text-amber-700 font-bold dark:bg-amber-900/30 dark:text-amber-400';
      case 'E': return 'bg-blue-100 text-blue-700 font-bold dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/attendance" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Record Attendance
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Attendance Reports</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">Monthly overview of student attendance records.</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="text-slate-700">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="space-y-2 w-full sm:w-[250px]">
          <Label>Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {CLASSES.map(c => (
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
              {MONTHS.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1"></div>
        
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-400 flex-wrap">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-100 flex items-center justify-center text-[8px] text-emerald-700">P</span> Present</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-100 flex items-center justify-center text-[8px] text-red-700">A</span> Absent</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-100 flex items-center justify-center text-[8px] text-amber-700">L</span> Late</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-100 flex items-center justify-center text-[8px] text-blue-700">E</span> Excused</div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 min-w-[200px] border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-slate-50 dark:bg-slate-800/90 z-10">Student</th>
                {days.map(d => (
                  <th key={d} className="px-2 py-4 text-center min-w-[40px] border-r border-slate-100 dark:border-slate-800">{d}</th>
                ))}
                <th className="px-4 py-4 text-center text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10 border-r border-emerald-100 dark:border-emerald-900/30">P</th>
                <th className="px-4 py-4 text-center text-red-600 bg-red-50/50 dark:bg-red-900/10 border-r border-red-100 dark:border-red-900/30">A</th>
                <th className="px-4 py-4 text-center text-amber-600 bg-amber-50/50 dark:bg-amber-900/10">L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {MOCK_REPORT_DATA.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-3 font-semibold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 z-10 transition-colors group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50">
                    {student.name}
                  </td>
                  {student.days.map((status, idx) => (
                    <td key={idx} className="p-1 text-center border-r border-slate-100 dark:border-slate-800">
                      <div className={`w-full h-8 flex items-center justify-center rounded-sm text-[11px] ${getStatusColor(status)}`}>
                        {status}
                      </div>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/20 dark:bg-emerald-900/10 border-r border-emerald-100 dark:border-emerald-900/30">{student.present}</td>
                  <td className="px-4 py-3 text-center font-bold text-red-600 bg-red-50/20 dark:bg-red-900/10 border-r border-red-100 dark:border-red-900/30">{student.absent}</td>
                  <td className="px-4 py-3 text-center font-bold text-amber-600 bg-amber-50/20 dark:bg-amber-900/10">{student.late}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
