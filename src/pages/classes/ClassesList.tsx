import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Calendar, BookOpen, MoreVertical, Archive, CheckCircle2 } from 'lucide-react';
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
import { toast } from 'sonner';

interface Class {
  id: string;
  name: string;
  level: string;
  academicYear: string;
  description: string;
  status?: string;
  students: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ClassesList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const userRole = 'ADMIN';

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/classes', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            toast.error('You do not have permission to view classes');
          } else {
            throw new Error('Failed to fetch classes');
          }
          return;
        }
        const data = await res.json();
        setClasses(data);
      } catch (error) {
        console.error('Error fetching classes:', error);
        toast.error('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, []);

  const setStatus = async (cls: Class, status: 'ACTIVE' | 'ARCHIVED') => {
    if (status === 'ARCHIVED' && !confirm(`Archive "${cls.name}"?`)) return;
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/classes/${cls.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to update class'); }
      setClasses((prev) => prev.map((c) => (c.id === cls.id ? { ...c, status } : c)));
      toast.success(status === 'ARCHIVED' ? 'Class archived' : 'Class restored');
    } catch (e: any) {
      toast.error(e.message || 'Failed to update class');
    }
  };

  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.academicYear.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Class Management</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage academic classes, assignments, and curriculum.</p>
        </div>
        {userRole === 'ADMIN' && (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/classes/new" />} nativeButton={false}>
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-surface-indigo p-4 rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search by name, level, or academic year..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map(cls => (
          <div key={cls.id} className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            <div className="p-5 flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
                    <Link to={`/classes/${cls.id}`} className="hover:text-aubergine-600 hover:underline">{cls.name}</Link>
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs text-slate-500 font-normal">{cls.level}</Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> {cls.academicYear}</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" />} nativeButton={true}>
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem render={<Link to={`/classes/${cls.id}`} className="flex w-full" />} nativeButton={false}>View Dashboard</DropdownMenuItem>
                      {userRole === 'ADMIN' && (
                        <DropdownMenuItem render={<Link to={`/classes/${cls.id}/edit`} className="flex w-full" />} nativeButton={false}>Edit Class</DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                    {userRole === 'ADMIN' && (
                      <React.Fragment>
                        <DropdownMenuSeparator />
                        {(cls.status || 'ACTIVE') === 'ACTIVE' ? (
                          <DropdownMenuItem className="text-amber-600 focus:text-amber-600 focus:bg-amber-50" onClick={() => setStatus(cls, 'ARCHIVED')}>
                            <Archive className="mr-2 h-4 w-4" /> Archive Class
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50" onClick={() => setStatus(cls, 'ACTIVE')}>
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Restore Class
                          </DropdownMenuItem>
                        )}
                      </React.Fragment>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-6 h-10">
                {cls.description || 'No description provided'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-surface-raised/50 p-3 rounded-lg border border-slate-100 dark:border-surface-raised">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Students</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{cls.students?.length || 0}</p>
                </div>
                <div className="bg-slate-50 dark:bg-surface-raised/50 p-3 rounded-lg border border-slate-100 dark:border-surface-raised">
                  <div className="flex items-center gap-2 text-slate-500 mb-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-xs font-medium uppercase">Status</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 dark:text-white capitalize">{(cls.status || 'ACTIVE').toLowerCase()}</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-surface-raised/30 p-4 border-t border-slate-100 dark:border-surface-raised flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={(cls.status || 'ACTIVE') === 'ACTIVE' ? 'default' : 'secondary'}
                  className={(cls.status || 'ACTIVE') === 'ACTIVE' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-500 hover:bg-slate-600'}
                >
                  {cls.status || 'ACTIVE'}
                </Badge>
              </div>
              <div className="text-xs text-slate-500">
                Created: {new Date(cls.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-slate-900 dark:text-white">Loading classes...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-surface-indigo rounded-xl border border-dashed border-slate-200 dark:border-surface-raised">
          <BookOpen className="h-12 w-12 mx-auto text-slate-200 mb-3" />
          <p className="text-lg font-medium text-slate-900 dark:text-white">No classes found</p>
          <p className="text-sm text-slate-500">{searchTerm ? 'Try adjusting your search term.' : 'Create your first class to get started.'}</p>
        </div>
      ) : null}
    </div>
  );
}
