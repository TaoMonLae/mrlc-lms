import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Clock, AlertCircle, Save, FileText, Users, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | null;

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
  notes: string;
}

export default function AttendancePage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/classes', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setClasses(data);
          if (data.length > 0) {
            setSelectedClass(data[0].id);
          }
        }
      } catch (err) {
        // Silently fail - will show empty class list
      }
    };
    fetchClasses();
  }, []);

  // Fetch student lists & attendance records when class or date changes
  useEffect(() => {
    const fetchAttendanceAndStudents = async () => {
      if (!selectedClass) return;
      setIsLoading(true);
      try {
        const token = sessionStorage.getItem('auth_token');
        
        // 1. Fetch class students
        const studentsRes = await fetch('/api/students', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!studentsRes.ok) throw new Error('Failed to load students');
        const allStudents = await studentsRes.json();
        const classStudents = allStudents.filter((s: any) => s.classId === selectedClass);
        setStudents(classStudents);

        // 2. Fetch existing attendance records
        const attendanceRes = await fetch(`/api/attendance?classId=${selectedClass}&date=${selectedDate}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!attendanceRes.ok) throw new Error('Failed to load attendance records');
        const existingRecords = await attendanceRes.json();

        // 3. Populate state records
        const initialRecords: Record<string, AttendanceRecord> = {};
        let hasSavedRecords = false;

        classStudents.forEach((s: any) => {
          const matched = existingRecords.find((r: any) => r.studentId === s.id);
          if (matched) {
            initialRecords[s.id] = {
              studentId: s.id,
              status: matched.status,
              notes: matched.remarks || '',
            };
            hasSavedRecords = true;
          } else {
            initialRecords[s.id] = {
              studentId: s.id,
              status: null,
              notes: '',
            };
          }
        });

        setRecords(initialRecords);
        if (hasSavedRecords) {
          setIsSaved(true);
          setIsEditing(false);
        } else {
          setIsSaved(false);
          setIsEditing(true);
        }
      } catch (err) {
        toast.error('Failed to load attendance data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceAndStudents();
  }, [selectedClass, selectedDate]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    if (!isEditing) return;
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    if (!isEditing) return;
    setRecords(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  };

  const markAllPresent = () => {
    if (!isEditing) return;
    const newRecords = { ...records };
    students.forEach(s => {
      if (!newRecords[s.id].status) {
        newRecords[s.id].status = 'PRESENT';
      }
    });
    setRecords(newRecords);
  };

  const handleSave = async () => {
    const allMarked = students.every(s => records[s.id]?.status !== null);
    if (!allMarked) {
      toast.error('Please mark attendance for all students before saving.');
      return;
    }
    
    try {
      const recordsArray = students.map(s => ({
        studentId: s.id,
        status: records[s.id].status,
        remarks: records[s.id].notes || null,
      }));

      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classId: selectedClass,
          date: selectedDate,
          records: recordsArray,
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save attendance');
      }

      setIsSaved(true);
      setIsEditing(false);
      toast.success('Attendance saved successfully');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save attendance');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsSaved(false);
  };

  const counts = {
    present: Object.values(records).filter(r => r.status === 'PRESENT').length,
    absent: Object.values(records).filter(r => r.status === 'ABSENT').length,
    late: Object.values(records).filter(r => r.status === 'LATE').length,
    excused: Object.values(records).filter(r => r.status === 'EXCUSED').length,
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Record Attendance</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Daily attendance tracking for your classes.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" render={<Link to="/attendance/reports" />} nativeButton={false}>
            <FileText className="mr-2 h-4 w-4" />
            View Reports
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col sm:flex-row gap-4 items-end">
        <div className="space-y-2 w-full sm:w-[250px]">
          <Label>Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select class">
                {classes.find(c => c.id === selectedClass)?.name ?? 'Select class'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2 w-full sm:w-[200px]">
          <Label>Date</Label>
          <Input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="flex-1"></div>
        
        <div className="w-full sm:w-auto">
          {isSaved ? (
            <Button onClick={handleEdit} variant="outline" className="w-full">
              <Edit className="mr-2 h-4 w-4" />
              Edit Attendance
            </Button>
          ) : (
            <Button onClick={markAllPresent} variant="secondary" className="w-full text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30">
              <Check className="mr-2 h-4 w-4" />
              Mark Unmarked as Present
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{counts.present}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Present</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
            <X className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{counts.absent}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Absent</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{counts.late}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Late</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4 shadow-sm">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{counts.excused}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Excused</p>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
        {isSaved && (
           <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 flex items-center gap-3 border-b border-emerald-100 dark:border-emerald-800">
             <Check className="h-5 w-5 text-emerald-600" />
             <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Attendance for this date has been saved. Editing is locked.</p>
           </div>
        )}
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 w-1/3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-aubergine-600 border-t-transparent inline-block mr-2 align-middle"></span>
                    Loading class records...
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map(student => {
                  const record: Partial<AttendanceRecord> = records[student.id] || {};
                  const firstName = student.user?.firstName || student.firstName || '';
                  const lastName = student.user?.lastName || student.lastName || '';
                  const studentId = student.studentCode || student.studentId || '';
                  return (
                    <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {firstName} {lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                        {studentId}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant={record.status === 'PRESENT' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(student.id, 'PRESENT')}
                            className={record.status === 'PRESENT' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                            disabled={!isEditing}
                          >
                            P
                          </Button>
                          <Button 
                            size="sm" 
                            variant={record.status === 'ABSENT' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(student.id, 'ABSENT')}
                            className={record.status === 'ABSENT' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                            disabled={!isEditing}
                          >
                            A
                          </Button>
                          <Button 
                            size="sm" 
                            variant={record.status === 'LATE' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(student.id, 'LATE')}
                            className={record.status === 'LATE' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
                            disabled={!isEditing}
                          >
                            L
                          </Button>
                          <Button 
                            size="sm" 
                            variant={record.status === 'EXCUSED' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(student.id, 'EXCUSED')}
                            className={record.status === 'EXCUSED' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                            disabled={!isEditing}
                          >
                            E
                          </Button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Input 
                          placeholder="Add note..." 
                          value={record.notes || ''} 
                          onChange={(e) => handleNotesChange(student.id, e.target.value)}
                          disabled={!isEditing}
                          className="h-8"
                        />
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    <Users className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p>No students enrolled in this class.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {isLoading ? (
            <div className="text-center py-10 text-slate-500">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-aubergine-600 border-t-transparent inline-block mr-2 align-middle"></span>
              Loading...
            </div>
          ) : students.length > 0 ? (
             students.map(student => {
               const record: Partial<AttendanceRecord> = records[student.id] || {};
               const firstName = student.user?.firstName || student.firstName || '';
               const lastName = student.user?.lastName || student.lastName || '';
               const studentId = student.studentCode || student.studentId || '';
               return (
                 <div key={student.id} className="border border-slate-200 dark:border-surface-raised rounded-lg p-4 space-y-4 bg-white dark:bg-surface-indigo shadow-sm relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {firstName} {lastName}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {studentId}
                        </div>
                      </div>
                      {!isEditing && record.status && (
                        <Badge className={
                          record.status === 'PRESENT' ? 'bg-emerald-500' :
                          record.status === 'ABSENT' ? 'bg-red-500' :
                          record.status === 'LATE' ? 'bg-amber-500' : 'bg-blue-500'
                        }>
                          {record.status}
                        </Badge>
                      )}
                    </div>
                    
                    {isEditing && (
                      <div className="grid grid-cols-4 gap-2">
                        <Button 
                          size="sm" 
                          variant={record.status === 'PRESENT' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(student.id, 'PRESENT')}
                          className={record.status === 'PRESENT' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
                        >
                          P
                        </Button>
                        <Button 
                          size="sm" 
                          variant={record.status === 'ABSENT' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(student.id, 'ABSENT')}
                          className={record.status === 'ABSENT' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                        >
                          A
                        </Button>
                        <Button 
                          size="sm" 
                          variant={record.status === 'LATE' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(student.id, 'LATE')}
                          className={record.status === 'LATE' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
                        >
                          L
                        </Button>
                        <Button 
                          size="sm" 
                          variant={record.status === 'EXCUSED' ? 'default' : 'outline'}
                          onClick={() => handleStatusChange(student.id, 'EXCUSED')}
                          className={record.status === 'EXCUSED' ? 'bg-blue-500 hover:bg-blue-600 text-white' : ''}
                        >
                          E
                        </Button>
                      </div>
                    )}

                    <Input 
                      placeholder="Add note..." 
                      value={record.notes || ''} 
                      onChange={(e) => handleNotesChange(student.id, e.target.value)}
                      disabled={!isEditing}
                      className="h-8 text-sm"
                    />
                 </div>
               )
             })
          ) : (
            <div className="text-center py-10 text-slate-500 border border-dashed border-slate-200 dark:border-surface-raised rounded-lg">
              <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p>No students found</p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        {students.length > 0 && !isSaved && (
          <div className="p-4 border-t border-slate-200 dark:border-surface-raised bg-slate-50 dark:bg-surface-raised/30 flex justify-end">
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground px-8">
              <Save className="mr-2 h-4 w-4" />
              Save Attendance
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
