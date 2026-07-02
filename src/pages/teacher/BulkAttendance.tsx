import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiGet, apiSend } from "../../lib/api";
import {
  Calendar as CalendarIcon,
  Search,
  Save,
  Layers,
  Clock,
  MapPin,
  CheckCircle2,
  BookOpen
} from "lucide-react";

interface SessionData {
  id: string;
  classId: string;
  className: string;
  subjectId: string | null;
  subjectName: string;
  subjectColor: string;
  teacherId: string | null;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string | null;
}

interface StudentData {
  id: string;
  name: string;
  studentId: string;
  photo?: string | null;
}

interface BulkSessionData {
  session: SessionData;
  students: StudentData[];
  attendance: Record<string, 'present' | 'late' | 'absent' | 'excused'>;
  selected: boolean;
  complete: boolean;
  expanded: boolean;
}

export default function BulkAttendance() {
  const [sessions, setSessions] = useState<BulkSessionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    // Local calendar date, not the UTC day (toISOString shifts the date near midnight).
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSessions();
  }, [selectedDate]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      // Parse as local time so getDay() returns the weekday of the picked date.
      const date = new Date(`${selectedDate}T00:00:00`);
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayOfWeek = dayNames[date.getDay()];

      // Get teacher's sessions for the day
      const response = await apiGet<SessionData[]>(`/api/timetable?dayOfWeek=${dayOfWeek}&scheduleType=CLASS&status=ACTIVE`);
      const teacherSessions = (response ?? []).filter(s => s.teacherId);

      // Load students for each session
      const sessionData: BulkSessionData[] = await Promise.all(
        teacherSessions.map(async (session) => {
          const students = await apiGet<StudentData[]>(`/api/teacher/roster?classId=${session.classId}`);
          return {
            session,
            students: students ?? [],
            attendance: {},
            selected: true,
            complete: false,
            expanded: true
          };
        })
      );

      setSessions(sessionData);
    } catch (err: any) {
      toast.error(err.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (sessionIndex: number, studentId: string, status: 'present' | 'late' | 'absent' | 'excused') => {
    const newSessions = [...sessions];
    newSessions[sessionIndex].attendance[studentId] = status;

    // Check if session is complete
    const session = newSessions[sessionIndex];
    const markedCount = Object.keys(session.attendance).length;
    session.complete = markedCount === session.students.length;

    setSessions(newSessions);
  };

  const markAllPresentForSession = (sessionIndex: number) => {
    const newSessions = [...sessions];
    const session = newSessions[sessionIndex];
    const newAttendance: Record<string, 'present'> = {};
    session.students.forEach(s => {
      newAttendance[s.id] = 'present';
    });
    session.attendance = newAttendance;
    session.complete = true;
    setSessions(newSessions);
  };

  const toggleSessionSelection = (sessionIndex: number) => {
    const newSessions = [...sessions];
    newSessions[sessionIndex].selected = !newSessions[sessionIndex].selected;
    setSessions(newSessions);
  };

  const toggleSessionExpanded = (sessionIndex: number) => {
    const newSessions = [...sessions];
    newSessions[sessionIndex].expanded = !newSessions[sessionIndex].expanded;
    setSessions(newSessions);
  };

  const toggleAllSessions = () => {
    const newState = !sessions.every(s => s.selected);
    const newSessions = sessions.map(s => ({ ...s, selected: newState }));
    setSessions(newSessions);
  };

  const handleSave = async () => {
    const selectedSessions = sessions.filter(s => s.selected);

    // Validate all selected sessions are complete
    const incomplete = selectedSessions.filter(s => !s.complete);
    if (incomplete.length > 0) {
      toast.warning(`${incomplete.length} session(s) not fully marked. Please mark all students before submitting.`, {
        description: incomplete.map(s => `${s.session.subjectName} (${s.session.className})`).join(', ')
      });
      return;
    }

    if (selectedSessions.length === 0) {
      toast.error("No sessions selected");
      return;
    }

    setSaving(true);
    try {
      const sessionRecords = selectedSessions.map(s => ({
        timetableEntryId: s.session.id,
        records: s.students.map(student => ({
          studentId: student.id,
          status: (s.attendance[student.id] || 'present').toUpperCase() as "PRESENT" | "ABSENT" | "LATE" | "EXCUSED",
          remarks: null
        }))
      }));

      const result = await apiSend('/api/attendance/bulk', 'POST', {
        date: selectedDate,
        sessionRecords
      });

      toast.success(`Bulk attendance saved!`, {
        description: `${result.sessionsSuccessful} of ${result.sessionsProcessed} sessions processed successfully.`
      });

      // Reload sessions to clear the form
      loadSessions();
    } catch (err: any) {
      toast.error(err.message || "Failed to save bulk attendance");
    } finally {
      setSaving(false);
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.session.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.session.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStudents = sessions.reduce((sum, s) => sum + s.students.length, 0);
  const totalMarked = sessions.reduce((sum, s) => sum + Object.keys(s.attendance).length, 0);
  const selectedComplete = sessions.filter(s => s.selected && s.complete).length;
  const selectedTotal = sessions.filter(s => s.selected).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase">Bulk Attendance</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Mark attendance for multiple sessions at once.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleAllSessions} className="h-10 px-4 font-bold text-[11px] uppercase tracking-widest border-slate-200 dark:border-surface-raised">
            {sessions.every(s => s.selected) ? 'Deselect All' : 'Select All'} Sessions
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || selectedComplete === 0} className="h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[11px] uppercase tracking-widest shadow-lg">
            <Save className="h-3.5 w-3.5 mr-2" /> Save {selectedComplete > 0 ? `(${selectedComplete})` : ''}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-surface-raised flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-surface-raised/30">
          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Date</span>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo"
              />
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Find session..."
              className="pl-10 h-10 bg-white dark:bg-surface-indigo border-slate-200 dark:border-surface-raised"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Progress Summary */}
        <div className="px-4 py-3 bg-slate-50/50 dark:bg-surface-raised/30 border-b border-slate-100 dark:border-surface-raised">
          <div className="flex items-center justify-between text-xs">
            <div className="flex gap-4">
              <span className="text-slate-500">{totalStudents} total students</span>
              <span className="text-slate-500">{totalMarked} marked</span>
              <span className="text-emerald-600 font-medium">{selectedComplete}/{selectedTotal} sessions complete</span>
            </div>
            <div className="w-48 bg-slate-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${totalStudents > 0 ? (totalMarked / totalStudents) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Sessions List */}
      {loading ? (
        <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">Loading sessions...</p>
          </CardContent>
        </Card>
      ) : filteredSessions.length === 0 ? (
        <Card className="border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm">
          <CardContent className="p-8 text-center">
            <p className="text-slate-500">No sessions found for the selected date.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((sessionData, sessionIndex) => (
            <Card key={sessionData.session.id} className={`border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo shadow-sm overflow-hidden ${!sessionData.selected ? 'opacity-60' : ''}`}>
              {/* Session Header */}
              <div
                onClick={() => toggleSessionExpanded(sessionIndex)}
                className="p-4 border-b border-slate-100 dark:border-surface-raised bg-slate-50/50 dark:bg-surface-raised/30 cursor-pointer hover:bg-slate-100/50 dark:hover:bg-surface-raised/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSessionSelection(sessionIndex);
                      }}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                        sessionData.selected
                          ? 'bg-primary border-primary'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {sessionData.selected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <Badge className={`h-3 w-3 rounded-full p-0 ${sessionData.session.subjectColor.replace('bg-', 'bg-') || 'bg-blue-500'}`} />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{sessionData.session.subjectName}</h3>
                      <p className="text-[10px] text-slate-500 flex items-center gap-3">
                        <span>{sessionData.session.className}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {sessionData.session.startTime} - {sessionData.session.endTime}</span>
                        {sessionData.session.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {sessionData.session.room}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {sessionData.complete ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        {Object.keys(sessionData.attendance).length}/{sessionData.students.length} marked
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllPresentForSession(sessionIndex);
                      }}
                      className="h-8 px-3 text-xs"
                      disabled={!sessionData.selected}
                    >
                      Mark All Present
                    </Button>
                  </div>
                </div>
              </div>

              {/* Students List */}
              {sessionData.expanded && (
                <div className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sessionData.students.map((student) => (
                      <div key={student.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-6 hover:bg-slate-50/50 dark:hover:bg-surface-raised/20 transition-colors gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{student.name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{student.studentId}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-surface-raised p-1 rounded-lg w-fit">
                          {(['present', 'late', 'absent', 'excused'] as const).map((status) => (
                            <Button
                              key={status}
                              variant={sessionData.attendance[student.id] === status ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => handleStatusChange(sessionIndex, student.id, status)}
                              className={`h-8 px-3 font-bold text-[10px] uppercase tracking-wider rounded-md ${
                                sessionData.attendance[student.id] === status
                                  ? status === 'present' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                                    : status === 'late' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
                                    : status === 'absent' ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                              disabled={!sessionData.selected}
                            >
                              {status[0].toUpperCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
