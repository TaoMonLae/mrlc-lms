import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Search, Filter, Edit, Trash2, Users, Calendar, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePermissions } from '../../lib/permissions';
import { useSettings } from '../../providers/SettingsProvider';
import { formatMoney } from '../../lib/locale';
import { toast } from 'sonner';

export default function FeeStructuresDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [structures, setStructures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/fee-structures', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setStructures(data || []);
      })
      .catch(() => {
        toast.error('Failed to load fee structures');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    const token = sessionStorage.getItem('auth_token');
    try {
      const response = await fetch(`/api/fee-structures/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete fee structure');
      }

      toast.success('Fee structure deleted successfully');
      setStructures(structures.filter(s => s.id !== id));
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete fee structure');
    }
  };

  const filteredStructures = structures.filter(structure => {
    const matchesSearch = structure.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (structure.description && structure.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || structure.status === statusFilter;
    const matchesYear = yearFilter === 'ALL' || structure.academicYear.toString() === yearFilter;
    return matchesSearch && matchesStatus && matchesYear;
  });

  const stats = {
    total: structures.length,
    active: structures.filter(s => s.status === 'ACTIVE').length,
    thisYear: structures.filter(s => s.academicYear === new Date().getFullYear()).length,
    totalAssignments: structures.reduce((sum, s) => sum + (s._count?.assignments || 0), 0),
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 border-green-200';
      case 'DRAFT': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'ARCHIVED': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fee Structures</h1>
          <p className="text-sm text-slate-500">Manage fee types and academic year structures</p>
        </div>
        {hasPermission('manage_fee_structures') && (
          <Button render={<Link to="/fee-structures/new" />} nativeButton={false}>
              <Plus className="h-4 w-4 mr-2" />
              New Structure
            </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Structures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisYear}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssignments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search structures..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Years</SelectItem>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Structures Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filteredStructures.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No fee structures found. Create one to get started.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Academic Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assignments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Effective Period</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredStructures.map(structure => (
                    <tr key={structure.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{structure.name}</div>
                          {structure.description && (
                            <div className="text-sm text-slate-500">{structure.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {structure.academicYear}
                        {structure.term && ` - ${structure.term}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(structure.status)} variant="outline">
                          {structure.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {structure._count?.assignments || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(structure.effectiveFromDate).toLocaleDateString()}
                          {structure.effectiveToDate && ` - ${new Date(structure.effectiveToDate).toLocaleDateString()}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" render={<Link to={`/fee-structures/${structure.id}`} />} nativeButton={false}>View</Button>
                          {hasPermission('manage_fee_structures') && structure.status !== 'ACTIVE' && (
                            <Button variant="ghost" size="sm" render={<Link to={`/fee-structures/${structure.id}/edit`} />} nativeButton={false}>
                                <Edit className="h-4 w-4" />
                              </Button>
                          )}
                          {hasPermission('manage_fee_structures') && structure.status === 'DRAFT' && (
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(structure.id, structure.name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
