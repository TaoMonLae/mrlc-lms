import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, BookOpen, AlertCircle, CalendarRange, TrendingUp, UserPlus, Clock, Megaphone, Pin, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { usePermissions } from "@/src/lib/permissions";

const stats = [
  {
    title: "Total Students",
    value: "148",
    description: "Active this semester",
    icon: Users,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Classes",
    value: "12",
    description: "GED & Pre-GED levels",
    icon: BookOpen,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "Daily Attendance",
    value: "92%",
    description: "Average this week",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Active Cases",
    value: "4",
    description: "Pending attention",
    icon: AlertCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
];

const recentActivities = [
  { id: 1, type: "registration", user: "John Doe", detail: "Registered for GED Social Studies", time: "2 hours ago" },
  { id: 2, type: "attendance", user: "Teacher Mary", detail: "Marked attendance for Pre-GED Math", time: "3 hours ago" },
  { id: 3, type: "exam", user: "Sarah Lee", detail: "Submitted Science mock exam", time: "5 hours ago" },
  { id: 4, type: "fee", user: "David Mon", detail: "Paid May tuition fee", time: "1 day ago" },
];

export default function DashboardPage() {
  const { isStudent, isTeacher } = usePermissions();

  if (isStudent) {
    return <Navigate to="/student/dashboard" replace />;
  }

  if (isTeacher) {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">School Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of Mon Refugee Learning Centre - GED School</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 px-4 py-2 font-semibold text-xs">
            Export Reports
          </Button>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm px-4 py-2 font-semibold text-xs">
            + New Registration
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">{stat.title}</span>
              <div className={`rounded-full p-2 ${stat.bgColor.replace('bg-', 'bg-').replace('10', '50')} ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-900">{stat.value}</div>
            <p className={`mt-1 text-xs font-semibold ${stat.title === 'Active Cases' ? 'text-orange-500' : 'text-green-600'}`}>
              {stat.description}
            </p>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-indigo-600" />
            Important Announcements
          </h3>
          <Button variant="ghost" size="sm" render={<Link to="/announcements" />} nativeButton={false} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-0 h-auto">
            View All Announcements <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { id: 'ann-1', title: 'School Reopening & Safety Guidelines', date: 'May 1', category: 'GENERAL', pinned: true },
            { id: 'ann-2', title: 'Final Exam Schedule - Term 1', date: 'May 10', category: 'EXAMS', pinned: true },
            { id: 'ann-3', title: 'Mathematics Grade 10A Quiz', date: 'Today', category: 'ACADEMIC', pinned: false },
          ].map((ann) => (
            <Link 
              key={ann.id} 
              to={`/announcements/${ann.id}`}
              className="flex flex-col p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[9px] font-bold tracking-widest border-slate-200 dark:border-slate-800 uppercase px-1.5 h-4">
                  {ann.category}
                </Badge>
                {ann.pinned && <Pin className="h-3 w-3 text-indigo-600 fill-current" />}
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors">
                {ann.title}
              </h4>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>{ann.date}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Read more →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-indigo-600" />
              Today's Schedule
            </h3>
            <Link to="/timetable" className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest hover:underline transition-all">Full Timetable</Link>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-3 font-semibold">Time</th>
                  <th className="px-6 py-3 font-semibold">Subject</th>
                  <th className="px-6 py-3 font-semibold">Class</th>
                  <th className="px-6 py-3 font-semibold">Teacher</th>
                  <th className="px-6 py-3 font-semibold">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { time: "08:00 - 09:30", subject: "Mathematics", subjectColor: "bg-blue-500", class: "Grade 10A", teacher: "Mr. John", room: "Room 302" },
                  { time: "09:45 - 11:15", subject: "Physics", subjectColor: "bg-purple-500", class: "Grade 10A", teacher: "Ms. Sarah", room: "Lab 1" },
                  { time: "13:00 - 14:30", subject: "English", subjectColor: "bg-emerald-500", class: "Grade 11B", teacher: "Mrs. Jane", room: "Room 201" },
                  { time: "14:45 - 16:15", subject: "History", subjectColor: "bg-amber-500", class: "Grade 12C", teacher: "Mr. Robert", room: "Room 105" },
                ].map((cls, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{cls.time}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${cls.subjectColor}`} />
                        {cls.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{cls.class}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{cls.teacher}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-[9px] h-5 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 uppercase px-1.5">{cls.room}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="border-b px-6 py-4">
            <h3 className="font-bold text-slate-800 text-sm">Recent Student Cases</h3>
          </div>
          <CardContent className="p-4 flex-1">
            <div className="space-y-5">
              {[
                { name: "Min Khant", class: "GED A", detail: "Missing identity documents for official GED registration. Requires follow-up with UN agency.", time: "2 HOURS AGO", color: "bg-red-500" },
                { name: "Zun Pwint", class: "Pre-GED", detail: "Extended medical leave (3 days). Student reported minor illness.", time: "YESTERDAY", color: "bg-amber-500" },
                { name: "Aung Ko", class: "GED B", detail: "Applied for financial assistance for exam fees. Documents submitted for review.", time: "DEC 12, 2023", color: "bg-blue-500" },
              ].map((activity, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activity.color}`}></div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{activity.name} - {activity.class}</p>
                    <p className="text-[11px] leading-relaxed text-slate-500 font-medium">{activity.detail}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-4 pt-0">
            <Button variant="ghost" className="w-full bg-slate-50 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors uppercase tracking-wider" nativeButton={false} render={<Link to="/cases" />}>
              View Case Management
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
