import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface DutyDefinition {
  id: string;
  name: string;
  code: string;
  type: string;
  description?: string;
  durationMinutes?: number;
  requiredStudents: number;
  pointsAwarded: number;
  isActive: boolean;
  _count?: { assignments: number };
}

const DUTY_TYPES = [
  'COOKING',
  'RESOURCE_BUYING',
  'CLEANING',
  'DISH_WASHING',
  'GARDENING',
  'MAINTENANCE',
  'SECURITY',
  'EVENT_SETUP',
  'OTHER',
];

const emptyForm = {
  name: '',
  type: 'CLEANING',
  description: '',
  durationMinutes: '',
  requiredStudents: '1',
  pointsAwarded: '1',
};

export default function DutyDefinitionsPage() {
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('manage_duties');
  const [loading, setLoading] = useState(true);
  const [definitions, setDefinitions] = useState<DutyDefinition[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const token = () => sessionStorage.getItem('auth_token');

  const fetchDefinitions = () => {
    setLoading(true);
    fetch('/api/duty-definitions', { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((data) => setDefinitions(Array.isArray(data) ? data : []))
      .catch(() => setDefinitions([]))
      .finally(() => setLoading(false));
  };

  useEffect(fetchDefinitions, []);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (def: DutyDefinition) => {
    setEditingId(def.id);
    setFormData({
      name: def.name,
      type: def.type,
      description: def.description || '',
      durationMinutes: def.durationMinutes?.toString() || '',
      requiredStudents: def.requiredStudents.toString(),
      pointsAwarded: def.pointsAwarded.toString(),
    });
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter a duty name');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        durationMinutes: formData.durationMinutes ? Number(formData.durationMinutes) : undefined,
        requiredStudents: Number(formData.requiredStudents) || 1,
        pointsAwarded: Number(formData.pointsAwarded) || 0,
      };
      const url = editingId ? `/api/duty-definitions/${editingId}` : '/api/duty-definitions';
      const method = editingId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save duty type');
      }
      toast.success(editingId ? 'Duty type updated' : 'Duty type created');
      setFormOpen(false);
      fetchDefinitions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save duty type');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this duty type? If it has assignment history it will be deactivated instead of deleted.')) return;
    try {
      const response = await fetch(`/api/duty-definitions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (!response.ok) throw new Error('Failed to remove duty type');
      toast.success('Duty type removed');
      fetchDefinitions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove duty type');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link to="/duties" />} nativeButton={false}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Duty Types</h1>
          <p className="text-sm text-slate-500">Configure the chores students can be assigned</p>
        </div>
        {canManage && !formOpen && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Duty Type
          </Button>
        )}
      </div>

      {formOpen && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{editingId ? 'Edit Duty Type' : 'New Duty Type'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Kitchen Cleanup"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {DUTY_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="requiredStudents">Students Required</Label>
                  <Input
                    id="requiredStudents"
                    type="number"
                    min="1"
                    value={formData.requiredStudents}
                    onChange={(e) => setFormData({ ...formData, requiredStudents: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Duration (minutes)</Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    min="0"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointsAwarded">Points Awarded</Label>
                  <Input
                    id="pointsAwarded"
                    type="number"
                    min="0"
                    value={formData.pointsAwarded}
                    onChange={(e) => setFormData({ ...formData, pointsAwarded: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving...' : editingId ? 'Save Changes' : 'Create Duty Type'}
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
          ) : definitions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No duty types yet.</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {definitions.map((def) => (
                <div key={def.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{def.name}</span>
                      <Badge variant="outline" className="text-xs">{def.code}</Badge>
                      {!def.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {def.type.replace('_', ' ')} · {def.requiredStudents} student{def.requiredStudents !== 1 ? 's' : ''}
                      {def.durationMinutes ? ` · ${def.durationMinutes} min` : ''} · {def.pointsAwarded} pt{def.pointsAwarded !== 1 ? 's' : ''}
                      {def._count ? ` · ${def._count.assignments} assignments` : ''}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(def)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(def.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
