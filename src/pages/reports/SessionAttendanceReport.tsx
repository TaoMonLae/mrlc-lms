import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiGet } from "../../lib/api";
import {
  Calendar,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock
} from "lucide-react";

interface SessionAttendanceRow {
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

interface SubjectStats {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  totalStudents: number;
  avgRate: number;
  totalSessions: number;
}

interface ReportData {
  rows: SessionAttendanceRow[];
  subjectStats: SubjectStats[];
  overall: {
    totalRecords: number;
    overallRate: number;
    studentSubjectPairs: number;
    perfectCount: number;
    atRiskCount: number;
  };
}

export default function SessionAttendanceReport() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [classId, setClassId] = useState("all");
  const [subjectId, setSubjectId] = useState("all");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; color: string }[]>([]);

  useEffect(() => {
    // Load classes
    apiGet<{ id: string; name: string }[]>('/api/classes')
      .then(r => setClasses(r ?? []))
      .catch(() => setClasses([]));

    // Load subjects
    apiGet<{ id: string; name: string; color: string }[]>('/api/subjects')
      .then(r => setSubjects(r ?? []))
      .catch(() => setSubjects([]));
  }, []);

  useEffect(() => {
    loadReport();
  }, [classId, subjectId, month]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classId !== "all") params.append("classId", classId);
      if (subjectId !== "all") params.append("subjectId", subjectId);
      params.append("month", month);

      const response = await apiGet<ReportData>(`/api/reports/session-attendance?${params}`);
      setData(response);
    } catch (err: any) {
      toast.error(err.message || "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!data) return;

    const headers = ["Student", "Code", "Class", "Subject", "Total Sessions", "Present", "Absent", "Late", "Excused", "Attendance Rate"];
    const rows = data.rows.map(r => [
      r.studentName,
      r.studentCode,
      r.className,
      r.subjectName,
      r.total.toString(),
      r.present.toString(),
      r.absent.toString(),
      r.late.toString(),
      r.excused.toString(),
      `${r.rate}%`
    ]);

    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `session-attendance-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Report exported to CSV");
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-600 bg-emerald-50";
    if (rate >= 80) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getStatusIcon = (rate: number) => {
    if (rate >= 90) return <TrendingUp className="h-4 w-4" />;
    if (rate >= 80) return <Clock className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase">Session Attendance Report</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">View attendance by subject and session.</p>
        </div>
        <Button onClick={exportToCSV} disabled={!data || loading} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Month</span>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Class</span>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Subject</span>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Student-Subject Pairs</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{data.overall.studentSubjectPairs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Perfect Attendance</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{data.overall.perfectCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">At Risk (&lt;80%)</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{data.overall.atRiskCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Overall Rate</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{data.overall.overallRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subject Stats */}
      {data && data.subjectStats.length > 0 && (
        <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Subject Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.subjectStats.map(stat => (
                <div key={stat.subjectId} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-surface-raised/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={`h-3 w-3 rounded-full p-0 ${stat.subjectColor.replace('bg-', 'bg-') || 'bg-blue-500'}`} />
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{stat.subjectName}</p>
                      <p className="text-xs text-slate-500">{stat.totalStudents} students · {stat.totalSessions} sessions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${stat.avgRate >= 80 ? 'text-emerald-600' : stat.avgRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {stat.avgRate}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      {data && data.rows.length > 0 ? (
        <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-surface-raised/20 border-b border-slate-200 dark:border-surface-raised">
                <tr>
                  <th className="text-left p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Student</th>
                  <th className="text-left p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Subject</th>
                  <th className="text-center p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Total</th>
                  <th className="text-center p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Present</th>
                  <th className="text-center p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Absent</th>
                  <th className="text-center p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Late</th>
                  <th className="text-center p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Excused</th>
                  <th className="text-center p-4 text-[10px] font-black uppercase tracking-wider text-slate-500">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.rows.map((row, i) => (
                  <tr key={`${row.studentId}-${row.subjectId}-${i}`} className="hover:bg-slate-50 dark:hover:bg-surface-raised/10 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{row.studentName}</p>
                        <p className="text-[10px] text-slate-500">{row.studentCode} · {row.className}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge className={`h-2 w-2 rounded-full p-0 ${row.subjectColor.replace('bg-', 'bg-') || 'bg-blue-500'}`} />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{row.subjectName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center text-sm font-medium text-slate-600 dark:text-slate-400">{row.total}</td>
                    <td className="p-4 text-center text-sm font-medium text-emerald-600">{row.present}</td>
                    <td className="p-4 text-center text-sm font-medium text-red-600">{row.absent}</td>
                    <td className="p-4 text-center text-sm font-medium text-amber-600">{row.late}</td>
                    <td className="p-4 text-center text-sm font-medium text-blue-600">{row.excused}</td>
                    <td className="p-4 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(row.rate)}`}>
                        {getStatusIcon(row.rate)}
                        {row.rate}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : loading ? (
        <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">Loading report...</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">No attendance records found for the selected filters.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
