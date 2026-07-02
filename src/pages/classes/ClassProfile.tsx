import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Users,
  BookOpen,
  Clock,
  CheckCircle2,
  Calendar,
  Archive,
  ArchiveRestore,
  GraduationCap,
  Plus,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from '../../lib/permissions';
import { toast } from 'sonner';

type ClassStudentRow = {
  id: string;
  name: string;
  studentCode: string;
};

type ClassTeacherRow = {
  id: string;
  name: string;
};

type ClassExamRow = {
  id: string;
  title: string;
  subjectName: string;
};

type ClassSubjectRow = {
  id: string;
  name: string;
  /** true = directly assigned (removable); false = inferred from an exam */
  assigned: boolean;
};

type ClassData = {
  id: string;
  name: string;
  level: string;
  academicYear: string;
  room?: string | null;
  capacity?: number | null;
  status?: string;
  students: ClassStudentRow[];
  teachers: ClassTeacherRow[];
  exams: ClassExamRow[];
  subjects: ClassSubjectRow[];
};

const fullName = (u: any) =>
  `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() || 'Unknown';

export default function ClassProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const { hasPermission } = usePermissions();
  const canManageClass = hasPermission('manage_classes');

  const [klass, setKlass] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);

  // Teacher assignment
  const [allTeachers, setAllTeachers] = useState<{ id: string; name: string }[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Subject assignment
  const [allSubjects, setAllSubjects] = useState<{ id: string; name: string }[]>([]);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Student assignment
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [candidateStudents, setCandidateStudents] = useState<{ id: string; name: string; studentCode: string; className: string | null }[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [assigningStudents, setAssigningStudents] = useState(false);

  const loadClass = async () => {
    if (!id) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (res.status === 404) setKlass(null);
        else if (res.status === 401 || res.status === 403) toast.error('You do not have permission to view this class');
        else throw new Error('Failed to fetch class');
        return;
      }
      const data = await res.json();
      const students: ClassStudentRow[] = (data.students || []).map((s: any) => ({
        id: s.id, name: fullName(s.user), studentCode: s.studentCode || '—',
      }));
      const teachers: ClassTeacherRow[] = (data.teachers || []).map((ct: any) => ({
        id: ct.teacher?.id || ct.teacherId, name: fullName(ct.teacher?.user),
      }));
      const exams: ClassExamRow[] = (data.exams || []).map((e: any) => ({
        id: e.id, title: e.title || 'Untitled', subjectName: e.subject?.name || '—',
      }));
      // Directly assigned subjects, plus any inferred from exams (non-removable).
      const assigned: ClassSubjectRow[] = (data.subjects || [])
        .filter((cs: any) => cs.subject)
        .map((cs: any) => ({ id: cs.subject.id, name: cs.subject.name, assigned: true }));
      const assignedIds = new Set(assigned.map((s) => s.id));
      const fromExams: ClassSubjectRow[] = [];
      for (const e of data.exams || []) {
        if (e.subject?.id && !assignedIds.has(e.subject.id) && !fromExams.some((s) => s.id === e.subject.id)) {
          fromExams.push({ id: e.subject.id, name: e.subject.name, assigned: false });
        }
      }
      setKlass({
        id: data.id, name: data.name, level: data.level, academicYear: data.academicYear,
        room: data.room, capacity: data.capacity, status: data.status,
        students, teachers, exams, subjects: [...assigned, ...fromExams],
      });
    } catch (error) {
      console.error('Error fetching class:', error);
      toast.error('Failed to load class');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClass(); /* eslint-disable-next-line */ }, [id]);

  // Load all teachers and subjects for the assignment pickers (admins only).
  useEffect(() => {
    if (!canManageClass) return;
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAllTeachers((Array.isArray(data) ? data : []).map((t: any) => ({
        id: t.id, name: `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || t.teacherCode,
      }))))
      .catch(() => {});
    fetch('/api/subjects', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setAllSubjects((Array.isArray(data) ? data : []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => {});
  }, [canManageClass]);

  const assignTeacher = async () => {
    if (!assignTeacherId) { toast.error('Select a teacher'); return; }
    setAssigning(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${id}/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacherId: assignTeacherId }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to assign'); }
      toast.success('Teacher assigned');
      setAssignOpen(false);
      setAssignTeacherId('');
      await loadClass();
    } catch (e: any) {
      toast.error(e.message || 'Failed to assign teacher');
    } finally {
      setAssigning(false);
    }
  };

  const removeTeacher = async (teacherId: string) => {
    if (!confirm('Remove this teacher from the class?')) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${id}/teachers/${teacherId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to remove');
      toast.success('Teacher removed');
      await loadClass();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove teacher');
    }
  };

  const addSubject = async () => {
    if (!addSubjectId) { toast.error('Select a subject'); return; }
    setAddingSubject(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${id}/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subjectId: addSubjectId }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to add subject'); }
      toast.success('Subject added');
      setSubjectOpen(false);
      setAddSubjectId('');
      await loadClass();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add subject');
    } finally {
      setAddingSubject(false);
    }
  };

  const removeSubject = async (subjectId: string) => {
    if (!confirm('Remove this subject from the class?')) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${id}/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to remove');
      toast.success('Subject removed');
      await loadClass();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove subject');
    }
  };

  const openStudentsDialog = async () => {
    setStudentsOpen(true);
    setSelectedStudentIds([]);
    setStudentSearch('');
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } });
      const data = res.ok ? await res.json() : [];
      setCandidateStudents((Array.isArray(data) ? data : [])
        .filter((s: any) => s.classId !== id)
        .map((s: any) => ({
          id: s.id,
          name: fullName(s.user),
          studentCode: s.studentCode || '—',
          className: s.class?.name || null,
        })));
    } catch {
      setCandidateStudents([]);
    }
  };

  const assignStudents = async () => {
    if (!selectedStudentIds.length) { toast.error('Select at least one student'); return; }
    setAssigningStudents(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to assign students'); }
      toast.success(`${selectedStudentIds.length} student${selectedStudentIds.length > 1 ? 's' : ''} assigned`);
      setStudentsOpen(false);
      await loadClass();
    } catch (e: any) {
      toast.error(e.message || 'Failed to assign students');
    } finally {
      setAssigningStudents(false);
    }
  };

  const removeStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the class? They will be left unassigned.')) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${id}/students/${studentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to remove'); }
      toast.success('Student removed from class');
      await loadClass();
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove student');
    }
  };

  const handleArchive = async () => {
    if (!klass) return;
    const archiving_ = klass.status !== 'ARCHIVED';
    if (!confirm(archiving_ ? 'Archive this class? It will be hidden from active lists.' : 'Restore this class to active status?')) return;
    setArchiving(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: archiving_ ? 'ARCHIVED' : 'ACTIVE' }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to update class'); }
      toast.success(archiving_ ? 'Class has been archived.' : 'Class restored.');
      await loadClass();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update class');
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500">Loading class...</span>
      </div>
    );
  }

  if (!klass) {
    return (
      <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
        <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/classes" />} nativeButton={false}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-8 text-center text-slate-500">
          Class not found.
        </div>
      </div>
    );
  }

  const mainTeacher = klass.teachers[0];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-3 mb-2 text-slate-500 hover:text-slate-900 dark:hover:text-white" render={<Link to="/classes" />} nativeButton={false}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Classes
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{klass.name}</h1>
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-2 mt-2 font-medium">
            <span>{klass.level}</span>
            <span className="text-slate-300">•</span>
            <span>{klass.academicYear}</span>
            {klass.room && (
              <>
                <span className="text-slate-300">•</span>
                <span>Room {klass.room}</span>
              </>
            )}
          </p>
        </div>
        {canManageClass && (
          <div className="flex gap-2">
            <Button variant="outline" render={<Link to={`/classes/${id}/edit`} />} nativeButton={false}>
              <Edit className="mr-2 h-4 w-4" /> Edit Class
            </Button>
            <Button variant="secondary" className="text-amber-600 bg-amber-50 hover:bg-amber-100" onClick={handleArchive} disabled={archiving}>
              {klass.status === 'ARCHIVED'
                ? <><ArchiveRestore className="mr-2 h-4 w-4" /> {archiving ? 'Restoring…' : 'Restore'}</>
                : <><Archive className="mr-2 h-4 w-4" /> {archiving ? 'Archiving…' : 'Archive'}</>}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{klass.students.length}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Students</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{klass.capacity ?? '—'}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Capacity</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-aubergine-100 dark:bg-aubergine-900/30 flex items-center justify-center text-aubergine-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{klass.exams.length}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Exams</p>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-indigo p-5 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            {mainTeacher ? (
              <Link to={`/teachers/${mainTeacher.id}`} className="text-sm font-bold text-slate-900 dark:text-white hover:underline truncate inline-block max-w-[100px]">{mainTeacher.name}</Link>
            ) : (
              <p className="text-sm font-bold text-slate-400">Unassigned</p>
            )}
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Main Teacher</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl shadow-sm">
        <div className="px-6 pt-4 overflow-x-auto">
          <TabsList className="bg-transparent border-b border-slate-100 dark:border-surface-raised w-full justify-start rounded-none h-12 gap-6 min-w-[600px]">
            <TabsTrigger value="overview" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Overview</TabsTrigger>
            <TabsTrigger value="students" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Students</TabsTrigger>
            <TabsTrigger value="teachers" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Teachers</TabsTrigger>
            <TabsTrigger value="subjects" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Subjects</TabsTrigger>
            <TabsTrigger value="attendance" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Attendance</TabsTrigger>
            <TabsTrigger value="exams" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Exams</TabsTrigger>
            <TabsTrigger value="timetable" className="border-b-2 border-transparent data-[state=active]:border-aubergine-500 rounded-none bg-transparent px-0 text-sm font-semibold h-12">Timetable</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Level</p>
              <p className="text-slate-900 dark:text-white font-medium mt-1">{klass.level}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Academic Year</p>
              <p className="text-slate-900 dark:text-white font-medium mt-1">{klass.academicYear}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Room</p>
              <p className="text-slate-900 dark:text-white font-medium mt-1">{klass.room || '—'}</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="students" className="p-0 animate-in fade-in slide-in-from-bottom-2">
          {canManageClass && (
            <div className="p-4 border-b border-slate-200 dark:border-surface-raised flex justify-end">
              <Button size="sm" onClick={openStudentsDialog}><Users className="w-4 h-4 mr-2" /> Assign Students</Button>
            </div>
          )}
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Student ID</th>
                {canManageClass && <th className="px-6 py-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {klass.students.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    <Link to={`/students/${student.id}`} className="hover:underline hover:text-aubergine-600">{student.name}</Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-mono">{student.studentCode}</td>
                  {canManageClass && (
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeStudent(student.id)}>Remove</Button>
                    </td>
                  )}
                </tr>
              ))}
              {klass.students.length === 0 && (
                <tr>
                  <td colSpan={canManageClass ? 3 : 2} className="py-8 text-center text-slate-500">No students assigned.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* Assign students dialog */}
          {studentsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !assigningStudents && setStudentsOpen(false)}>
              <div className="w-full max-w-lg bg-white dark:bg-surface-indigo rounded-xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assign Students</h3>
                <Input
                  placeholder="Search by name or student ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-surface-raised">
                  {candidateStudents
                    .filter((s) =>
                      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                      s.studentCode.toLowerCase().includes(studentSearch.toLowerCase()))
                    .map((s) => (
                      <label key={s.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.includes(s.id)}
                          onChange={(e) => setSelectedStudentIds((prev) =>
                            e.target.checked ? [...prev, s.id] : prev.filter((x) => x !== s.id))}
                        />
                        <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">{s.name}</span>
                        <span className="text-xs font-mono text-slate-400">{s.studentCode}</span>
                        {s.className && <Badge variant="outline" className="text-[10px]">{s.className}</Badge>}
                      </label>
                    ))}
                  {candidateStudents.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-slate-400">
                      No unassigned students available. <Link to="/students/new" className="underline text-aubergine-600">Add a student</Link> first.
                    </p>
                  )}
                </div>
                {selectedStudentIds.length > 0 && (
                  <p className="text-xs text-slate-500">{selectedStudentIds.length} selected. Students already in another class will be moved to this one.</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStudentsOpen(false)} disabled={assigningStudents}>Cancel</Button>
                  <Button className="bg-primary text-primary-foreground" onClick={assignStudents} disabled={assigningStudents || selectedStudentIds.length === 0}>
                    {assigningStudents ? 'Assigning…' : `Assign${selectedStudentIds.length ? ` (${selectedStudentIds.length})` : ''}`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="teachers" className="p-0 animate-in fade-in slide-in-from-bottom-2">
          {canManageClass && (
            <div className="p-4 border-b border-slate-200 dark:border-surface-raised flex justify-end">
              <Button size="sm" onClick={() => setAssignOpen(true)}><Plus className="w-4 h-4 mr-2" /> Assign Teacher</Button>
            </div>
          )}
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
              <tr>
                <th className="px-6 py-4">Teacher</th>
                {canManageClass && <th className="px-6 py-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {klass.teachers.map(teacher => (
                <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    <Link to={`/teachers/${teacher.id}`} className="hover:underline hover:text-aubergine-600">{teacher.name}</Link>
                  </td>
                  {canManageClass && (
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeTeacher(teacher.id)}>Remove</Button>
                    </td>
                  )}
                </tr>
              ))}
              {klass.teachers.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-slate-500">No teachers assigned.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          {/* Assign teacher dialog */}
          {assignOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !assigning && setAssignOpen(false)}>
              <div className="w-full max-w-md bg-white dark:bg-surface-indigo rounded-xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assign Teacher</h3>
                <div className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Teacher</span>
                  <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a teacher">
                        {allTeachers.find((t) => t.id === assignTeacherId)?.name || 'Select a teacher'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allTeachers
                        .filter((t) => !klass.teachers.some((kt) => kt.id === t.id))
                        .map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {allTeachers.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No teachers found. <Link to="/teachers/new" className="underline text-aubergine-600">Add a teacher</Link> first, then assign them here.
                    </p>
                  ) : allTeachers.filter((t) => !klass.teachers.some((kt) => kt.id === t.id)).length === 0 && (
                    <p className="text-xs text-slate-400">
                      All {allTeachers.length} teacher{allTeachers.length > 1 ? 's are' : ' is'} already assigned to this class.{' '}
                      <Link to="/teachers/new" className="underline text-aubergine-600">Add another teacher</Link> to assign more.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setAssignOpen(false)} disabled={assigning}>Cancel</Button>
                  <Button className="bg-primary text-primary-foreground" onClick={assignTeacher} disabled={assigning}>
                    {assigning ? 'Assigning…' : 'Assign'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="subjects" className="p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Subjects</h3>
            {canManageClass && (
              <Button size="sm" variant="outline" onClick={() => setSubjectOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Subject</Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {klass.subjects.map(s => (
              <Badge key={s.id} variant="outline" className="px-3 py-1.5 text-sm font-medium border-slate-200 gap-1.5" title={s.assigned ? undefined : 'Linked via an exam'}>
                {s.name}
                {!s.assigned && <span className="text-[10px] text-slate-400">(exam)</span>}
                {s.assigned && canManageClass && (
                  <button
                    type="button"
                    onClick={() => removeSubject(s.id)}
                    className="rounded-full hover:bg-slate-200/70 dark:hover:bg-surface-raised p-0.5"
                    aria-label={`Remove ${s.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
            {klass.subjects.length === 0 && (
              <p className="text-sm text-slate-500">No subjects associated with this class yet.</p>
            )}
          </div>

          {/* Add subject dialog */}
          {subjectOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !addingSubject && setSubjectOpen(false)}>
              <div className="w-full max-w-md bg-white dark:bg-surface-indigo rounded-xl shadow-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Subject</h3>
                <div className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Subject</span>
                  <Select value={addSubjectId} onValueChange={setAddSubjectId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {allSubjects
                        .filter((s) => !klass.subjects.some((ks) => ks.assigned && ks.id === s.id))
                        .map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {allSubjects.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No subjects found. <Link to="/subjects/new" className="underline text-aubergine-600">Create a subject</Link> first, then add it here.
                    </p>
                  ) : allSubjects.filter((s) => !klass.subjects.some((ks) => ks.assigned && ks.id === s.id)).length === 0 && (
                    <p className="text-xs text-slate-400">All subjects are already added to this class.</p>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setSubjectOpen(false)} disabled={addingSubject}>Cancel</Button>
                  <Button className="bg-primary text-primary-foreground" onClick={addSubject} disabled={addingSubject}>
                    {addingSubject ? 'Adding…' : 'Add'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center py-10">
            <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">Attendance Records</p>
            <p className="text-slate-500 text-sm mb-6">View and manage daily attendance for this class.</p>
            <Button render={<Link to="/attendance" />} nativeButton={false}>Go to Attendance Module</Button>
          </div>
        </TabsContent>

        <TabsContent value="exams" className="p-0 animate-in fade-in slide-in-from-bottom-2">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
              <tr>
                <th className="px-6 py-4">Exam</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {klass.exams.map(exam => (
                <tr key={exam.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    <Link to={`/exams/${exam.id}`} className="hover:underline hover:text-aubergine-600">{exam.title}</Link>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{exam.subjectName}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" render={<Link to={`/exams/${exam.id}`} />} nativeButton={false}>View</Button>
                  </td>
                </tr>
              ))}
              {klass.exams.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500">No exams for this class.</td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </TabsContent>

        <TabsContent value="timetable" className="p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="text-center py-10">
            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-lg font-medium text-slate-900 dark:text-white">Class Timetable</p>
            <p className="text-slate-500 text-sm">Timetable management coming soon.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
