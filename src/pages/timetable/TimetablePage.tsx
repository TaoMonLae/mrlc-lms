import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  CalendarDays, 
  Plus, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User, 
  BookOpen,
  MoreVertical,
  Edit,
  Trash2,
  Printer,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/src/lib/permissions';

// Types
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface TimetableEntry {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  room: string;
  notes?: string;
}

// Mock Data
const MOCK_TIMETABLE: TimetableEntry[] = [
  {
    id: 't1',
    classId: 'c1',
    className: 'Grade 10A',
    subjectId: 's1',
    subjectName: 'Mathematics',
    subjectColor: 'bg-blue-500',
    teacherId: 't1',
    teacherName: 'John Smith',
    dayOfWeek: 'Monday',
    startTime: '08:00',
    endTime: '09:30',
    room: 'Room 302',
  },
  {
    id: 't2',
    classId: 'c1',
    className: 'Grade 10A',
    subjectId: 's2',
    subjectName: 'Physics',
    subjectColor: 'bg-purple-500',
    teacherId: 't2',
    teacherName: 'Sarah Wilson',
    dayOfWeek: 'Monday',
    startTime: '09:45',
    endTime: '11:15',
    room: 'Lab 1',
  },
  {
    id: 't3',
    classId: 'c1',
    className: 'Grade 10A',
    subjectId: 's3',
    subjectName: 'English',
    subjectColor: 'bg-emerald-500',
    teacherId: 't3',
    teacherName: 'Jane Doe',
    dayOfWeek: 'Tuesday',
    startTime: '08:00',
    endTime: '09:30',
    room: 'Room 201',
  },
  {
    id: 't4',
    classId: 'c1',
    className: 'Grade 10A',
    subjectId: 's1',
    subjectName: 'Mathematics',
    subjectColor: 'bg-blue-500',
    teacherId: 't1',
    teacherName: 'John Smith',
    dayOfWeek: 'Wednesday',
    startTime: '13:00',
    endTime: '14:30',
    room: 'Room 302',
  },
  {
    id: 't5',
    classId: 'c1',
    className: 'Grade 10A',
    subjectId: 's4',
    subjectName: 'History',
    subjectColor: 'bg-amber-500',
    teacherId: 't4',
    teacherName: 'Robert Brown',
    dayOfWeek: 'Friday',
    startTime: '10:00',
    endTime: '11:30',
    room: 'Room 105',
  }
];

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
];

