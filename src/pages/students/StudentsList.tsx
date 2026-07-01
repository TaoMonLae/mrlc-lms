import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, MoreHorizontal, User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { StudentCsvImport } from '../../components/students/StudentCsvImport';
import { toast } from 'sonner';
import { TableSkeleton } from '../../components/ui/loading-skeleton';
import { EmptySearchState } from '../../components/ui/empty-state';
import { getErrorMessage } from '../../lib/errors';

export default function StudentsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reloadStudents = async () => {
    try {
      const res = await fetch('/api/students', { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` } });
      if (res.ok) setStudents(await res.json());
    } catch { /* keep prior list */ }
  };

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/students', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch students');
        const data = await res.json();
        setStudents(data);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    const fetchClasses = async () => {
      try {
        const res = await fetch('/api/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        setClasses(data.map((c: any) => ({ id: c.id, name: c.name })));
      } catch {
        /* leave class filter with just "All Classes" on error */
      }
    };
    fetchStudents();
    fetchClasses();
  }, []);

  const mappedStudents = students.map((s: any) => ({
    id: s.id,
    studentId: s.studentCode,
    firstName: s.user?.firstName || '',
    lastName: s.user?.lastName || '',
    profilePhotoUrl: s.user?.profilePhotoUrl || s.profilePhotoUrl || null,
    class: s.class?.name || 'Unassigned',
    status: s.status || 'ACTIVE',
    gender: s.gender || 'MALE',
    enrollmentDate: s.enrollmentDate
  }));

  const filteredStudents = mappedStudents.filter(student => {
    const matchesSearch =
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === 'ALL' || student.class === classFilter;
    const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
      case 'ON_LEAVE': return <Badge variant="outline" className="text-amber-600 border-amber-600">On Leave</Badge>;
      case 'GRADUATED': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Graduated</Badge>;
      case 'DROPPED': return <Badge variant="destructive">Dropped</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Students</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage student records, enrollment, and academic profiles.</p>
        </div>
        <div className="flex items-center gap-2">
          <StudentCsvImport onImported={reloadStudents} />
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/students/new" />} nativeButton={false}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Card Container */}
      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-surface-raised flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 dark:bg-surface-raised border-slate-200 dark:border-surface-raised"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400 hidden sm:block" />
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-50 dark:bg-surface-raised border-slate-200 dark:border-surface-raised">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px] bg-slate-50 dark:bg-surface-raised border-slate-200 dark:border-surface-raised">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                <SelectItem value="GRADUATED">Graduated</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : (
            <>
              {filteredStudents.length === 0 && searchTerm && (
                <EmptySearchState searchTerm={searchTerm} onClear={() => setSearchTerm('')} />
              )}
              {filteredStudents.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm" role="table" aria-label="Students list">
                    <caption className="sr-only">List of all students including name, student ID, class, gender, enrollment date, and status</caption>
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold text-[11px] dark:bg-surface-raised/50">
                      <tr>
                        <th scope="col" className="px-6 py-4">Student</th>
                        <th scope="col" className="px-6 py-4">ID / Gender</th>
                        <th scope="col" className="px-6 py-4">Class</th>
                        <th scope="col" className="px-6 py-4">Enrollment Date</th>
                        <th scope="col" className="px-6 py-4">Status</th>
                        <th scope="col" className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <UserAvatar name={`${student.firstName} ${student.lastName}`} src={student.profilePhotoUrl} className="h-9 w-9 text-xs" />
                              <div>
                                <Link to={`/students/${student.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-aubergine-600 dark:hover:text-aubergine-400">
                                  {student.firstName} {student.lastName}
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-700 dark:text-slate-300">{student.studentId}</div>
                            <div className="text-[11px] text-slate-500 capitalize">{student.gender.toLowerCase()}</div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                            {student.class}
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-300">
                            {new Date(student.enrollmentDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(student.status)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" aria-label={`Open menu for ${student.firstName} ${student.lastName}`} />} nativeButton={true}>
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem render={<Link to={`/students/${student.id}`} />}>
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem render={<Link to={`/students/${student.id}/edit`} />}>
                                    Edit Details
                                  </DropdownMenuItem>
                                </DropdownMenuGroup>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-aubergine-600" render={<Link to="/attendance" />}>
                                  Record Attendance
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {filteredStudents.length === 0 && !searchTerm && (
                <div className="text-center py-10 text-slate-500">
                  <User className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                  <p>No students found matching your filters.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse"></div>
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            searchTerm ? (
              <EmptySearchState searchTerm={searchTerm} onClear={() => setSearchTerm('')} />
            ) : (
              <div className="text-center py-10 text-slate-500">
                <User className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p>No students found</p>
              </div>
            )
          ) : (
            filteredStudents.map((student) => (
              <div key={student.id} className="border border-slate-200 dark:border-surface-raised rounded-lg p-4 space-y-3 bg-white dark:bg-surface-indigo shadow-sm relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={`${student.firstName} ${student.lastName}`} src={student.profilePhotoUrl} className="h-10 w-10 text-sm" />
                    <div>
                      <Link to={`/students/${student.id}`} className="font-semibold text-slate-900 dark:text-white block hover:underline">
                        {student.firstName} {student.lastName}
                      </Link>
                      <span className="text-xs text-slate-500 font-mono">{student.studentId}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0 -mr-2 -mt-1" aria-label={`Open options menu for ${student.firstName} ${student.lastName}`} />} nativeButton={true}>
                      <MoreHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem render={<Link to={`/students/${student.id}`} />}>
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link to={`/students/${student.id}/edit`} />}>
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-slate-100 dark:border-surface-raised">
                  <div>
                    <span className="text-xs text-slate-500 block">Class</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">{student.class}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Enrolled</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate block">{new Date(student.enrollmentDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-2">
                  {getStatusBadge(student.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
