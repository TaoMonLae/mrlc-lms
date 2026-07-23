import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Archive,
  Award,
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Loader2,
  MessageSquareText,
  Package,
  Plus,
  Trash2,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';

type ModuleKey = 'communications' | 'inventory';

type Field =
  | { name: string; label: string; type?: 'text' | 'date' | 'number'; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: 'textarea'; required?: boolean; placeholder?: string }
  | { name: string; label: string; type: 'select'; required?: boolean; options: string[] };

interface OperationModule {
  key: ModuleKey;
  endpoint: string;
  title: string;
  description: string;
  icon: LucideIcon;
  fields: Field[];
  titleField: string;
  metaFields: string[];
  statusOptions: string[];
}

interface OperationsOverview {
  communications: any[];
  inventory: any[];
  counts: Record<string, number>;
}

// The other former tabs (admissions, calendar, assignments, certificates) are
// handled by full modules elsewhere — link there instead of duplicating data.
const MOVED = [
  { title: 'Admissions', to: '/admissions', icon: UserPlus, note: 'Full application pipeline with documents & conversion' },
  { title: 'Homework & Assignments', to: '/teacher/homework', icon: ClipboardList, note: 'Assign, collect and mark student work' },
  { title: 'Certificates & Documents', to: '/documents', icon: Award, note: 'Generate report cards, transcripts & certificates' },
  { title: 'Academic Calendar', to: '/timetable', icon: CalendarDays, note: 'Holidays, exam windows & events on the timetable' },
];

const modules: OperationModule[] = [
  {
    key: 'communications',
    endpoint: '/api/operations/communications',
    title: 'Communications',
    description: 'Record calls, meetings, home visits, and guardian follow-ups.',
    icon: MessageSquareText,
    titleField: 'title',
    metaFields: ['channel', 'contactName', 'followUpDate'],
    statusOptions: ['LOGGED', 'NEEDS_FOLLOW_UP', 'RESOLVED'],
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
    metaFields: ['category', 'quantity', 'location', 'assignedTo'],
    statusOptions: ['NEW', 'GOOD', 'NEEDS_REPAIR', 'LOST', 'RETIRED'],
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
  if (!value && value !== 0) return 'Not set';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}

const statusColor = (status: string) => {
  if (['RESOLVED', 'GOOD', 'NEW'].includes(status)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  if (['NEEDS_FOLLOW_UP', 'NEEDS_REPAIR'].includes(status)) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (['LOST', 'RETIRED'].includes(status)) return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  return 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200';
};

export default function SchoolOperations() {
  const [activeKey, setActiveKey] = useState<ModuleKey>('communications');
  const [overview, setOverview] = useState<OperationsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const activeModule = useMemo(() => modules.find((m) => m.key === activeKey) ?? modules[0], [activeKey]);
  const records: any[] = overview?.[activeModule.key] ?? [];
  // Communications use `status`; inventory items use `condition`.
  const statusField = activeModule.key === 'inventory' ? 'condition' : 'status';

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

  const updateStatus = async (record: any, value: string) => {
    try {
      await apiSend(`${activeModule.endpoint}/${record.id}`, 'PUT', { [statusField]: value });
      toast.success('Updated');
      await loadOverview();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    }
  };

  const deleteRecord = async (record: any) => {
    const name = formatValue(record[activeModule.titleField]);
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await apiSend(`${activeModule.endpoint}/${record.id}`, 'DELETE');
      toast.success('Deleted');
      await loadOverview();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">School Operations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Communication logs and inventory — the day-to-day office records.
          </p>
        </div>
        <Button onClick={loadOverview} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {/* Active mini-modules */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5" />
                <span className="text-2xl font-bold">{loading ? '-' : overview?.counts?.[module.key] ?? 0}</span>
              </div>
              <div className="mt-2 text-sm font-semibold">{module.title}</div>
              <div className="mt-0.5 text-xs opacity-70">{module.description}</div>
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
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Latest records — update the status inline as things get resolved.</p>
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
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{formatValue(record[activeModule.titleField])}</h3>
                      {record.message && <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{record.message}</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {activeModule.metaFields.map((field) => (
                          record[field] != null && record[field] !== '' && (
                            <span key={field} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-200">
                              {formatValue(record[field])}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <select
                        value={record[statusField] ?? ''}
                        onChange={(e) => updateStatus(record, e.target.value)}
                        className={`h-8 rounded-md border-0 px-2 text-xs font-semibold outline-none ${statusColor(record[statusField] ?? '')}`}
                      >
                        {activeModule.statusOptions.map((s) => (
                          <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
                        ))}
                      </select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => deleteRecord(record)} aria-label="Delete record">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Pointers to the full modules that replaced the old tabs */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">Looking for something else?</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MOVED.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.to} to={m.to}
                className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition hover:border-aubergine-300 dark:border-white/10 dark:bg-surface-indigo">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-aubergine-600" />
                <div>
                  <p className="flex items-center gap-1 text-sm font-semibold text-slate-900 group-hover:text-aubergine-700 dark:text-white">
                    {m.title} <ExternalLink className="h-3 w-3 opacity-50" />
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{m.note}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
