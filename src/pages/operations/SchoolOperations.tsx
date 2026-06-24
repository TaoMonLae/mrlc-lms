import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Award,
  CalendarDays,
  ClipboardList,
  Loader2,
  MessageSquareText,
  Package,
  Plus,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';

type ModuleKey = 'admissions' | 'calendarEvents' | 'assignments' | 'certificates' | 'communications' | 'inventory';

type Field =
  | { name: string; label: string; type?: 'text' | 'date' | 'number'; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: 'textarea'; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: 'select'; required?: boolean; options: string[] };

interface OperationModule {
  key: ModuleKey;
  endpoint: string;
  title: string;
  description: string;
  icon: React.ElementType;
  fields: Field[];
  titleField: string;
  metaFields: string[];
}

interface OperationsOverview {
  admissions: any[];
  calendarEvents: any[];
  assignments: any[];
  certificates: any[];
  communications: any[];
  inventory: any[];
  counts: Record<string, number>;
}

const modules: OperationModule[] = [
  {
    key: 'admissions',
    endpoint: '/api/operations/admissions',
    title: 'Admissions',
    description: 'Track new student applications and enrollment follow-up.',
    icon: UserPlus,
    titleField: 'applicantName',
    metaFields: ['status', 'targetLevel', 'country'],
    fields: [
      { name: 'applicantName', label: 'Applicant full name', required: true, placeholder: 'Student name' },
      { name: 'guardianName', label: 'Guardian name', placeholder: 'Parent or guardian' },
      { name: 'contactNumber', label: 'Contact number', placeholder: '+60...' },
      { name: 'country', label: 'Country', placeholder: 'Myanmar, Thailand...' },
      { name: 'targetLevel', label: 'Target grade / level', placeholder: 'GED, Pre-GED...' },
      { name: 'status', label: 'Status', type: 'select', options: ['NEW', 'REVIEWING', 'ACCEPTED', 'WAITLISTED', 'REJECTED'] },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Interview notes, document checklist, placement notes...' },
    ],
  },
  {
    key: 'calendarEvents',
    endpoint: '/api/operations/calendar-events',
    title: 'Academic Calendar',
    description: 'Plan holidays, exam windows, activities, and staff meetings.',
    icon: CalendarDays,
    titleField: 'title',
    metaFields: ['eventType', 'startDate', 'audience'],
    fields: [
      { name: 'title', label: 'Event title', required: true, placeholder: 'GED mock exam week' },
      { name: 'eventType', label: 'Type', type: 'select', options: ['SCHOOL', 'HOLIDAY', 'EXAM', 'MEETING', 'ACTIVITY'] },
      { name: 'startDate', label: 'Start date', type: 'date', required: true },
      { name: 'endDate', label: 'End date', type: 'date' },
      { name: 'audience', label: 'Audience', type: 'select', options: ['ALL', 'STUDENTS', 'TEACHERS', 'STAFF'] },
      { name: 'location', label: 'Location', placeholder: 'Room, hall, online...' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'assignments',
    endpoint: '/api/operations/assignments',
    title: 'Assignments',
    description: 'Post homework, projects, and class tasks with due dates.',
    icon: ClipboardList,
    titleField: 'title',
    metaFields: ['status', 'dueDate', 'classId'],
    fields: [
      { name: 'title', label: 'Assignment title', required: true, placeholder: 'Math practice set 4' },
      { name: 'description', label: 'Instructions', type: 'textarea', placeholder: 'What students need to submit...' },
      { name: 'classId', label: 'Class ID', placeholder: 'Optional class id' },
      { name: 'subjectId', label: 'Subject ID', placeholder: 'Optional subject id' },
      { name: 'dueDate', label: 'Due date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['OPEN', 'CLOSED', 'ARCHIVED'] },
    ],
  },
  {
    key: 'certificates',
    endpoint: '/api/operations/certificates',
    title: 'Certificates',
    description: 'Keep certificate, completion letter, and transcript issue records.',
    icon: Award,
    titleField: 'studentName',
    metaFields: ['certificateType', 'status', 'referenceNo'],
    fields: [
      { name: 'studentName', label: 'Student name', required: true, placeholder: 'Full name' },
      { name: 'studentId', label: 'Student ID', placeholder: 'Optional internal student id' },
      { name: 'certificateType', label: 'Certificate type', required: true, placeholder: 'Completion, attendance, transcript...' },
      { name: 'issueDate', label: 'Issue date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'ISSUED', 'REVOKED'] },
      { name: 'referenceNo', label: 'Reference number', placeholder: 'MRLC-CERT-2026-001' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'communications',
    endpoint: '/api/operations/communications',
    title: 'Communications',
    description: 'Record calls, meetings, home visits, and guardian follow-ups.',
    icon: MessageSquareText,
    titleField: 'title',
    metaFields: ['channel', 'status', 'contactName'],
    fields: [
      { name: 'title', label: 'Summary title', required: true, placeholder: 'Guardian follow-up call' },
      { name: 'channel', label: 'Channel', type: 'select', options: ['PHONE', 'SMS', 'EMAIL', 'MEETING', 'HOME_VISIT', 'OTHER'] },
      { name: 'audience', label: 'Audience', type: 'select', options: ['GUARDIAN', 'STUDENT', 'TEACHER', 'STAFF', 'COMMUNITY'] },
      { name: 'contactName', label: 'Contact name', placeholder: 'Who was contacted' },
      { name: 'contactInfo', label: 'Contact info', placeholder: 'Phone, email, address...' },
      { name: 'message', label: 'Message / notes', type: 'textarea', required: true },
      { name: 'followUpDate', label: 'Follow-up date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['LOGGED', 'NEEDS_FOLLOW_UP', 'RESOLVED'] },
    ],
  },
  {
    key: 'inventory',
    endpoint: '/api/operations/inventory',
    title: 'Inventory',
    description: 'Manage school assets, classroom supplies, and assigned equipment.',
    icon: Package,
    titleField: 'name',
    metaFields: ['category', 'quantity', 'condition'],
    fields: [
      { name: 'name', label: 'Item name', required: true, placeholder: 'Laptop, projector, desk...' },
      { name: 'category', label: 'Category', placeholder: 'IT, classroom, office...' },
      { name: 'quantity', label: 'Quantity', type: 'number' },
      { name: 'condition', label: 'Condition', type: 'select', options: ['NEW', 'GOOD', 'NEEDS_REPAIR', 'LOST', 'RETIRED'] },
      { name: 'location', label: 'Location', placeholder: 'Room 1, office, library...' },
      { name: 'assignedTo', label: 'Assigned to', placeholder: 'Teacher, class, department...' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

function formatValue(value: unknown) {
  if (!value) return 'Not set';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}

export default function SchoolOperations() {
  const [activeKey, setActiveKey] = useState<ModuleKey>('admissions');
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const activeModule = useMemo(() => modules.find((m) => m.key === activeKey) ?? modules[0], [activeKey]);
  const records = overview?.[activeModule.key] ?? [];

  const loadOverview = async () => {
    setLoading(true);
    try {
      setOverview(await apiGet<OperationsOverview>('/api/operations/overview'));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load school operations');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const updateField = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiSend(activeModule.endpoint, 'POST', formValues);
      toast.success(`${activeModule.title} record saved`);
      setFormValues({});
      await loadOverview();
    } catch (error: any) {
      toast.error(error.message || 'Unable to save record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">School Operations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Admissions, calendar planning, assignments, certificates, communications, and inventory.
          </p>
        </div>
        <Button onClick={loadOverview} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {modules.map((module) => {
          const Icon = module.icon;
          const active = module.key === activeKey;
          return (
            <button
              key={module.key}
              type="button"
              onClick={() => setActiveKey(module.key)}
              className={`rounded-lg border p-4 text-left transition ${
                active
                  ? 'border-aubergine-500 bg-aubergine-50 text-aubergine-900 shadow-sm dark:bg-aubergine-500/15 dark:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-white/10 dark:bg-surface-indigo dark:text-slate-200'
              }`}
            >
              <Icon className="mb-3 h-5 w-5" />
              <div className="text-sm font-semibold">{module.title}</div>
              <div className="mt-2 text-2xl font-bold">{loading ? '-' : overview?.counts?.[module.key] ?? 0}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-indigo">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Add {activeModule.title} Record</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{activeModule.description}</p>
          </div>

          <div className="space-y-4">
            {activeModule.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>{field.label}{field.required ? ' *' : ''}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    value={formValues[field.name] ?? ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={3}
                  />
                ) : field.type === 'select' ? (
                  <select
                    id={field.name}
                    value={formValues[field.name] ?? ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    required={field.required}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-aubergine-500 focus:ring-1 focus:ring-aubergine-500 dark:border-white/10 dark:bg-surface-raised dark:text-white"
                  >
                    <option value="">Use default</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type ?? 'text'}
                    value={formValues[field.name] ?? ''}
                    onChange={(event) => updateField(field.name, event.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </div>

          <Button type="submit" className="mt-5 w-full" disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Save Record
          </Button>
        </form>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-surface-indigo">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{activeModule.title}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Latest saved records from the production database.</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
          </div>

          {!loading && records.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-white/10">
              <p className="text-sm font-medium text-slate-900 dark:text-white">No records yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Create the first {activeModule.title.toLowerCase()} record from the form.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {records.map((record) => (
                <article key={record.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{formatValue(record[activeModule.titleField])}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeModule.metaFields.map((field) => (
                          <span key={field} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-200">
                            {field}: {formatValue(record[field])}
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{formatValue(record.updatedAt || record.createdAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
