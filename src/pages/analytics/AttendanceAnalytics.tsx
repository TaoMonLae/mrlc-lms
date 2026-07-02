import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiGet } from "../../lib/api";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3
} from "lucide-react";
import { localToday } from '../../lib/dates';

interface SubjectStats {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  uniqueStudents: number;
  rate: number;
}

interface TeacherStats {
  teacherId: string;
  teacherName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

interface AnalyticsData {
  period: { start: string; end: string };
  overall: {
    totalRecords: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    rate: number;
  };
  bySubject?: SubjectStats[];
  byTeacher?: TeacherStats[];
}

export default function AttendanceAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(localToday());
  const [endDate, setEndDate] = useState(localToday());
  const [groupBy, setGroupBy] = useState<"subject" | "teacher" | "both">("both");
  const [userRole, setUserRole] = useState<"ADMIN" | "TEACHER">("TEACHER");

  useEffect(() => {
    // Get user role from session
    const role = sessionStorage.getItem('user_role') as "ADMIN" | "TEACHER" | null;
    if (role) setUserRole(role);
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [startDate, endDate, groupBy]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      params.append("groupBy", groupBy);

      const response = await apiGet<AnalyticsData>(`/api/analytics/attendance?${params}`);
      setData(response);
    } catch (err: any) {
      toast.error(err.message || "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const getRateColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 80) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getRateBgColor = (rate: number) => {
    if (rate >= 90) return "bg-emerald-100 dark:bg-emerald-900/30";
    if (rate >= 80) return "bg-amber-100 dark:bg-amber-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-12 w-12 rounded-full ${color} flex items-center justify-center`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProgressBar = ({ value, total, color }: { value: number; total: number; color: string }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase">Attendance Analytics</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Comprehensive attendance insights and statistics.</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Start Date</span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">End Date</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10"
              />
            </div>
            {userRole === "ADMIN" && (
              <div className="flex flex-col gap-1.5 min-w-[140px]">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Group By</span>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subject">Subject</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">Loading analytics...</p>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <StatCard
              title="Total Records"
              value={data.overall.totalRecords}
              icon={BarChart3}
              color="bg-blue-100 dark:bg-blue-900/30"
            />
            <StatCard
              title="Present"
              value={data.overall.present}
              icon={UserCheck}
              color="bg-emerald-100 dark:bg-emerald-900/30"
              subtitle={`${data.overall.rate}% rate`}
            />
            <StatCard
              title="Absent"
              value={data.overall.absent}
              icon={UserX}
              color="bg-red-100 dark:bg-red-900/30"
            />
            <StatCard
              title="Late"
              value={data.overall.late}
              icon={Clock}
              color="bg-amber-100 dark:bg-amber-900/30"
            />
            <StatCard
              title="Excused"
              value={data.overall.excused}
              icon={AlertCircle}
              color="bg-blue-100 dark:bg-blue-900/30"
            />
          </div>

          {/* Overall Rate Card */}
          <Card className={`border-slate-200 dark:border-surface-raised ${getRateBgColor(data.overall.rate)} shadow-sm`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Overall Attendance Rate</p>
                  <p className={`text-4xl font-bold ${getRateColor(data.overall.rate)} mt-1`}>
                    {data.overall.rate}%
                  </p>
                </div>
                <div className={`h-16 w-16 rounded-full ${getRateBgColor(data.overall.rate)} flex items-center justify-center`}>
                  {data.overall.rate >= 80 ? (
                    <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={data.overall.present} total={data.overall.totalRecords} color="bg-emerald-500" />
              </div>
            </CardContent>
          </Card>

          {/* By Subject */}
          {data.bySubject && data.bySubject.length > 0 && (
            <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Attendance by Subject
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.bySubject.map(subject => (
                    <div key={subject.subjectId} className="p-4 bg-slate-50 dark:bg-surface-raised/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge className={`h-3 w-3 rounded-full p-0 ${subject.subjectColor.replace('bg-', 'bg-') || 'bg-blue-500'}`} />
                          <div>
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{subject.subjectName}</p>
                            <p className="text-xs text-slate-500">{subject.uniqueStudents} students · {subject.total} sessions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${getRateColor(subject.rate)}`}>{subject.rate}%</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                          <p className="font-bold text-emerald-700 dark:text-emerald-300">{subject.present}</p>
                          <p className="text-emerald-600 dark:text-emerald-400">Present</p>
                        </div>
                        <div className="text-center p-2 bg-red-100 dark:bg-red-900/30 rounded">
                          <p className="font-bold text-red-700 dark:text-red-300">{subject.absent}</p>
                          <p className="text-red-600 dark:text-red-400">Absent</p>
                        </div>
                        <div className="text-center p-2 bg-amber-100 dark:bg-amber-900/30 rounded">
                          <p className="font-bold text-amber-700 dark:text-amber-300">{subject.late}</p>
                          <p className="text-amber-600 dark:text-amber-400">Late</p>
                        </div>
                        <div className="text-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
                          <p className="font-bold text-blue-700 dark:text-blue-300">{subject.excused}</p>
                          <p className="text-blue-600 dark:text-blue-400">Excused</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <ProgressBar value={subject.present} total={subject.total} color="bg-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* By Teacher (Admin Only) */}
          {data.byTeacher && data.byTeacher.length > 0 && (
            <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4" /> Attendance by Teacher
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.byTeacher.map(teacher => (
                    <div key={teacher.teacherId} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-surface-raised/20 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <Users className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{teacher.teacherName}</p>
                          <p className="text-xs text-slate-500">{teacher.total} sessions recorded</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2 text-xs">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded font-bold">{teacher.present}P</span>
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold">{teacher.absent}A</span>
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded font-bold">{teacher.late}L</span>
                        </div>
                        <div className={`text-xl font-bold ${getRateColor(teacher.rate)} w-16 text-right`}>
                          {teacher.rate}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">Select a date range to view analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
