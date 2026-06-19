import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  CalendarCheck, 
  FileCheck, 
  Wallet, 
  Bell, 
  Clock, 
  ChevronRight,
  TrendingUp,
  User,
  Library,
  GraduationCap,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useSettings } from '../../providers/SettingsProvider';
import { formatMoney } from '../../lib/locale';
import { fetchOrMock } from '../../lib/api';

interface StudentDashData {
  className: string; currency: string;
  stats: { attendanceRate: number; examAverage: number; feeBalance: number; classSize: number };
  upcomingExams: { id: string | number; subject: string; date: string; time: string; type: string }[];
  recentResults: { id: string | number; subject: string; score: string; grade: string; date: string }[];
}

const MOCK_DASH: StudentDashData = {
  className: 'Grade 10A', currency: 'MYR',
  stats: { attendanceRate: 92, examAverage: 84.5, feeBalance: 450, classSize: 32 },
  upcomingExams: [
    { id: 1, subject: "Mathematics", date: "2024-05-20", time: "09:00 AM", type: "Midterm" },
    { id: 2, subject: "Physics", date: "2024-05-22", time: "10:30 AM", type: "Quiz" },
  ],
  recentResults: [
    { id: 1, subject: "English", score: "92/100", grade: "A", date: "2024-05-10" },
    { id: 2, subject: "History", score: "78/100", grade: "B+", date: "2024-05-08" },
  ],
};

type AnnouncementRow = { id: string | number; title: string; date: string; category: string };
type LibraryResourceRow = { id: string | number; title: string; subject: string; format: string };

const announcements: AnnouncementRow[] = [];

export default function StudentDashboard() {
  const { systemSettings } = useSettings();
  const [dash, setDash] = useState<StudentDashData>(MOCK_DASH);

  useEffect(() => {
    fetchOrMock<StudentDashData>('/api/student/dashboard', MOCK_DASH, { emptyWhen: (d) => !d?.stats })
      .then((r) => setDash(r.data));
  }, []);

  const currency = dash.currency || systemSettings.currency || 'MYR';
  const feeBalance = dash.stats.feeBalance;

  const stats = [
    { title: "Attendance", value: `${dash.stats.attendanceRate}%`, description: "This term", icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Exam Average", value: String(dash.stats.examAverage), description: "All subjects", icon: FileCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Fee Balance", value: formatMoney(feeBalance, currency, { decimals: false }), description: "Outstanding", icon: Wallet, color: "text-aubergine-600", bg: "bg-aubergine-50" },
    { title: "Class Size", value: String(dash.stats.classSize), description: dash.className, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const upcomingExams = dash.upcomingExams;
  const recentResults = dash.recentResults;

  const libraryResources: LibraryResourceRow[] = [];

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back! 👋</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="font-bold text-aubergine-600 dark:text-aubergine-400">{dash.className}</span>
            <span className="text-slate-300">•</span>
            <span>Academic Year 2024-25</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" render={<Link to="/student/profile" />}>
            <User className="h-4 w-4" /> My Profile
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="border-none shadow-sm bg-white dark:bg-surface-indigo overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-colors`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <Badge variant="ghost" className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Stats</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{stat.title}</p>
                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {stat.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Exams & Results */}
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming Exams */}
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-surface-raised/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-aubergine-50 dark:bg-aubergine-900/20 text-aubergine-600 rounded-lg">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Upcoming Exams</CardTitle>
                  <CardDescription>Scheduled assessments for your classes</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-aubergine-600 font-bold text-xs uppercase tracking-widest" render={<Link to="/student/exams" />}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingExams.map((exam, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0 border-slate-50 dark:border-surface-raised/50 hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center bg-aubergine-100 dark:bg-aubergine-900/30 text-aubergine-700 dark:text-aubergine-400 rounded-full font-bold text-xs uppercase">
                      {exam.subject.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{exam.subject}</h4>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {exam.time}</span>
                        <span className="flex items-center gap-1"><CalendarCheck className="h-3 w-3" /> {exam.date}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-aubergine-50 text-aubergine-700 dark:bg-aubergine-900/20 dark:text-aubergine-400 font-bold text-[10px] uppercase">
                    {exam.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-surface-raised/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Recent Results</CardTitle>
                  <CardDescription>Your performance in recent assessments</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-emerald-600 font-bold text-xs uppercase tracking-widest" render={<Link to="/student/results" />}>
                All Grades
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentResults.map((result, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0 border-slate-50 dark:border-surface-raised/50 hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full font-bold text-lg">
                      {result.grade}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{result.subject}</h4>
                      <p className="text-[11px] text-slate-500 mt-1">Released on {result.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{result.score}</p>
                    <Progress value={parseInt(result.score)} className="h-1 w-20 mt-2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Announcements & Library */}
        <div className="space-y-8">
          {/* Announcements */}
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center gap-2">
                  <Bell className="h-4 w-4 text-aubergine-500" /> Announcements
                </CardTitle>
                <Link to="/announcements" className="text-[10px] text-aubergine-600 font-bold uppercase tracking-widest hover:underline">View</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {announcements.map((ann, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-aubergine-600 transition-colors line-clamp-1">{ann.title}</h5>
                      <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                        {ann.date} • {ann.category}
                      </span>
                    </div>
                    <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-aubergine-400 transition-all" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Fee Alert if needed */}
          <div className="bg-aubergine-50 dark:bg-aubergine-900/10 p-5 rounded-xl border border-aubergine-100 dark:border-aubergine-900/30 flex gap-4">
            <AlertCircle className="h-6 w-6 text-aubergine-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-aubergine-900 dark:text-aubergine-400">Payment Due</h4>
              <p className="text-xs text-aubergine-700 dark:text-aubergine-300/80 mt-1">Your term fees of {formatMoney(feeBalance, currency, { decimals: false })} are due by May 20th. Please visit the accounts office or pay online.</p>
              <Button variant="link" className="p-0 h-auto text-xs font-bold text-aubergine-600 mt-2 uppercase tracking-widest decoration-aubergine-600/30" render={<Link to="/student/fees" />}>
                Go to Fees <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Library Quick View */}
          <Card className="border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
            <CardHeader className="pb-4 bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Library className="h-4 w-4 text-blue-500" /> New in Library
                </CardTitle>
                <Link to="/student/library" className="text-[10px] text-blue-600 font-bold uppercase tracking-widest hover:underline">Open</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {libraryResources.map((res, idx) => (
                <div key={idx} className="p-4 border-b last:border-0 border-slate-100 dark:border-surface-raised/50 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{res.title}</h5>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter font-bold">{res.subject}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-5 border-slate-200 dark:border-surface-raised h-5 px-1 bg-white dark:bg-surface-raised">
                    {res.format}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
