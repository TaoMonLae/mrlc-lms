import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function FeeStructureNew() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    academicYear: new Date().getFullYear(),
    term: '',
    currency: 'MYR',
    effectiveFromDate: new Date().toISOString().split('T')[0],
    effectiveToDate: '',
    applyToClasses: false,
    applyToBoarders: false,
    applyToDayStudents: false,
    notes: '',
    tags: '',
    status: 'DRAFT',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.academicYear || !formData.effectiveFromDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const response = await fetch('/api/fee-structures', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags ? formData.tags.split(',').map((t: string) => t.trim()) : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create fee structure');
      }

      const data = await response.json();
      toast.success('Fee structure created successfully');
      navigate(`/fee-structures/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create fee structure');
    } finally {
      setSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link to="/fee-structures" />} nativeButton={false}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">New Fee Structure</h1>
          <p className="text-sm text-slate-500">Create a new fee structure for your school</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Structure Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 2024-2025 Annual Fees"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Select value={formData.academicYear.toString()} onValueChange={(value) => setFormData({ ...formData, academicYear: Number(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="term">Term (Optional)</Label>
                <Input
                  id="term"
                  value={formData.term}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  placeholder="e.g., Term 1, Semester 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    <SelectItem value="THB">THB - Thai Baht</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this fee structure..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Switch
                id="applyToClasses"
                checked={formData.applyToClasses}
                onCheckedChange={(checked) => setFormData({ ...formData, applyToClasses: checked })}
              />
              <Label htmlFor="applyToClasses" className="cursor-pointer">Apply to specific classes only</Label>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                id="applyToBoarders"
                checked={formData.applyToBoarders}
                onCheckedChange={(checked) => setFormData({ ...formData, applyToBoarders: checked })}
              />
              <Label htmlFor="applyToBoarders" className="cursor-pointer">Apply to boarding students only</Label>
            </div>
            <div className="flex items-center gap-4">
              <Switch
                id="applyToDayStudents"
                checked={formData.applyToDayStudents}
                onCheckedChange={(checked) => setFormData({ ...formData, applyToDayStudents: checked })}
              />
              <Label htmlFor="applyToDayStudents" className="cursor-pointer">Apply to day students only</Label>
            </div>
          </CardContent>
        </Card>

        {/* Effective Period */}
        <Card>
          <CardHeader>
            <CardTitle>Effective Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="effectiveFromDate">Effective From *</Label>
                <Input
                  id="effectiveFromDate"
                  type="date"
                  value={formData.effectiveFromDate}
                  onChange={(e) => setFormData({ ...formData, effectiveFromDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="effectiveToDate">Effective To (Optional)</Label>
                <Input
                  id="effectiveToDate"
                  type="date"
                  value={formData.effectiveToDate}
                  onChange={(e) => setFormData({ ...formData, effectiveToDate: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Comma-separated tags"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or internal comments"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" render={<Link to="/fee-structures" />} nativeButton={false}>Cancel</Button>
          <Button type="submit" disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />
            {submitting ? 'Creating...' : 'Create Structure'}
          </Button>
        </div>
      </form>
    </div>
  );
}
