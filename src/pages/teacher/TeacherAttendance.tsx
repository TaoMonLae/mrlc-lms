import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Check,
  X,
  Clock,
  AlertCircle,
  Calendar as CalendarIcon,
  Search,
  CheckCircle2,
  ChevronRight,
  Filter,
  Save,
  BookOpen,
  Clock as ClockIcon,
  MapPin
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiGet, apiSend } from "../../lib/api";

interface RosterStudent { id: string; name: string; studentId: string; photo?: string | null; }
interface TimetableSession {
  id: string;
  classId: string;
  className: string;
  subjectId: string | null;
  subjectName: string;
  subjectColor: string;
  teacherId: string | null;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
  status: string;
  scheduleType: string;
  eventDate: string | null;
}

type AttendanceMode = 'daily' | 'session';

export default function TeacherAttendance() {
  const [mode, setMode] = useState<AttendanceMode>('daily');
  const [classOptions, setClassOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'late' | 'absent' | 'excused'>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  // Session attendance state
  const [sessions, setSessions] = useState<TimetableSession[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    apiGet<{ id: string; name: string }[]>('/api/teacher/classes')
      .then((r) => {
        const opts = (r ?? []).map((c) => ({ value: c.id, label: c.name }));
        setClassOptions(opts);
        setSelectedClass((prev) => prev || opts[0]?.value || "");
      })
      .catch(() => { setClassOptions([]); setSelectedClass(""); });
  }, []);

  // Load students when class changes (daily mode) or session changes (session mode)
  useEffect(() => {
    if (!selectedClass) return;
    setAttendance({});

    if (mode === 'daily') {
      apiGet<RosterStudent[]>(`/api/teacher/roster?classId=${selectedClass}`)
        .then((r) => setStudents(r ?? []))
        .catch(() => setStudents([]));
    }
  }, [selectedClass, mode]);

  // Load sessions for session mode
  useEffect(() => {
    if (mode !== 'session') return;

    const date = new Date(sessionDate);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayOfWeek = dayNames[date.getDay()];

    apiGet<TimetableSession[]>(`/api/timetable?dayOfWeek=${dayOfWeek}`)
      .then((r) => {
        const teacherSessions = (r ?? []).filter((s: TimetableSession) =>
          s.scheduleType === 'CLASS' && s.status === 'ACTIVE'
        );
        setSessions(teacherSessions);
        if (teacherSessions.length > 0 && !selectedSession) {
          setSelectedSession(teacherSessions[0].id);
        }
      })
      .catch(() => setSessions([]));
  }, [mode, sessionDate]);

  // Load students when session changes
  useEffect(() => {
    if (mode !== 'session' || !selectedSession) return;

    const session = sessions.find(s => s.id === selectedSession);
    if (!session) return;

    setAttendance({});
    apiGet<RosterStudent[]>(`/api/teacher/roster?classId=${session.classId}`)
      .then((r) => setStudents(r ?? []))
      .catch(() => setStudents([]));
  }, [selectedSession, mode]);

  const handleStatusChange = (studentId: string, status: 'present' | 'late' | 'absent' | 'excused') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    const markedCount = Object.keys(attendance).length;
    if (markedCount < students.length) {
      const unmarked = students.length - markedCount;
      toast.warning(`${unmarked} student${unmarked > 1 ? 's' : ''} not yet marked.`, {
        description: 'Please mark attendance for all students before submitting.',
      });
      return;
    }

    const sessionForApi = mode === 'session' ? sessions.find(s => s.id === selectedSession) : null;
    const classIdForApi = mode === 'session' ? sessionForApi?.classId : selectedClass;

    if (!classIdForApi) {
      toast.error('Please select a class or session first.');
      return;
    }

    setSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: attendance[s.id].toUpperCase(),
        remarks: null,
      }));

      const payload: any = {
        classId: classIdForApi,
        date: mode === 'session' ? sessionDate : new Date().toISOString(),
        records,
      };

      if (mode === 'session' && sessionForApi) {
        payload.timetableEntryId = sessionForApi.id;
        payload.subjectId = sessionForApi.subjectId;
      }

      await apiSend('/api/attendance', 'POST', payload);

      const successMsg = mode === 'session'
        ? `Session attendance saved for ${sessionForApi?.subjectName}!`
        : 'Daily attendance saved successfully!';

      toast.success(successMsg, {
        description: `${students.length} students recorded for ${new Date(sessionDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, 'present'> = {};
    students.forEach(s => {
      newAttendance[s.id] = 'present';
    });
    setAttendance(newAttendance);
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedSessionData = sessions.find(s => s.id === selectedSession);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase">Take Attendance</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Record attendance for your assigned classes and sessions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllPresent} className="h-10 px-4 font-bold text-[11px] uppercase tracking-widest border-slate-200 dark:border-surface-raised">
            Mark All Present
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] uppercase tracking-widest shadow-lg">
            <Save className="h-3.5 w-3.5 mr-2" /> Save Attendance
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 dark:border-surface-raised overflow-hidden bg-white dark:bg-surface-indigo shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-surface-raised flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-surface-raised/30">
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            {/* Mode Selector */}
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Mode</span>
              <Select value={mode} onValueChange={(v) => setMode(v as AttendanceMode)}>
                <SelectTrigger className="h-10 border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily Attendance</SelectItem>
                  <SelectItem value="session">Session Attendance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Daily Mode: Class Selector */}
            {mode === 'daily' && (
              <div className="flex flex-col gap-1.5 min-w-[200px]">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Class</span>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="h-10 border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo">
                    <SelectValue placeholder="Select Class">
                      {classOptions.find(o => o.value === selectedClass)?.label ?? 'Select Class'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Session Mode: Date and Session Selectors */}
            {mode === 'session' && (
              <>
                <div className="flex flex-col gap-1.5 min-w-[160px]">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Date</span>
                  <Input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="h-10 border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo"
                  />
                </div>
                <div className="flex flex-col gap-1.5 min-w-[280px]">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Session</span>
                  <Select value={selectedSession} onValueChange={setSelectedSession} disabled={sessions.length === 0}>
                    <SelectTrigger className="h-10 border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo">
                      <SelectValue placeholder="Select Session">
                        {selectedSessionData ? (
                          <div className="flex items-center gap-2">
                            <Badge className={`h-5 w-5 rounded-full p-0 border-2 border-white shadow-sm ${selectedSessionData.subjectColor?.replace('bg-', 'bg-') || 'bg-blue-500'}`} />
                            <span className="font-bold text-xs">{selectedSessionData.subjectName}</span>
                            <span className="text-slate-400 text-xs">{selectedSessionData.startTime} - {selectedSessionData.endTime}</span>
                          </div>
                        ) : 'Select Session'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-3">
                            <Badge className={`h-4 w-4 rounded-full p-0 ${s.subjectColor?.replace('bg-', 'bg-') || 'bg-blue-500'}`} />
                            <div className="flex flex-col">
                              <span className="font-bold text-xs">{s.subjectName}</span>
                              <span className="text-[10px] text-slate-500">{s.className} · {s.startTime} - {s.endTime} {s.room && `· ${s.room}`}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Find student..."
              className="pl-10 h-10 bg-white dark:bg-surface-indigo border-slate-200 dark:border-surface-raised"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Session Info Banner */}
        {mode === 'session' && selectedSessionData && (
          <div className="bg-slate-50 dark:bg-surface-raised/20 border-b border-slate-100 dark:border-surface-raised px-6 py-3">
            <div className="flex items-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <Badge className={`h-2 w-2 rounded-full p-0 ${selectedSessionData.subjectColor?.replace('bg-', 'bg-') || 'bg-blue-500'}`} />
                <span className="font-bold text-slate-700 dark:text-slate-300">{selectedSessionData.subjectName}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <BookOpen className="h-3 w-3" />
                <span>{selectedSessionData.className}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <ClockIcon className="h-3 w-3" />
                <span>{selectedSessionData.startTime} - {selectedSessionData.endTime}</span>
              </div>
              {selectedSessionData.room && (
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin className="h-3 w-3" />
                  <span>{selectedSessionData.room}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredStudents.map((student) => (
              <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 hover:bg-slate-50/50 dark:hover:bg-surface-raised/20 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border border-slate-200 dark:border-surface-raised">
                    <AvatarImage src={student.photo} />
                    <AvatarFallback>{student.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{student.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{student.studentId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-raised p-1 rounded-lg w-fit">
                  <Button
                    variant={attendance[student.id] === 'present' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleStatusChange(student.id, 'present')}
                    className={`h-9 px-3 font-bold text-[10px] uppercase tracking-wider rounded-md ${
                      attendance[student.id] === 'present'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-emerald-600'
                    }`}
                  >
                    P
                  </Button>
                  <Button
                    variant={attendance[student.id] === 'late' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleStatusChange(student.id, 'late')}
                    className={`h-9 px-3 font-bold text-[10px] uppercase tracking-wider rounded-md ${
                      attendance[student.id] === 'late'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-amber-500'
                    }`}
                  >
                    L
                  </Button>
                  <Button
                    variant={attendance[student.id] === 'absent' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleStatusChange(student.id, 'absent')}
                    className={`h-9 px-3 font-bold text-[10px] uppercase tracking-wider rounded-md ${
                      attendance[student.id] === 'absent'
                      ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-red-500'
                    }`}
                  >
                    A
                  </Button>
                  <Button
                    variant={attendance[student.id] === 'excused' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleStatusChange(student.id, 'excused')}
                    className={`h-9 px-3 font-bold text-[10px] uppercase tracking-wider rounded-md ${
                      attendance[student.id] === 'excused'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-blue-500'
                    }`}
                  >
                    E
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 dark:bg-surface-raised/30 border-t border-slate-100 dark:border-surface-raised">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Present: {Object.values(attendance).filter(v => v === 'present').length}</div>
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-amber-500" /> Late: {Object.values(attendance).filter(v => v === 'late').length}</div>
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-500" /> Absent: {Object.values(attendance).filter(v => v === 'absent').length}</div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-slate-400 font-medium italic">All records are logged with server timestamp.</p>
              <Button onClick={handleSave} disabled={saving} className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-[11px] uppercase tracking-widest px-6 h-10 shadow-lg">
                {saving ? 'Saving…' : 'Finalize & Submit'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
