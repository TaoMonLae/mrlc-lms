import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, Clock, CheckCircle2, GraduationCap, Calendar, ArrowRight, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const teacherStats = [
  {
    title: "My Students",
    value: "56",
    description: "Across 4 classes",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Attendance",
    value: "94.2%",
    description: "Average this month",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Next Class",
    value: "14:00",
    description: "GED Social Studies",
    icon: Clock,
    color: "text-aubergine-500",
    bgColor: "bg-aubergine-500/10",
  },
  {
    title: "Exams Slated",
    value: "2",
    description: "In the next 7 days",
    icon: GraduationCap,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

// IDs aligned with TeacherClasses & TeacherTimetable (string IDs: c1–c4)
const assignedClasses = [
  { id: "c1", name: "GED Social Studies", level: "GED", room: "Room 102", students: 24, progress: 75 },
  { id: "c2", name: "Pre-GED English", level: "Pre-GED", room: "Room 105", students: 18, progress: 60 },
  { id: "c3", name: "GED Math Prep", level: "GED", room: "Lab A", students: 12, progress: 90 },
  { id: "c4", name: "History of SEA", level: "Pre-GED", room: "Room 102", students: 22, progress: 45 },
];

const attendanceData = [
  { day: 'Mon', rate: 95 },
  { day: 'Tue', rate: 92 },
  { day: 'Wed', rate: 88 },
  { day: 'Thu', rate: 96 },
  { day: 'Fri', rate: 94 },
];

const upcomingExams = [
  { id: 1, title: "Social Studies Final", date: "May 15", time: "09:00", class: "GED Social Studies" },
  { id: 2, title: "English Proficiency", date: "May 18", time: "11:30", class: "Pre-GED English" },
];

const recentPerformance = [
  { id: 1, student: "Min Khant", class: "GED Social Studies", score: "88%", trend: "up" },
  { id: 2, student: "Zun Pwint", class: "Pre-GED English", score: "72%", trend: "down" },
  { id: 3, student: "Aung Ko", class: "GED Social Studies", score: "94%", trend: "up" },
  { id: 4, student: "May Mon", class: "Pre-GED English", score: "81%", trend: "stable" },
];

export default function TeacherDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">Teacher Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Managing 4 assigned modules for GED &amp; Pre-GED levels.</p>
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
            id="dashboard-new-assessment-btn"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm font-bold text-[11px] uppercase tracking-wider h-10 px-4"
            onClick={() => navigate('/teacher/exams')}
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
                  <th className="px-6 py-3">Curriculum Progress</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignedClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50 transition-colors group dark:hover:bg-surface-raised/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{cls.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{cls.level}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{cls.room}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{cls.students} Learners</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 w-full max-w-[100px] rounded-full bg-slate-100 dark:bg-surface-raised overflow-hidden">
                          <div 
                            className="h-full bg-aubergine-500 rounded-full transition-all duration-500" 
                            style={{ width: `${cls.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{cls.progress}%</span>
                      </div>
                    </td>
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
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{exam.title}</p>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">{exam.class}</p>
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
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.student}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.class}</p>
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
            <h3 className="font-bold text-slate-800 text-sm dark:text-slate-100">Teaching Resources &amp; Notifications</h3>
            <Badge variant="secondary" className="font-bold text-[10px] tracking-widest uppercase">7 Updates</Badge>
          </div>
          <CardContent className="p-6 grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-aubergine-50 dark:bg-aubergine-900/20 flex items-center justify-center text-aubergine-600">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">New curriculum available</p>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-300 font-medium">Updated Social Studies module for the 2024 GED standards has been uploaded to the shared drive.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase">Student Registration Update</p>
                  <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-300 font-medium">3 new students have been added to your GED Math Prep module. Please review records.</p>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-surface-raised flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/30 dark:bg-surface-raised/10">
              <div className="h-12 w-12 rounded-full border-4 border-aubergine-500/10 border-t-aubergine-500 flex items-center justify-center">
                <Clock className="h-5 w-5 text-aubergine-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Lesson Planning Reminder</p>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Submit your next week's session plans by Friday 5PM.</p>
              </div>
              <Button
                id="dashboard-planner-btn"
                size="sm"
                className="bg-slate-900 text-white hover:bg-slate-800 text-[10px] font-bold uppercase tracking-widest px-6 dark:bg-slate-100 dark:text-slate-900"
                onClick={() => navigate('/teacher/timetable')}
              >
                Planner
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
