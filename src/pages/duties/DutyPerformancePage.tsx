import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LeaderboardEntry {
  student: { id: string; studentCode: string; preferredName?: string; user?: { firstName: string; lastName: string } };
  totalAssigned: number;
  totalCompleted: number;
  completionRate: number;
  totalPoints: number;
  averageRating: number | null;
}

function studentLabel(student: LeaderboardEntry['student']) {
  if (student.preferredName) return student.preferredName;
  if (student.user) return `${student.user.firstName} ${student.user.lastName}`;
  return student.studentCode;
}

export default function DutyPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLeaderboard = () => {
    setLoading(true);
    const token = sessionStorage.getItem('auth_token');
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    fetch(`/api/duty-performance/leaderboard?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []))
      .catch(() => setLeaderboard([]))
      .finally(() => setLoading(false));
  };

  useEffect(fetchLeaderboard, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link to="/duties" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="h-5 w-5" /> Duty Performance
          </h1>
          <p className="text-sm text-slate-500">Top performers by points and completion rate (last 90 days by default)</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-2 flex-1">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2 flex-1">
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button onClick={fetchLeaderboard}>Apply</Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Completion Rate</TableHead>
                <TableHead>Avg Rating</TableHead>
                <TableHead>Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">Loading...</TableCell>
                </TableRow>
              ) : leaderboard.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">No duty activity in this period.</TableCell>
                </TableRow>
              ) : (
                leaderboard.map((entry, index) => (
                  <TableRow key={entry.student.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{studentLabel(entry.student)}</TableCell>
                    <TableCell>{entry.totalAssigned}</TableCell>
                    <TableCell>{entry.totalCompleted}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{Math.round(entry.completionRate)}%</Badge>
                    </TableCell>
                    <TableCell>{entry.averageRating !== null ? entry.averageRating.toFixed(1) : '—'}</TableCell>
                    <TableCell className="font-semibold">{entry.totalPoints}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
