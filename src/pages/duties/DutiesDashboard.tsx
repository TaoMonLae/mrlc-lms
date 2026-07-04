import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Users, CalendarDays, Trophy, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '../../lib/permissions';

interface DutyAssignment {
  id: string;
  scheduledDate: string;
  status: string;
  dutyDefinition: { name: string; type: string };
  student: { studentCode: string; preferredName?: string; user?: { firstName: string; lastName: string } };
  roster: { name: string; status: string };
}

interface DutyRoster {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  _count?: { assignments: number };
}

function studentName(student: DutyAssignment['student']) {
  if (student.preferredName) return student.preferredName;
  if (student.user) return `${student.user.firstName} ${student.user.lastName}`;
  return student.studentCode;
}

export default function DutiesDashboard() {
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [rosters, setRosters] = useState<DutyRoster[]>([]);
  const [todayAssignments, setTodayAssignments] = useState<DutyAssignment[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem('auth_token');
    const headers = { Authorization: `Bearer ${token}` };
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    Promise.all([
      fetch('/api/duty-rosters', { headers }).then((r) => r.json()),
      fetch(
        `/api/duty-assignments?startDate=${todayStart.toISOString()}&endDate=${todayEnd.toISOString()}`,
        { headers }
      ).then((r) => r.json()),
    ])
      .then(([rosterData, assignmentData]) => {
        setRosters(Array.isArray(rosterData) ? rosterData : []);
        setTodayAssignments(Array.isArray(assignmentData) ? assignmentData : []);
      })
      .catch(() => {
        setRosters([]);
        setTodayAssignments([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeRosters = rosters.filter((r) => r.status === 'ACTIVE' || r.status === 'PUBLISHED');
  const draftRosters = rosters.filter((r) => r.status === 'DRAFT');
  const completedToday = todayAssignments.filter((a) => a.status === 'COMPLETED').length;
  const completionRateToday = todayAssignments.length > 0 ? Math.round((completedToday / todayAssignments.length) * 100) : 0;

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Student Duties</h1>
          <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">
            Manage chore rosters, assignments, and performance.
          </p>
        </div>
        {hasPermission('manage_duties') && (
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" render={<Link to="/duties/definitions" />} nativeButton={false}>
              Duty Types
            </Button>
            <Button render={<Link to="/duties/rosters" />} nativeButton={false}>
              Manage Rosters
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Rosters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : activeRosters.length}</div>
            <p className="text-xs text-slate-500 mt-1">{draftRosters.length} in draft</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Today's Duties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : todayAssignments.length}</div>
            <p className="text-xs text-slate-500 mt-1">scheduled for today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? '—' : completedToday}</div>
            <p className="text-xs text-slate-500 mt-1">{completionRateToday}% completion rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="link" className="p-0 h-auto text-sm" render={<Link to="/duties/performance" />} nativeButton={false}>
              View top performers <ArrowRight className="ml-1 h-3 w-3 inline" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : todayAssignments.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No duties scheduled for today.</div>
            ) : (
              <div className="space-y-2">
                {todayAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="font-medium text-sm">{a.dutyDefinition.name}</div>
                        <div className="text-xs text-slate-500">{studentName(a.student)}</div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Rosters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="text-center py-4 text-slate-500 text-sm">Loading...</div>
            ) : rosters.length === 0 ? (
              <div className="text-center py-4 text-slate-500 text-sm">
                No rosters yet.
                {hasPermission('manage_duties') && (
                  <div className="mt-2">
                    <Button size="sm" render={<Link to="/duties/rosters" />} nativeButton={false}>
                      Create one
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              rosters.slice(0, 6).map((r) => (
                <Link
                  key={r.id}
                  to={`/duties/rosters/${r.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-900 text-sm"
                >
                  <span className="font-medium">{r.name}</span>
                  <Badge variant="outline">{r.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {hasPermission('view_own_duties') && !hasPermission('manage_duties') && (
        <Card>
          <CardContent className="py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-slate-400" />
              <p className="text-sm text-slate-600 dark:text-slate-300">See your own duty assignments and history.</p>
            </div>
            <Button render={<Link to="/student/duties" />} nativeButton={false}>My Duties</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
