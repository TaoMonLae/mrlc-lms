import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Shield, ShieldAlert, ArrowUpRight, CheckCircle2, Clock, AlertTriangle, Filter, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePermissions } from '../../lib/permissions';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export interface Case {
  id: string;
  caseNumber: string;
  studentId: string;
  studentName: string;
  type: 'ATTENDANCE' | 'ACADEMIC' | 'HEALTH' | 'FAMILY' | 'PROTECTION' | 'BEHAVIOR' | 'DOCUMENTATION' | 'OTHER';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'FOLLOW_UP' | 'RESOLVED' | 'CLOSED';
  title: string;
  assignedToName?: string;
  openedAt: string;
}

export default function CasesDashboard() {
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const token = sessionStorage.getItem('auth_token');
        const res = await fetch('/api/cases', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            toast.error('You do not have permission to view cases');
          } else {
            throw new Error('Failed to fetch cases');
          }
          return;
        }
        const data = await res.json();
        // Transform API data to match Case interface
        const transformedCases = data.map((c: any) => ({
          id: c.id,
          caseNumber: c.caseNumber || `CAS-${new Date().getFullYear()}-${String(c.id).slice(0, 4).toUpperCase()}`,
          studentId: c.student?.id || '',
          studentName: c.student ? `${c.student.user?.firstName} ${c.student.user?.lastName}` : 'Unknown',
          type: c.type,
          priority: c.priority,
          status: c.status,
          title: c.title || c.description || 'Untitled Case',
          assignedToName: c.assignedTo ? `${c.assignedTo.firstName} ${c.assignedTo.lastName}` : undefined,
          openedAt: c.createdAt || new Date().toISOString(),
        }));
        setCases(transformedCases);
      } catch (error) {
        console.error('Error fetching cases:', error);
        toast.error('Failed to load cases');
      } finally {
        setLoading(false);
      }
    };
    fetchCases();
  }, []);

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    setIsDeleting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const res = await fetch(`/api/cases/${caseToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete case');
      }
      setCases(prev => prev.filter(c => c.id !== caseToDelete.id));
      toast.success('Case deleted.');
      setCaseToDelete(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete case');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || c.priority === priorityFilter;
    const matchesType = typeFilter === 'ALL' || c.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <Badge variant="destructive" className="py-0 uppercase text-[10px]">Urgent</Badge>;
      case 'HIGH': return <Badge className="bg-aubergine-100 text-aubergine-800 hover:bg-aubergine-100 dark:bg-aubergine-900/30 dark:text-aubergine-400 border-0 py-0 uppercase text-[10px]">High</Badge>;
      case 'MEDIUM': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-0 py-0 uppercase text-[10px]">Medium</Badge>;
      case 'LOW': return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 dark:bg-surface-raised dark:text-slate-300 border-0 py-0 uppercase text-[10px]">Low</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-0"><AlertTriangle className="w-3 h-3 mr-1"/> Open</Badge>;
      case 'FOLLOW_UP': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-0"><Clock className="w-3 h-3 mr-1"/> Follow Up</Badge>;
      case 'RESOLVED': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-0"><CheckCircle2 className="w-3 h-3 mr-1"/> Resolved</Badge>;
      case 'CLOSED': return <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-surface-raised">Closed</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Case Management</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Track student support and protection cases.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {hasPermission('manage_cases') && (
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" render={<Link to="/cases/new" />} nativeButton={false}>
              <Plus className="mr-2 h-4 w-4" /> Open New Case
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo rounded-xl border border-slate-200 dark:border-surface-raised shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-surface-raised flex flex-col xl:flex-row gap-4 items-center bg-slate-50/50 dark:bg-surface-raised/50">
          <div className="relative flex-1 w-full xl:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by student, case number, or title..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap w-full xl:w-auto gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] xl:w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="ATTENDANCE">Attendance</SelectItem>
                <SelectItem value="ACADEMIC">Academic</SelectItem>
                <SelectItem value="HEALTH">Health</SelectItem>
                <SelectItem value="FAMILY">Family</SelectItem>
                <SelectItem value="PROTECTION">Protection</SelectItem>
                <SelectItem value="BEHAVIOR">Behavior</SelectItem>
                <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] xl:w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] xl:w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-slate-500">Loading cases...</span>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Shield className="h-12 w-12 mx-auto text-slate-200 mb-3" />
            <p className="text-lg font-medium">No cases found</p>
            <p className="text-sm">{searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || typeFilter !== 'ALL' ? 'Try adjusting your filters.' : 'Open your first case to get started.'}</p>
          </div>
        ) : (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-surface-raised uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Case Info</th>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Status & Priority</th>
                <th className="px-6 py-4 font-medium">Assigned To</th>
                <th className="px-6 py-4 font-medium">Opened</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-surface-raised/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white max-w-[200px] truncate" title={c.title}>
                      {c.type === 'PROTECTION' && <ShieldAlert className="inline-block w-4 h-4 mr-1 text-red-500" />}
                      {!['PROTECTION'].includes(c.type) && <Shield className="inline-block w-4 h-4 mr-1 text-slate-400" />}
                      {c.title}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                       <span className="font-mono">{c.caseNumber}</span>
                       <span className="text-[10px] uppercase tracking-wider">{c.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <Link to={`/students/${c.studentId}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {c.studentName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start gap-1">
                      {getStatusBadge(c.status)}
                      {getPriorityBadge(c.priority)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                    {c.assignedToName || <span className="text-slate-400 italic">Unassigned</span>}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-300 whitespace-nowrap">
                    {formatDistanceToNow(new Date(c.openedAt))} ago
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" render={<Link to={`/cases/${c.id}`} />} nativeButton={false}>
                         View <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Button>
                      {hasPermission('manage_cases') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          aria-label={`Delete case ${c.caseNumber}`}
                          onClick={() => setCaseToDelete(c)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No cases found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Mobile View */}
        {!loading && filteredCases.length > 0 && (
        <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
          {filteredCases.map(c => (
            <div key={c.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="font-medium text-slate-900 dark:text-white leading-tight">
                    {c.type === 'PROTECTION' && <ShieldAlert className="inline-block w-4 h-4 mr-1 text-red-500" />}
                    {!['PROTECTION'].includes(c.type) && <Shield className="inline-block w-4 h-4 mr-1 text-slate-400" />}
                    {c.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex gap-2 items-center">
                    <span className="font-mono">{c.caseNumber}</span>
                  </div>
                </div>
                {getStatusBadge(c.status)}
              </div>
              
              <div className="text-sm">
                <span className="text-slate-500">Student:</span>{' '}
                <Link to={`/students/${c.studentId}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  {c.studentName}
                </Link>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-surface-raised">
                <div className="flex flex-col gap-1">
                  {getPriorityBadge(c.priority)}
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(c.openedAt))} ago
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {hasPermission('manage_cases') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20"
                      aria-label={`Delete case ${c.caseNumber}`}
                      onClick={() => setCaseToDelete(c)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" render={<Link to={`/cases/${c.id}`} />} nativeButton={false}>
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      <Dialog open={caseToDelete !== null} onOpenChange={(open) => { if (!open) setCaseToDelete(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" /> Delete Case
            </DialogTitle>
            <DialogDescription className="pt-1">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white">{caseToDelete?.title}</strong> ({caseToDelete?.caseNumber})? This will also remove all case notes and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCaseToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCase} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete Case'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
