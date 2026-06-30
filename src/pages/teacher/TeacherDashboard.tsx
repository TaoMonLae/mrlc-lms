import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, Clock, CheckCircle2, GraduationCap, Calendar, ArrowRight, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { apiGet } from "../../lib/api";

function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

interface DashStats { studentCount: number; classCount: number; attendanceRate: number; upcomingExamCount: number; }
interface DashboardData {
  stats: DashStats;
  classes: { id: string; name: string; level: string; room: string; students: number }[];
  attendanceData: { day: string; rate: number }[];
  upcomingExams: { id: string | number; title: string; date: string; time: string; class: string }[];
  recentPerformance: { id: string | number; student: string; class: string; score: string; trend: string }[];
}
interface AnnouncementItem { id: string; title: string; body: string; createdAt: string; }

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    stats: { studentCount: 0, classCount: 0, attendanceRate: 0, upcomingExamCount: 0 },
    classes: [], attendanceData: [], upcomingExams: [], recentPerformance: [],
  });

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  useEffect(() => {
    apiGet<DashboardData>('/api/teacher/dashboard')
      .then((r) => setData(r ?? {
        stats: { studentCount: 0, classCount: 0, attendanceRate: 0, upcomingExamCount: 0 },
        classes: [], attendanceData: [], upcomingExams: [], recentPerformance: [],
      }))
      .catch(() => {});
    apiGet<AnnouncementItem[]>('/api/announcements')
      .then((r) => setAnnouncements((r ?? []).slice(0, 4)))
      .catch(() => setAnnouncements([]));
  }, []);

  const { stats, classes: assignedClasses, attendanceData, upcomingExams, recentPerformance } = data;
  const teacherStats = [
    { title: "My Students", value: String(stats.studentCount), description: `Across ${stats.classCount} classes`, icon: Users, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { title: "Attendance", value: `${stats.attendanceRate}%`, description: "Average this period", icon: CheckCircle2, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
    { title: "My Classes", value: String(stats.classCount), description: "Assigned to you", icon: BookOpen, color: "text-aubergine-500", bgColor: "bg-aubergine-500/10" },
    { title: "Exams Slated", value: String(stats.upcomingExamCount), description: "Upcoming exams", icon: GraduationCap, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Teacher Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            {stats.classCount > 0
              ? `Managing ${stats.classCount} assigned ${stats.classCount === 1 ? 'class' : 'classes'} with ${stats.studentCount} students.`
              : 'No classes assigned to you yet.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            id="dashboard-mark-attendance-btn"
            variant="outline"
            size="sm"
            className="bg-white border-slate-200 text-slate-700 shadow-sm font-bold text-[11px] uppercase tracking-wider h-10 px-4"
            onClick={() => navigate('/teacher/attendance')}
          >
            Mark Attendance
          </Button>
          <Button
            id="dashboard-planner-btn"
            variant="outline"
            size="sm"
            className="bg-white border-slate-200 text-slate-700 shadow-sm font-bold text-[11px] uppercase tracking-wider h-10 px-4"
            onClick={() => navigate('/teacher/planner')}
          >
            Lesson Planner
          </Button>
          <Button
            id="dashboard-new-assessment-btn"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-bold text-[11px] uppercase tracking-wider h-10 px-4"
            onClick={() => navigate('/exams/new')}
          >
            New Assessment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {teacherStats.map((stat) => (
          <Card key={stat.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:bg-surface-indigo/50 dark:border-surface-raised">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">{stat.title}</span>
              <div className={`rounded-full p-2 ${stat.bgColor} ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</div>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-300">
              {stat.description}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-surface-indigo/50 dark:border-surface-raised flex flex-col">
          <div className="flex items-center justify-between border-b px-6 py-4 dark:border-surface-raised">
            <h3 className="font-bold text-slate-800 text-sm dark:text-slate-100">My Assigned Classes</h3>
            <button
              id="dashboard-full-schedule-link"
              className="text-xs text-aubergine-600 font-bold uppercase tracking-widest cursor-pointer hover:underline focus:outline-none"
              onClick={() => navigate('/teacher/timetable')}
            >
              Full Schedule
            </button>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-wider font-bold dark:bg-surface-raised/30">
                <tr>
                  <th className="px-6 py-3">Module Name</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Size</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignedClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50 transition-colors group dark:hover:bg-surface-raised/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{sanitizeText(cls.name)}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{sanitizeText(cls.level)}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{sanitizeText(cls.room)}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{cls.students} Learners</td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-aubergine-600"
                        title="View class details"
                        onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-8">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-surface-indigo/50 dark:border-surface-raised">
            <div className="border-b px-6 py-4 dark:border-surface-raised">
              <h3 className="font-bold text-slate-800 text-sm dark:text-slate-100">Attendance This Week</h3>
            </div>
            <CardContent className="p-4 pt-6">
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 11, fontWeight: 'bold' }} 
                      dy={10}
                      className="text-slate-500"
                    />
                    <YAxis 
                      hide 
                      domain={[0, 100]}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ fontWeight: 'bold' }}
                    />
                    <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                      {attendanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.rate > 90 ? '#10b981' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="font-bold text-slate-500">Above 90%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="font-bold text-slate-500">Below 90%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-surface-indigo/50 dark:border-surface-raised flex flex-col">
            <div className="border-b px-6 py-4 dark:border-surface-raised flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm dark:text-slate-100">Upcoming Exams</h3>
              <Calendar className="h-4 w-4 text-slate-400" />
            </div>
            <CardContent className="p-4 space-y-4">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="p-3 rounded-lg bg-slate-50 dark:bg-surface-raised/30 border border-slate-100 dark:border-surface-raised flex justify-between items-center group hover:border-aubergine-200 transition-colors">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{sanitizeText(exam.title)}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">{sanitizeText(exam.class)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-aubergine-600 uppercase">{exam.date}</p>
                    <p className="text-[10px] font-bold text-slate-400">{exam.time}</p>
                  </div>
                </div>
              ))}
              <Button
                id="dashboard-manage-calendar-btn"
                variant="ghost"
                className="w-full mt-2 text-[10px] font-bold text-slate-500 hover:text-aubergine-600 uppercase tracking-widest h-8"
                onClick={() => navigate('/teacher/timetable')}
              >
                Manage Calendar
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-surface-indigo/50 dark:border-surface-raised">
          <div className="border-b px-6 py-4 dark:border-surface-raised">
            <h3 className="font-bold text-slate-800 text-sm dark:text-slate-100">Performance Snapshot</h3>
          </div>
          <div className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentPerformance.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors dark:hover:bg-surface-raised/50">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{sanitizeText(item.student)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{sanitizeText(item.class)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{item.score}</p>
                      <span className={`text-[9px] font-heavy uppercase tracking-widest ${
                        item.trend === 'up' ? 'text-emerald-500' : 
                        item.trend === 'down' ? 'text-red-500' : 'text-slate-400'
                      }`}>
                        {item.trend === 'up' ? '↑ Rising' : item.trend === 'down' ? '↓ Falling' : '→ Stable'}
                      </span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50/50 dark:bg-surface-raised/10">
              <Button
                id="dashboard-full-gradebook-btn"
                size="sm"
                variant="outline"
                className="w-full text-[10px] font-bold uppercase tracking-widest h-9 bg-white dark:bg-surface-indigo dark:border-surface-raised"
                onClick={() => navigate('/teacher/reports')}
              >
                Full Gradebook
              </Button>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:bg-surface-indigo/50 dark:border-surface-raised flex flex-col">
          <div className="border-b px-6 py-4 dark:border-surface-raised flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm dark:text-slate-100">Announcements</h3>
            {announcements.length > 0 && (
              <Badge variant="secondary" className="font-bold text-[10px] tracking-widest uppercase">{announcements.length} Recent</Badge>
            )}
          </div>
          <CardContent className="p-6 space-y-4">
            {announcements.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400">
                <BookOpen className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-xs font-semibold">No announcements yet.</p>
              </div>
            ) : (
              announcements.map((ann) => (
                <button
                  key={ann.id}
                  onClick={() => navigate(`/announcements/${ann.id}`)}
                  className="w-full text-left flex gap-4 items-start group focus:outline-none"
                >
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-aubergine-50 dark:bg-aubergine-900/20 flex items-center justify-center text-aubergine-600">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase truncate group-hover:text-aubergine-600 transition-colors">{sanitizeText(ann.title)}</p>
                    <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-300 font-medium line-clamp-2">{sanitizeText(ann.body)}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                      {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </button>
              ))
            )}
            <Button
              id="dashboard-announcements-btn"
              variant="ghost"
              className="w-full mt-2 text-[10px] font-bold text-slate-500 hover:text-aubergine-600 uppercase tracking-widest h-8"
              onClick={() => navigate('/announcements')}
            >
              View All Announcements
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
