import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  MoreHorizontal, 
  Download, 
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const teacherSchedule = [
  { day: 'Monday', time: '09:00 - 11:00', subject: 'GED Social Studies', room: 'Room 102', classId: 'c1', color: 'bg-blue-500' },
  { day: 'Monday', time: '13:00 - 15:00', subject: 'History of SEA', room: 'Room 105', classId: 'c4', color: 'bg-purple-500' },
  { day: 'Tuesday', time: '10:30 - 12:30', subject: 'Pre-GED English', room: 'Room 105', classId: 'c2', color: 'bg-emerald-500' },
  { day: 'Wednesday', time: '09:00 - 11:00', subject: 'GED Social Studies', room: 'Room 102', classId: 'c1', color: 'bg-blue-500' },
  { day: 'Thursday', time: '10:30 - 12:30', subject: 'Pre-GED English', room: 'Room 105', classId: 'c2', color: 'bg-emerald-500' },
  { day: 'Friday', time: '13:00 - 15:00', subject: 'GED Math Prep', room: 'Lab A', classId: 'c3', color: 'bg-orange-500' },
];

export default function TeacherTimetable() {
  const [view, setView] = useState<'week' | 'day'>('week');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase tracking-tighter">Teaching Schedule</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Your assigned teaching sessions and availability across the week.</p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-10 px-4 font-bold text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800">
                <Printer className="h-4 w-4 mr-2" /> Print Schedule
            </Button>
            <Button className="h-10 px-6 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[10px] uppercase tracking-widest shadow-lg">
                <Download className="h-4 w-4 mr-2" /> Export Calendar
            </Button>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <Button 
                    variant={view === 'week' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setView('week')}
                    className="font-bold text-[10px] uppercase tracking-widest h-8 px-4"
                >
                    Week
                </Button>
                <Button 
                    variant={view === 'day' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    onClick={() => setView('day')}
                    className="font-bold text-[10px] uppercase tracking-widest h-8 px-4"
                >
                    Day
                </Button>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">May 13 - May 19</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                <Button variant="outline" size="sm" className="hidden sm:flex h-8 px-3 font-bold text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800">
                    <Filter className="h-3.5 w-3.5 mr-2" /> Filters
                </Button>
            </div>
        </div>

        <div className="p-0 overflow-x-auto">
            <div className="min-w-[1000px]">
                <div className="grid grid-cols-6 border-b border-slate-100 dark:border-slate-800">
                    {DAYS.map(day => (
                        <div key={day} className="px-4 py-3 text-center border-r border-slate-100 dark:border-slate-800 last:border-r-0">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{day}</span>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-6 h-[600px]">
                    {DAYS.map(day => (
                        <div key={day} className="border-r border-slate-100 dark:border-slate-800 last:border-r-0 p-3 space-y-3 relative bg-slate-50/20 dark:bg-slate-900/10">
                            {teacherSchedule
                                .filter(session => session.day === day)
                                .map((session, i) => (
                                    <div key={i} className="group relative p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-orange-300 hover:shadow-md transition-all cursor-pointer">
                                        <div className={`absolute left-0 top-3 bottom-3 w-1 ${session.color} rounded-r-full`} />
                                        <div className="space-y-1.5 ml-2">
                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                <Clock className="h-2.5 w-2.5" /> {session.time}
                                            </div>
                                            <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-tight group-hover:text-orange-600 transition-colors">
                                                {session.subject}
                                            </h5>
                                            <div className="flex items-center gap-1.5 pt-1">
                                                <Badge variant="outline" className="text-[8px] font-bold tracking-widest py-0 px-1.5 h-4 border-slate-200 dark:border-slate-800">
                                                    {session.room}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                            {/* Empty space filler */}
                            <div className="h-full flex items-center justify-center pointer-events-none opacity-5">
                                <CalendarIcon className="h-24 w-24 text-slate-400" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <Clock className="h-4 w-4 text-orange-600" /> Upcoming Session
                </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
                <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900 text-white shadow-xl dark:bg-slate-100 dark:text-slate-900 relative overflow-hidden group">
                        <div className="absolute right-0 top-0 h-full w-24 bg-orange-600/20 translate-x-8 -skew-x-12 group-hover:translate-x-4 transition-transform duration-500" />
                        <div className="relative z-10 space-y-2">
                            <Badge className="bg-orange-600 text-white border-none font-black text-[8px] uppercase tracking-widest h-5">Today, 14:00</Badge>
                            <h4 className="text-lg font-bold tracking-tight uppercase">GED Social Studies</h4>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-70">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Room 102</span>
                                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 24 Students</span>
                            </div>
                            <Button size="sm" className="w-full mt-4 bg-white text-slate-900 hover:bg-slate-100 dark:bg-slate-900 dark:text-white font-bold text-[10px] uppercase tracking-widest h-9">
                                Start Session Roll Call
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="p-5 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-800 dark:text-white">Teaching Hours Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Load</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">18 Hours</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Modules</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">4 Classes</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Hours</p>
                        <p className="text-2xl font-black text-emerald-600">82% Load</p>
                    </div>
                    <div className="space-y-1 text-right">
                        <Button className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold text-[9px] uppercase tracking-widest h-10 px-4">
                            History
                        </Button>
                    </div>
                </div>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
