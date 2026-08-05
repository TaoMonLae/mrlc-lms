import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Plus, X, ArrowRight } from 'lucide-react';
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
import { usePermissions } from '../../lib/permissions';
import { toast } from 'sonner';

interface DutyRoster {
  id: string;
  name: string;
  periodType: string;
  startDate: string;
  endDate: string;
  status: string;
  maxWeeklyDuties: number;
  _count?: { assignments: number };
}

const emptyForm = {
  name: '',
  periodType: 'WEEKLY',
  startDate: '',
  endDate: '',
  maxWeeklyDuties: '5',
};

export default function DutyRostersPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_duties');
  const [loading, setLoading] = useState(true);
  const [rosters, setRosters] = useState<DutyRoster[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const token = () => sessionStorage.getItem('auth_token');

  const fetchRosters = () => {
    setLoading(true);
    fetch('/api/duty-rosters', { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((data) => setRosters(Array.isArray(data) ? data : []))
      .catch(() => setRosters([]))
      .finally(() => setLoading(false));
  };

  useEffect(fetchRosters, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in name and date range');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/duty-rosters', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          maxWeeklyDuties: Number(formData.maxWeeklyDuties) || 5,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create roster');
      }
      const roster = await response.json();
      toast.success('Roster created');
      navigate(`/duties/rosters/${roster.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create roster');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PUBLISHED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-slate-200 text-slate-800';
      case 'ARCHIVED':
        return 'bg-slate-100 text-slate-600';
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link to="/duties" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Duty Rosters</h1>
          <p className="text-sm text-slate-500">Weekly or monthly duty periods</p>
        </div>
        {canManage && !formOpen && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Roster
          </Button>
        )}
      </div>

      {formOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>New Roster</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Roster Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Week 45, November 2026"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodType">Period Type</Label>
                  <Select value={formData.periodType} onValueChange={(value) => setFormData({ ...formData, periodType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="TERMLY">Termly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxWeeklyDuties">Max Duties / Week / Student</Label>
                  <Input
                    id="maxWeeklyDuties"
                    type="number"
                    min="1"
                    value={formData.maxWeeklyDuties}
                    onChange={(e) => setFormData({ ...formData, maxWeeklyDuties: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Roster'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : rosters.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No rosters yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {rosters.map((r) => (
                <Link
                  key={r.id}
                  to={`/duties/rosters/${r.id}`}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {new Date(r.startDate).toLocaleDateString()} - {new Date(r.endDate).toLocaleDateString()}
                      {r._count ? ` · ${r._count.assignments} assignments` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
