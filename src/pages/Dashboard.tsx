import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, AlertCircle, CalendarRange, TrendingUp, Megaphone, Pin, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { usePermissions } from "@/src/lib/permissions";
import { toast } from "sonner";

interface DashboardData {
  stats: { students: number; classes: number; openCases: number; attendanceRate: number | null; attendanceRecords?: number };
  announcements: { id: string; title: string; category: string; pinned: boolean; date: string }[];
  schedule: { time: string; subject: string; subjectColor: string; class: string; teacher: string; room: string }[];
  recentCases: { id: string; name: string; detail: string; status: string; time: string }[];
}

const formatDate = (value: string) => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

export default function DashboardPage() {
  const { isStudent, hasPermission, isAdmin } = usePermissions();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = sessionStorage.getItem("auth_token");
        const res = await fetch("/api/dashboard", { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to load dashboard");
        setData(await res.json());
      } catch (e: any) {
        toast.error(e.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (isStudent) {
    return <Navigate to="/student/dashboard" replace />;
  }

  const fmt = (n: number | null | undefined) => (loading ? "--" : (n ?? 0).toString());

  const stats = [
    {
      title: "Total Students",
      value: fmt(data?.stats.students),
      description: "Active this semester",
      icon: Users,
      color: "text-accent-blue",
      chip: "bg-accent-blue/10",
      bar: "border-t-accent-blue",
    },
    {
      title: "Classes",
      value: fmt(data?.stats.classes),
      description: "GED & Pre-GED levels",
      icon: BookOpen,
      color: "text-accent-purple",
      chip: "bg-accent-purple/10",
      bar: "border-t-accent-purple",
    },
    {
      title: "Daily Attendance",
      value: loading ? "--" : (data?.stats.attendanceRate != null ? `${data.stats.attendanceRate}%` : "—"),
      description: data?.stats.attendanceRecords ? `${data.stats.attendanceRecords} records today` : "No records today",
      icon: TrendingUp,
      color: "text-accent-green",
      chip: "bg-accent-green/10",
      bar: "border-t-accent-green",
    },
    {
      title: "Active Cases",
      value: fmt(data?.stats.openCases),
      description: "Pending attention",
      icon: AlertCircle,
      color: "text-accent-orange",
      chip: "bg-accent-orange/10",
      bar: "border-t-accent-orange",
    },
  ];

  const announcements = data?.announcements ?? [];
  const schedule = data?.schedule ?? [];
  const recentCases = data?.recentCases ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white">School Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of Mon Refugee Learning Centre - GED School</p>
        </div>
        <div className="flex gap-3">
          {hasPermission("view_reports") && (
            <Button variant="outline" size="sm" className="bg-white border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 px-4 py-2 font-semibold text-xs" render={<Link to="/reports" />} nativeButton={false}>
              Export Reports
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm px-4 py-2 font-semibold text-xs" render={<Link to="/students/new" />} nativeButton={false}>
              + New Registration
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className={`rounded-md border border-slate-200 border-t-4 ${stat.bar} bg-white p-5 shadow-sm transition-all hover:shadow-md`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">{stat.title}</span>
              <div className={`rounded-md p-2 ${stat.chip} ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900 dark:text-slate-900">{stat.value}</div>
            <p className={`mt-1 text-xs font-semibold ${stat.title === 'Active Cases' ? 'text-aubergine-500' : 'text-green-600'}`}>
              {stat.description}
            </p>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-aubergine-600 dark:text-aubergine-400" />
            Important Announcements
          </h3>
          <Button variant="ghost" size="sm" render={<Link to="/announcements" />} nativeButton={false} className="text-xs font-bold text-aubergine-600 hover:text-aubergine-700 hover:bg-aubergine-50 px-0 h-auto">
            View All Announcements <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-400">{loading ? "Loading…" : "No active announcements."}</p>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {announcements.map((ann) => (
            <Link
              key={ann.id}
              to={`/announcements/${ann.id}`}
              className="flex flex-col p-4 bg-white dark:bg-surface-indigo border border-slate-100 dark:border-surface-raised rounded-xl shadow-sm hover:border-aubergine-200 dark:hover:border-aubergine-900/50 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[9px] font-bold tracking-widest border-slate-200 dark:border-surface-raised uppercase px-1.5 h-4">
                  {ann.category}
                </Badge>
                {ann.pinned && <Pin className="h-3 w-3 text-aubergine-600 fill-current" />}
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1 group-hover:text-aubergine-600 transition-colors">
                {ann.title}
              </h4>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span>{formatDate(ann.date)}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">Read more →</span>
              </div>
            </Link>
          ))}
        </div>
        )}
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-surface-raised px-6 py-4">
            <h3 className="font-bold text-slate-800 dark:text-white text-sm flex items-center gap-2">
              <CalendarRange className="h-4 w-4 text-aubergine-600" />
              Today's Schedule
            </h3>
            <Link to="/timetable" className="text-[10px] text-aubergine-600 font-bold uppercase tracking-widest hover:underline transition-all">Full Timetable</Link>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-surface-raised/50 text-slate-500 dark:text-slate-300 font-semibold text-[11px] uppercase tracking-wider border-b border-slate-100 dark:border-surface-raised">
                <tr>
                  <th className="px-6 py-3 font-semibold">Time</th>
                  <th className="px-6 py-3 font-semibold">Subject</th>
                  <th className="px-6 py-3 font-semibold">Class</th>
                  <th className="px-6 py-3 font-semibold">Teacher</th>
                  <th className="px-6 py-3 font-semibold">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {schedule.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      {loading ? "Loading…" : "No classes scheduled for today."}
                    </td>
                  </tr>
                ) : schedule.map((cls, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors group">
                    <td className="px-6 py-4 font-bold text-aubergine-600 dark:text-aubergine-400">{cls.time}</td>
                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${cls.subjectColor}`} />
                        {cls.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">{cls.class}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{cls.teacher}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-[9px] h-5 border-slate-200 dark:border-surface-raised bg-slate-50 dark:bg-surface-raised uppercase px-1.5">{cls.room}</Badge>
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
              {recentCases.length === 0 ? (
                <p className="text-xs text-slate-400">{loading ? "Loading…" : "No recent cases."}</p>
              ) : recentCases.map((activity) => (
                <Link to={`/cases/${activity.id}`} key={activity.id} className="flex gap-3 items-start group">
                  <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-aubergine-500"></div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-tight group-hover:text-aubergine-600">{activity.name}</p>
                    <p className="text-[11px] leading-relaxed text-slate-500 font-medium">{activity.detail}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activity.status} · {formatDate(activity.time)}</p>
                  </div>
                </Link>
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
