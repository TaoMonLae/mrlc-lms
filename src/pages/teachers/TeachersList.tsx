import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  MapPin, 
  GraduationCap 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { type Teacher } from '../../types/teacher';
import { toast } from 'sonner';

interface TeacherData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  subjects?: string;
  employmentType: string;
  status: string;
  joinedDate: string;
  profilePhotoUrl?: string;
  teacherId?: string;
}

export default function TeachersList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/teachers', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            toast.error('You do not have permission to view teachers');
          } else {
            throw new Error('Failed to fetch teachers');
          }
          return;
        }
        const data = await res.json();
        // Transform API data to match expected format
        const transformedTeachers = data.map((teacher: any) => ({
          id: teacher.id,
          firstName: teacher.firstName || teacher.user?.firstName || '',
          lastName: teacher.lastName || teacher.user?.lastName || '',
          email: teacher.email || teacher.user?.email || '',
          phone: teacher.phone || '',
          address: teacher.address || '',
          subjects: teacher.subjects ? teacher.subjects.split(',').map((s: string) => s.trim()) : [],
          employmentType: teacher.employmentType || 'FULL_TIME',
          status: teacher.status || 'ACTIVE',
          joinedDate: teacher.createdAt || new Date().toISOString(),
          profilePhotoUrl: teacher.profilePhotoUrl || teacher.user?.profilePhotoUrl || '',
          teacherId: teacher.teacherId || `TCH-${String(teacher.id).slice(0, 4).toUpperCase()}`,
        }));
        setTeachers(transformedTeachers);
      } catch (error) {
        console.error('Error fetching teachers:', error);
        toast.error('Failed to load teachers');
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.teacherId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.subjects?.some((s: string) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || teacher.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Teacher Management</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage faculty staff, assignments, and profiles.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/teachers/new" />} nativeButton={false}>
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name, ID, email, or subject..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-slate-400 hidden md:block" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-slate-500">Loading teachers...</span>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-slate-200 mb-3" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">No teachers found</p>
          <p className="text-sm text-slate-500">{searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first teacher to get started.'}</p>
        </div>
      ) : (
        <>
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 dark:bg-surface-raised/50 border-b border-slate-100 dark:border-surface-raised">
            <tr className="text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <th className="px-6 py-4">Teacher</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4">Subjects</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredTeachers.map(teacher => (
              <tr key={teacher.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <img src={teacher.profilePhotoUrl} alt={teacher.firstName} className="h-10 w-10 rounded-full border border-slate-200 dark:border-surface-raised" />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{teacher.firstName} {teacher.lastName}</div>
                      <div className="text-xs text-slate-500 font-mono">{teacher.teacherId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {teacher.email}</div>
                    <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {teacher.phone}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {teacher.subjects.map(s => (
                      <Badge key={s} variant="outline" className="text-[10px] py-0">{s}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge variant={teacher.status === 'ACTIVE' ? 'default' : 'secondary'} 
                    className={teacher.status === 'ACTIVE' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-500 hover:bg-slate-600'}
                  >
                    {teacher.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {teacher.employmentType.replace('_', ' ')}
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />} nativeButton={true}>
                      <MoreVertical className="h-4 w-4 text-slate-400" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuGroup>
                        <DropdownMenuItem render={<Link to={`/teachers/${teacher.id}`} className="flex w-full" />} nativeButton={false}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem render={<Link to={`/teachers/${teacher.id}/edit`} className="flex w-full" />} nativeButton={false}>Edit Details</DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">Archive Teacher</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTeachers.length === 0 && (
          <div className="py-20 text-center text-slate-500">
            <Users className="h-12 w-12 mx-auto text-slate-200 mb-3" />
            <p className="text-lg font-medium">No teachers found</p>
            <p className="text-sm">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>

      {/* Mobile Grid View */}
      <div className="grid lg:hidden grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTeachers.map(teacher => (
          <Link key={teacher.id} to={`/teachers/${teacher.id}`} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-5 shadow-sm hover:border-aubergine-500 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src={teacher.profilePhotoUrl} alt={teacher.firstName} className="h-12 w-12 rounded-full border" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white leading-tight">{teacher.firstName} {teacher.lastName}</h3>
                  <span className="text-xs text-slate-500 font-mono">{teacher.teacherId}</span>
                </div>
              </div>
              <Badge variant={teacher.status === 'ACTIVE' ? 'default' : 'secondary'}
                className={teacher.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-500'}
              >
                {teacher.status}
              </Badge>
            </div>

            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-slate-400" /> {teacher.email}</div>
              <div className="flex items-center gap-2"><GraduationCap className="h-3 w-3 text-slate-400" /> {teacher.subjects.join(', ')}</div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-surface-raised flex justify-between items-center text-xs">
              <span className="font-medium text-slate-500 uppercase">{teacher.employmentType.replace('_', ' ')}</span>
              <span className="text-slate-400">Joined {new Date(teacher.joinedDate).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>
        </>
      )}
    </div>
  );
}
