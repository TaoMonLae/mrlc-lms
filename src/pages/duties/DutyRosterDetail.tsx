import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, Sparkles, Plus, Trash2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '../../lib/permissions';
import { toast } from 'sonner';

interface Student {
  id: string;
  studentCode: string;
  preferredName?: string;
  user?: { firstName: string; lastName: string };
}

interface DutyDefinition {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

interface Assignment {
  id: string;
  scheduledDate: string;
  status: string;
  rating?: number | null;
  pointsEarned?: number | null;
  dutyDefinition: DutyDefinition;
  student: Student;
}

interface Roster {
  id: string;
  name: string;
  periodType: string;
  startDate: string;
  endDate: string;
  status: string;
  maxWeeklyDuties: number;
  assignments: Assignment[];
}

function studentLabel(student: Student) {
  if (student.preferredName) return student.preferredName;
  if (student.user) return `${student.user.firstName} ${student.user.lastName}`;
  return student.studentCode;
}

const STATUS_OPTIONS = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'EXCUSED', 'FAILED'];

export default function DutyRosterDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_duties');

  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [definitions, setDefinitions] = useState<DutyDefinition[]>([]);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedDutyIds, setSelectedDutyIds] = useState<string[]>([]);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignResult, setAutoAssignResult] = useState<{ created: number; unfilled: any[] } | null>(null);

  const [manualForm, setManualForm] = useState({ dutyDefinitionId: '', studentId: '', scheduledDate: '' });
  const [addingManual, setAddingManual] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const token = () => sessionStorage.getItem('auth_token');

  const fetchAll = () => {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token()}` };
    Promise.all([
      fetch(`/api/duty-rosters/${id}`, { headers }).then((r) => r.json()),
      fetch('/api/students', { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch('/api/duty-definitions?isActive=true', { headers }).then((r) => r.json()),
    ])
      .then(([rosterData, studentData, definitionData]) => {
        setRoster(rosterData);
        setStudents(Array.isArray(studentData) ? studentData : []);
        setDefinitions(Array.isArray(definitionData) ? definitionData : []);
      })
      .catch(() => {
        toast.error('Failed to load roster');
      })
      .finally(() => setLoading(false));
  };

  useEffect(fetchAll, [id]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => (prev.includes(studentId) ? prev.filter((s) => s !== studentId) : [...prev, studentId]));
  };

  const toggleDuty = (dutyId: string) => {
    setSelectedDutyIds((prev) => (prev.includes(dutyId) ? prev.filter((d) => d !== dutyId) : [...prev, dutyId]));
  };

  const handleAutoAssign = async () => {
    if (selectedStudentIds.length === 0 || selectedDutyIds.length === 0) {
      toast.error('Select at least one student and one duty type');
      return;
    }
    setAutoAssigning(true);
    setAutoAssignResult(null);
    try {
      const response = await fetch(`/api/duty-rosters/${id}/auto-assign`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds, dutyDefinitionIds: selectedDutyIds }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Auto-assign failed');
      }
      const result = await response.json();
      setAutoAssignResult(result);
      toast.success(`Created ${result.created} assignments${result.unfilled.length > 0 ? ` (${result.unfilled.length} slots unfilled)` : ''}`);
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Auto-assign failed');
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.dutyDefinitionId || !manualForm.studentId || !manualForm.scheduledDate) {
      toast.error('Fill in duty, student, and date');
      return;
    }
    setAddingManual(true);
    try {
      const response = await fetch('/api/duty-assignments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterId: id, ...manualForm }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add assignment');
      }
      toast.success('Assignment added');
      setManualForm({ dutyDefinitionId: '', studentId: '', scheduledDate: '' });
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add assignment');
    } finally {
      setAddingManual(false);
    }
  };

  const handleStatusChange = async (assignmentId: string, status: string) => {
    try {
      const response = await fetch(`/api/duty-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleRate = async (assignmentId: string, rating: number) => {
    try {
      const response = await fetch(`/api/duty-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!response.ok) throw new Error('Failed to rate');
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to rate');
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Remove this assignment?')) return;
    try {
      const response = await fetch(`/api/duty-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!response.ok) throw new Error('Failed to remove assignment');
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove assignment');
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const response = await fetch(`/api/duty-rosters/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish roster');
      }
      toast.success('Roster published');
      fetchAll();
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish roster');
    } finally {
      setPublishing(false);
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

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!roster) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center">Roster not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isDraft = roster.status === 'DRAFT';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link to="/duties/rosters" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{roster.name}</h1>
            <Badge variant="outline">{roster.status}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {new Date(roster.startDate).toLocaleDateString()} - {new Date(roster.endDate).toLocaleDateString()} · max {roster.maxWeeklyDuties}/week/student
          </p>
        </div>
        {canManage && isDraft && roster.assignments.length > 0 && (
          <Button onClick={handlePublish} disabled={publishing}>
            <Send className="mr-2 h-4 w-4" /> {publishing ? 'Publishing...' : 'Publish Roster'}
          </Button>
        )}
      </div>

      {canManage && isDraft && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Auto-Assign
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Students ({selectedStudentIds.length} selected)</Label>
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                      />
                      {studentLabel(s)}
                    </label>
                  ))}
                  {students.length === 0 && <p className="text-xs text-slate-500 p-2">No students found</p>}
                </div>
              </div>
              <div>
                <Label>Duty Types ({selectedDutyIds.length} selected)</Label>
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                  {definitions.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedDutyIds.includes(d.id)}
                        onChange={() => toggleDuty(d.id)}
                      />
                      {d.name}
                    </label>
                  ))}
                  {definitions.length === 0 && (
                    <p className="text-xs text-slate-500 p-2">
                      No duty types yet. <Link to="/duties/definitions" className="underline">Create one</Link>.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Button onClick={handleAutoAssign} disabled={autoAssigning}>
              {autoAssigning ? 'Assigning...' : 'Run Auto-Assign'}
            </Button>
            {autoAssignResult && autoAssignResult.unfilled.length > 0 && (
              <div className="text-sm text-amber-600">
                {autoAssignResult.unfilled.length} slot(s) could not be filled fairly -- add them manually below.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {canManage && isDraft && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Assignment Manually
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualAdd} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="space-y-2">
                <Label>Duty Type</Label>
                <Select value={manualForm.dutyDefinitionId} onValueChange={(v) => setManualForm({ ...manualForm, dutyDefinitionId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {definitions.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Student</Label>
                <Select value={manualForm.studentId} onValueChange={(v) => setManualForm({ ...manualForm, studentId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{studentLabel(s)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={manualForm.scheduledDate}
                  onChange={(e) => setManualForm({ ...manualForm, scheduledDate: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={addingManual}>
                {addingManual ? 'Adding...' : 'Add'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Assignments ({roster.assignments.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Duty</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                {canManage && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{new Date(a.scheduledDate).toLocaleDateString()}</TableCell>
                  <TableCell>{a.dutyDefinition.name}</TableCell>
                  <TableCell>{studentLabel(a.student)}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select value={a.status} onValueChange={(v) => handleStatusChange(a.id, v)}>
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getStatusColor(a.status)}>{a.status.replace('_', ' ')}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {canManage && a.status === 'COMPLETED' ? (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => handleRate(a.id, n)}
                            className={`text-lg ${(a.rating || 0) >= n ? 'text-amber-500' : 'text-slate-300'}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    ) : a.rating ? (
                      <span>{'★'.repeat(a.rating)}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteAssignment(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {roster.assignments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="text-center py-8 text-slate-500">
                    No assignments yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
