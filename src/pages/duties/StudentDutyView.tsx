import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, ClipboardList, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '../../lib/permissions';
import { toast } from 'sonner';

interface Assignment {
  id: string;
  scheduledDate: string;
  status: string;
  rating?: number | null;
  pointsEarned?: number | null;
  dutyDefinition: { name: string; type: string; durationMinutes?: number };
  roster: { name: string };
}

interface Statistics {
  totalAssigned: number;
  totalCompleted: number;
  totalSkippedOrFailed: number;
  completionRate: number;
  averageRating: number | null;
  totalPoints: number;
}

export default function StudentDutyView() {
  const { user } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const token = () => sessionStorage.getItem('auth_token');

  const fetchAll = () => {
    if (!user?.studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const headers = { Authorization: `Bearer ${token()}` };
    Promise.all([
      fetch('/api/duty-assignments', { headers }).then((r) => r.json()),
      fetch(`/api/duty-performance/${user.studentId}`, { headers }).then((r) => r.json()),
    ])
      .then(([assignmentData, perf]) => {
        setAssignments(Array.isArray(assignmentData) ? assignmentData : []);
        setStatistics(perf?.statistics || null);
      })
      .catch(() => {
        toast.error('Failed to load your duties');
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchAll, [user?.studentId]);

  const handleUpdateStatus = async (assignmentId: string, status: string) => {
    setUpdatingId(assignmentId);
    try {
      const response = await fetch(`/api/duty-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update duty');
      }
      toast.success(status === 'COMPLETED' ? 'Marked as completed!' : 'Duty updated');
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update duty');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'SKIPPED':
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'EXCUSED':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  const upcoming = assignments.filter((a) => a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS');
  const history = assignments.filter((a) => a.status !== 'ASSIGNED' && a.status !== 'IN_PROGRESS');

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">My Duties</h1>
        <p className="text-sm text-slate-500">Your assigned chores and duty history</p>
      </div>

      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(statistics.completionRate)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{statistics.totalCompleted}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">Avg Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.averageRating !== null ? statistics.averageRating.toFixed(1) : '—'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalPoints}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Upcoming
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No upcoming duties.</p>
          ) : (
            upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-medium text-sm">{a.dutyDefinition.name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.scheduledDate).toLocaleDateString()} · {a.roster.name}
                    {a.dutyDefinition.durationMinutes ? ` · ~${a.dutyDefinition.durationMinutes} min` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  {a.status === 'ASSIGNED' && (
                    <Button size="sm" variant="outline" disabled={updatingId === a.id} onClick={() => handleUpdateStatus(a.id, 'IN_PROGRESS')}>
                      Start
                    </Button>
                  )}
                  {a.status === 'IN_PROGRESS' && (
                    <Button size="sm" disabled={updatingId === a.id} onClick={() => handleUpdateStatus(a.id, 'COMPLETED')}>
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Mark Done
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No duty history yet.</p>
          ) : (
            history.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-medium text-sm">{a.dutyDefinition.name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.scheduledDate).toLocaleDateString()} · {a.roster.name}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.rating && <span className="text-amber-500 text-sm">{'★'.repeat(a.rating)}</span>}
                  <Badge className={getStatusColor(a.status)}>{a.status.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
