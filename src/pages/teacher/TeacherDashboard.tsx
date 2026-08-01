import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, Clock, CheckCircle2, GraduationCap, Calendar, ArrowRight, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../lib/api";
import { DailyQuestCard } from "@/src/components/daily-quest/DailyQuestCard";
import { WordTrailCard } from "@/src/components/word-trail/WordTrailCard";
import { useUser } from "@/src/lib/permissions";

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
interface TodaySession {
  id: string;
  subjectName: string | null;
  className: string | null;
  startTime: string;
  endTime: string;
  room: string | null;
  status?: string;
  scheduleType?: string;
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [data, setData] = useState<DashboardData>({
    stats: { studentCount: 0, classCount: 0, attendanceRate: 0, upcomingExamCount: 0 },
    classes: [], attendanceData: [], upcomingExams: [], recentPerformance: [],
  });

  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [todaySessions, setTodaySessions] = useState<TodaySession[]>([]);

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
    // Today's sessions — each one deep-links into attendance for that session.
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    apiGet<TodaySession[]>(`/api/timetable?dayOfWeek=${dayNames[new Date().getDay()]}&scheduleType=CLASS&status=ACTIVE`)
      .then((r) => setTodaySessions((r ?? []).sort((a, b) => a.startTime.localeCompare(b.startTime))))
      .catch(() => setTodaySessions([]));
  }, []);

  const { stats, classes: assignedClasses, attendanceData, upcomingExams, recentPerformance } = data;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.trim().split(/\s+/)[0];
  const teacherStats = [
    { title: "My Students", value: String(stats.studentCount), description: `Across ${stats.classCount} classes`, icon: Users, color: "text-academic-sky", bgColor: "bg-academic-sky/10", accent: "bg-academic-sky" },
    { title: "Attendance", value: `${stats.attendanceRate}%`, description: "Average this period", icon: CheckCircle2, color: "text-academic-teal", bgColor: "bg-academic-teal/10", accent: "bg-academic-teal" },
    { title: "My Classes", value: String(stats.classCount), description: "Assigned to you", icon: BookOpen, color: "text-academic-navy dark:text-slate-200", bgColor: "bg-academic-navy/10 dark:bg-white/10", accent: "bg-academic-navy dark:bg-slate-300" },
    { title: "Exams Slated", value: String(stats.upcomingExamCount), description: "Upcoming exams", icon: GraduationCap, color: "text-[#b7791f] dark:text-academic-gold", bgColor: "bg-academic-gold/15", accent: "bg-academic-gold" },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-aubergine-700 dark:text-aubergine-300">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight dark:text-white">Teacher Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1.5 font-medium dark:text-slate-300">
            {stats.classCount > 0
              ? `Managing ${stats.classCount} assigned ${stats.classCount === 1 ? 'class' : 'classes'} with ${stats.studentCount} students.`
              : 'No classes assigned to you yet.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            id="dashboard-mark-attendance-btn"
            size="sm"
            className="h-10 rounded-lg bg-academic-teal px-4 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-aubergine-700"
            onClick={() => navigate('/teacher/attendance')}
          >
            Mark Attendance
          </Button>
          <Button
            id="dashboard-planner-btn"
            variant="outline"
            size="sm"
            className="h-10 rounded-lg border-border bg-card px-4 text-[11px] font-bold uppercase tracking-wider text-slate-700 shadow-sm dark:text-slate-200"
            onClick={() => navigate('/teacher/planner')}
          >
            Lesson Planner
          </Button>
          <Button
            id="dashboard-new-assessment-btn"
            size="sm"
            className="h-10 rounded-lg bg-academic-navy px-4 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#102942] dark:bg-slate-100 dark:text-academic-navy dark:hover:bg-white"
            onClick={() => navigate('/exams/new')}
          >
            New Assessment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {teacherStats.map((stat) => (
          <Card key={stat.title} className="relative rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_rgba(25,50,77,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(25,50,77,0.10)]">
            <div className={`absolute inset-x-0 top-0 h-1 ${stat.accent}`} aria-hidden="true" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 whitespace-nowrap">{stat.title}</span>
              <div className={`rounded-xl p-2.5 ${stat.bgColor} ${stat.color}`}>
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

      {/* Today's sessions — one tap into attendance for that session */}
      {todaySessions.length > 0 && (
        <Card className="rounded-2xl border border-border bg-card shadow-[0_8px_24px_rgba(25,50,77,0.05)] overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h3 className="font-bold text-slate-800 text-sm dark:text-slate-100 flex items-center gap-2">
              <Clock className="h-4 w-4 text-aubergine-600" /> Today's Sessions
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {todaySessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => navigate(`/teacher/attendance?sessionId=${s.id}`)}
                className="group flex items-center justify-between rounded-xl border border-border bg-background/75 p-3.5 text-left transition-all hover:border-aubergine-400 hover:bg-aubergine-50 dark:hover:bg-aubergine-900/20"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">{sanitizeText(s.subjectName || 'Session')}</p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                    {s.startTime}–{s.endTime}{s.className ? ` · ${sanitizeText(s.className)}` : ''}{s.room ? ` · ${sanitizeText(s.room)}` : ''}
                  </p>
                </div>
                <span className="ml-3 flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-aubergine-600 opacity-0 transition-opacity group-hover:opacity-100">
                  Attendance <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <section className="space-y-4" aria-labelledby="learning-activities-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="learning-activities-heading" className="text-base font-bold text-slate-900 dark:text-white">Learning activities</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">A little daily practice keeps learning momentum strong.</p>
          </div>
          <span className="hidden rounded-full bg-academic-gold/15 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#97651b] sm:inline dark:text-academic-gold">
            Build a streak
          </span>
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <DailyQuestCard />
          <WordTrailCard />
        </div>
      </section>

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
                        <Cell key={`cell-${index}`} fill={entry.rate > 90 ? '#168c83' : '#f2b84b'} />
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
