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
  Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { apiSend, fetchOrMock } from "../../lib/api";

interface RosterStudent { id: string; name: string; studentId: string; photo?: string | null; }

const MOCK_STUDENTS: RosterStudent[] = [
  { id: "s1", name: "Min Khant", studentId: "STU-2023-001", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Min" },
  { id: "s2", name: "Zun Pwint", studentId: "STU-2023-002", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zun" },
  { id: "s3", name: "Aung Ko", studentId: "STU-2023-003", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aung" },
  { id: "s4", name: "May Mon", studentId: "STU-2023-004", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=May" },
  { id: "s5", name: "Htet Aung", studentId: "STU-2023-005", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Htet" },
  { id: "s6", name: "Khin Myat", studentId: "STU-2023-006", photo: "https://api.dicebear.com/7.x/avataaars/svg?seed=Khin" },
];

const MOCK_CLASS_OPTIONS = [
  { value: 'c1', label: 'GED Social Studies' },
  { value: 'c2', label: 'Pre-GED English' },
  { value: 'c3', label: 'GED Math Prep' },
];

export default function TeacherAttendance() {
  const [classOptions, setClassOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'late' | 'absent' | 'excused'>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrMock<{ id: string; name: string }[]>('/api/teacher/classes', MOCK_CLASS_OPTIONS.map((o) => ({ id: o.value, name: o.label })))
      .then((r) => {
        const opts = r.data.map((c) => ({ value: c.id, label: c.name }));
        setClassOptions(opts);
        setSelectedClass((prev) => prev || opts[0]?.value || "");
      });
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    setAttendance({});
    fetchOrMock<RosterStudent[]>(`/api/teacher/roster?classId=${selectedClass}`, MOCK_STUDENTS).then((r) => setStudents(r.data));
  }, [selectedClass]);

  const CLASS_OPTIONS = classOptions;

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
    if (!selectedClass) {
      toast.error('Please select a class first.');
      return;
    }
    setSaving(true);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        status: attendance[s.id].toUpperCase(),
        remarks: null,
      }));
      await apiSend('/api/attendance', 'POST', {
        classId: selectedClass,
        date: new Date().toISOString(),
        records,
      });
      toast.success('Attendance saved successfully!', {
        description: `${students.length} students recorded for ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight dark:text-white uppercase">Take Attendance</h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">Record daily attendance for your assigned classes.</p>
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
            <div className="flex flex-col gap-1.5 min-w-[200px]">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Selected Class</span>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="h-10 border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo">
                        <SelectValue placeholder="Select Class">
                          {CLASS_OPTIONS.find(o => o.value === selectedClass)?.label ?? 'Select Class'}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {CLASS_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Session Date</span>
                <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 dark:border-surface-raised bg-white dark:bg-surface-indigo text-sm font-bold text-slate-700 dark:text-slate-300">
                    <CalendarIcon className="h-4 w-4 mr-2 text-slate-400" />
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            </div>
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
