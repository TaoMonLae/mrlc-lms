import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { DollarSign, Calendar, User, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '../../lib/permissions';
import { formatMoney } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';
import { toast } from 'sonner';

export default function FeeAssignmentsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { systemSettings } = useSettings();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const currency = systemSettings.currency || 'MYR';

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    fetch('/api/fee-assignments', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setAssignments(data || []);
      })
      .catch(() => {
        toast.error('Failed to load assignments');
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePayment = async (assignmentId: string) => {
    const token = sessionStorage.getItem('auth_token');
    try {
      const response = await fetch(`/api/fee-assignments/${assignmentId}/pay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethod: 'OTHER' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record payment');
      }

      toast.success('Payment recorded successfully');
      setAssignments(assignments.map(a => a.id === assignmentId ? { ...a, status: 'PAID' } : a));
    } catch (error: any) {
      toast.error(error.message || 'Failed to record payment');
    }
  };

  const filteredAssignments = assignments.filter(a => filter === 'ALL' || a.status === filter);

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'PENDING').length,
    paid: assignments.filter(a => a.status === 'PAID').length,
    outstanding: assignments.reduce((sum, a) => sum + (a.status !== 'PAID' ? a.outstandingAmount : 0), 0),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Fee Assignments</h1>
          <p className="text-sm text-slate-500">View and manage student fee assignments</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.outstanding, currency)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button variant={filter === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('ALL')}>All</Button>
            <Button variant={filter === 'PENDING' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('PENDING')}>Pending</Button>
            <Button variant={filter === 'PAID' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('PAID')}>Paid</Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center items-center h-64">Loading...</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filteredAssignments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No assignments found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Fee Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredAssignments.map(assignment => (
                    <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {assignment.student?.preferredName || assignment.student?.user?.name || 'Student'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{assignment.feeItem?.name}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold">{formatMoney(assignment.outstandingAmount, currency)}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {new Date(assignment.dueDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={
                          assignment.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        } variant="outline">
                          {assignment.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {hasPermission('manage_fee_structures') && assignment.status === 'PENDING' && (
                          <Button variant="outline" size="sm" onClick={() => handlePayment(assignment.id)}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Record Payment
                          </Button>
                        )}
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