export default function TimetablePage() {
  const [viewType, setViewType] = useState<'class' | 'teacher'>('class');
  const [selectedIdentifier, setSelectedIdentifier] = useState('Grade 10A');
  const { isAdmin, hasPermission } = usePermissions();

  const canManage = isAdmin || hasPermission('manage_timetable');

  const filteredTimetable = MOCK_TIMETABLE.filter(entry => 
    viewType === 'class' ? entry.className === selectedIdentifier : entry.teacherName === selectedIdentifier
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-indigo-600" />
            School Timetable
          </h1>
          <p className="text-sm text-slate-500">
            Weekly schedule for classes and teachers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          {canManage && (
            <Button render={<Link to="/timetable/new" />} nativeButton={false} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Slot
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <Button 
            variant={viewType === 'class' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => { setViewType('class'); setSelectedIdentifier('Grade 10A'); }}
            className="h-8 text-xs px-4"
          >
            By Class
          </Button>
          <Button 
            variant={viewType === 'teacher' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => { setViewType('teacher'); setSelectedIdentifier('John Smith'); }}
            className="h-8 text-xs px-4"
          >
            By Teacher
          </Button>
        </div>
        
        <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select 
            className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-600 outline-none flex-1 md:flex-none min-w-[200px]"
            value={selectedIdentifier}
            onChange={(e) => setSelectedIdentifier(e.target.value)}
          >
            {viewType === 'class' ? (
              <>
                <option value="Grade 10A">Grade 10A</option>
                <option value="Grade 10B">Grade 10B</option>
                <option value="Grade 11A">Grade 11A</option>
              </>
            ) : (
              <>
                <option value="John Smith">John Smith</option>
                <option value="Sarah Wilson">Sarah Wilson</option>
                <option value="Jane Doe">Jane Doe</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Desktop Grid View */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-6 border-b border-slate-200 dark:border-slate-800">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
            Time
          </div>
          {DAYS.map(day => (
            <div key={day} className="p-4 bg-slate-50 dark:bg-slate-800/50 border-r last:border-r-0 border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="relative">
          {TIME_SLOTS.map((time, idx) => (
            <div key={time} className="grid grid-cols-6 border-b last:border-b-0 border-slate-100 dark:border-slate-800/50 min-h-[100px]">
              <div className="p-3 border-r border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 text-center flex flex-col justify-between">
                <span>{time}</span>
                <span className="opacity-0">.</span>
              </div>
              {DAYS.map(day => {
                const entry = filteredTimetable.find(e => e.dayOfWeek === day && e.startTime.startsWith(time.split(':')[0]));
                return (
                  <div key={`${day}-${time}`} className="relative p-1 border-r last:border-r-0 border-slate-100 dark:border-slate-800/50 group">
                    {entry && (
                      <div className={`h-full w-full rounded-lg p-3 ${entry.subjectColor} text-white shadow-sm overflow-hidden flex flex-col justify-between group/card relative`}>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{entry.startTime} - {entry.endTime}</p>
                          <h4 className="text-sm font-bold truncate leading-tight mb-1">{entry.subjectName}</h4>
                          <p className="text-[10px] flex items-center gap-1 opacity-90">
                            <MapPin className="h-2.5 w-2.5" /> {entry.room}
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/20">
                          <p className="text-[10px] font-medium truncate flex items-center gap-1">
                            {viewType === 'class' ? (
                              <><User className="h-2.5 w-2.5" /> {entry.teacherName}</>
                            ) : (
                              <><BookOpen className="h-2.5 w-2.5" /> {entry.className}</>
                            )}
                          </p>
                          
                          {canManage && (
                            <div className="absolute top-1 right-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/20 rounded-full" />}>
                                  <MoreVertical className="h-3 w-3" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                  <DropdownMenuItem render={<Link to={`/timetable/${entry.id}/edit`} className="w-full flex items-center" />}>
                                    <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-rose-600">
                                    <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Day Cards */}
      <div className="lg:hidden space-y-6">
        {DAYS.map(day => (
          <div key={day} className="space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest pl-2 border-l-4 border-indigo-500">{day}</h3>
            <div className="space-y-3">
              {filteredTimetable.filter(e => e.dayOfWeek === day).sort((a,b) => a.startTime.localeCompare(b.startTime)).map(entry => (
                <div key={entry.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-4 group">
                  <div className={`w-2 h-12 rounded-full ${entry.subjectColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{entry.startTime} - {entry.endTime}</span>
                      <Badge variant="outline" className="text-[10px] h-5 border-slate-200 dark:border-slate-800">{entry.room}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{entry.subjectName}</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      {viewType === 'class' ? (
                        <><User className="h-3 w-3" /> {entry.teacherName}</>
                      ) : (
                        <><BookOpen className="h-3 w-3" /> {entry.className}</>
                      )}
                    </p>
                  </div>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" />}>
                        <MoreVertical className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem render={<Link to={`/timetable/${entry.id}/edit`} className="w-full flex items-center" />}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-rose-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
              {filteredTimetable.filter(e => e.dayOfWeek === day).length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">No classes scheduled</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend & Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            Subject Legend
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Mathematics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Physics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">English</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">History</span>
            </div>
          </div>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
          <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 mb-2 flex items-center gap-2">
             <Clock className="h-4 w-4" />
             Schedule Information
          </h3>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            The school schedule operates on a weekly cycle. Teachers should ensure rooms are booked through the admin portal if they need to change locations. Students are advised to check the timetable daily for any updates.
          </p>
        </div>
      </div>
    </div>
  );
}
