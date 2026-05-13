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

export default function StudentDashboard() {
  const stats = [
    { title: "Attendance", value: "92%", description: "Past 30 days", icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Exam Average", value: "84.5", description: "All subjects", icon: FileCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Fee Balance", value: "$450", description: "Due next week", icon: Wallet, color: "text-orange-600", bg: "bg-orange-50" },
    { title: "Class Rank", value: "8/32", description: "Grade 10A", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  const upcomingExams = [
    { id: 1, subject: "Mathematics", date: "2024-05-20", time: "09:00 AM", type: "Midterm" },
    { id: 2, subject: "Physics", date: "2024-05-22", time: "10:30 AM", type: "Quiz" },
  ];

  const recentResults = [
    { id: 1, subject: "English", score: "92/100", date: "2024-05-10", grade: "A" },
    { id: 2, subject: "History", score: "78/100", date: "2024-05-08", grade: "B+" },
  ];

  const announcements = [
    { id: 1, title: "School Sports Day Postponed", date: "2024-05-12", category: "Sports" },
    { id: 2, title: "Library Opening Hours Updated", date: "2024-05-11", category: "Library" },
  ];

  const libraryResources = [
    { id: 1, title: "Algebra Basics Part 2", subject: "Math", format: "PDF" },
    { id: 2, title: "Energy and Motion", subject: "Physics", format: "Video" },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome back, Min Khant! 👋</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Grade 10A</span>
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
          <Card key={idx} className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} transition-colors`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <Badge variant="ghost" className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Stats</Badge>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{stat.value}</h3>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{stat.title}</p>
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
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Upcoming Exams</CardTitle>
                  <CardDescription>Scheduled assessments for your classes</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-indigo-600 font-bold text-xs uppercase tracking-widest" render={<Link to="/student/exams" />}>
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingExams.map((exam, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full font-bold text-xs uppercase">
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
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 font-bold text-[10px] uppercase">
                    {exam.type}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/50 pb-4">
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
                <div key={idx} className="flex items-center justify-between p-4 border-b last:border-0 border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-500" /> Announcements
                </CardTitle>
                <Link to="/announcements" className="text-[10px] text-orange-600 font-bold uppercase tracking-widest hover:underline">View</Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {announcements.map((ann, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors line-clamp-1">{ann.title}</h5>
                      <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                        {ann.date} • {ann.category}
                      </span>
                    </div>
                    <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-orange-400 transition-all" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Fee Alert if needed */}
          <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-xl border border-orange-100 dark:border-orange-900/30 flex gap-4">
            <AlertCircle className="h-6 w-6 text-orange-600 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-orange-900 dark:text-orange-400">Payment Due</h4>
              <p className="text-xs text-orange-700 dark:text-orange-300/80 mt-1">Your term fees of $450 are due by May 20th. Please visit the accounts office or pay online.</p>
              <Button variant="link" className="p-0 h-auto text-xs font-bold text-orange-600 mt-2 uppercase tracking-widest decoration-orange-600/30" render={<Link to="/student/fees" />}>
                Go to Fees <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Library Quick View */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <CardHeader className="pb-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Library className="h-4 w-4 text-blue-500" /> New in Library
                </CardTitle>
                <Link to="/student/library" className="text-[10px] text-blue-600 font-bold uppercase tracking-widest hover:underline">Open</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {libraryResources.map((res, idx) => (
                <div key={idx} className="p-4 border-b last:border-0 border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{res.title}</h5>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter font-bold">{res.subject}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] h-5 border-slate-200 dark:border-slate-700 h-5 px-1 bg-white dark:bg-slate-800">
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
