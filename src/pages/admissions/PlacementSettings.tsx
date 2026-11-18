import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, Loader2, Lock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiSend } from '../../lib/api';
import { PlacementHeader } from './placementShared';

interface Settings {
  isOpen: boolean;
  closedMessage: string | null;
  timeLimitMinutes: number;
  foundationMastery: number;
  preGedMastery: number;
  gedMastery: number;
  retakeWaitDays: number;
  updatedAt?: string;
  updatedByName?: string | null;
  canEdit: boolean;
}

type Editable = Omit<Settings, 'updatedAt' | 'updatedByName' | 'canEdit'>;

function NumberField({ id, label, hint, value, onChange, min, max, suffix, disabled }: { id: string; label: string; hint: string; value: number; onChange: (value: number) => void; min: number; max: number; suffix: string; disabled: boolean }) {
  return <div className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start sm:gap-6">
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <p id={`${id}-hint`} className="mt-0.5 max-w-prose text-sm text-muted-foreground">{hint}</p>
    </div>
    <div className="flex items-center gap-2">
      <Input id={id} type="number" inputMode="numeric" min={min} max={max} value={Number.isFinite(value) ? value : ''} disabled={disabled} aria-describedby={`${id}-hint`} aria-invalid={!Number.isFinite(value) || value < min || value > max ? true : undefined} onChange={event => onChange(event.target.value === '' ? Number.NaN : Number(event.target.value))} className="w-24 tabular-nums aria-invalid:border-destructive" />
      <span className="text-sm text-muted-foreground">{suffix}</span>
    </div>
  </div>;
}

export default function PlacementSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState<Editable | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Settings>('/api/placement-settings').then(data => {
      setSettings(data);
      const { updatedAt, updatedByName, canEdit, ...rest } = data;
      setForm(rest);
    }).catch(err => setError(err.message || 'Settings could not load'));
  }, []);

  if (error) return <div className="mx-auto max-w-7xl space-y-6"><PlacementHeader title="Placement test settings" description="When the test is open, how long it lasts and how levels are decided." /><p className="flex items-center gap-2 text-sm text-destructive" role="alert"><AlertTriangle className="h-4 w-4" />{error}</p></div>;
  if (!settings || !form) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading settings</div>;

  const canEdit = settings.canEdit;
  const set = <K extends keyof Editable>(key: K, value: Editable[K]) => setForm(prev => prev ? { ...prev, [key]: value } : prev);
  const invalid = [form.timeLimitMinutes, form.foundationMastery, form.preGedMastery, form.gedMastery, form.retakeWaitDays].some(v => !Number.isFinite(v))
    || form.timeLimitMinutes < 20 || form.timeLimitMinutes > 240
    || [form.foundationMastery, form.preGedMastery, form.gedMastery].some(v => v < 30 || v > 100)
    || form.retakeWaitDays < 0 || form.retakeWaitDays > 365;
  const dirty = (Object.keys(form) as (keyof Editable)[]).some(key => (form[key] ?? null) !== (settings[key] ?? null));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (invalid) return;
    setSaving(true);
    try {
      const data = await apiSend<Settings>('/api/placement-settings', 'PUT', { ...form, closedMessage: form.closedMessage?.trim() || null });
      setSettings(data);
      const { updatedAt, updatedByName, canEdit: _canEdit, ...rest } = data;
      setForm(rest);
      toast.success('Placement settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Settings could not be saved');
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={save} className="mx-auto max-w-7xl space-y-6">
    <PlacementHeader title="Placement test settings" description="When the test is open, how long it lasts and how levels are decided. Changes apply to tests started after you save." />

    {!canEdit && <p className="flex items-center gap-2 rounded-sm border border-border bg-card px-4 py-3 text-sm text-muted-foreground"><Lock className="h-4 w-4" aria-hidden="true" />Only administrators can change these settings.</p>}

    <section aria-labelledby="availability-title" className="rounded-sm border border-border bg-card p-5 shadow-sm">
      <h2 id="availability-title" className="text-lg font-semibold">Availability</h2>
      <div className="mt-4 grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-start sm:gap-6">
        <div>
          <label htmlFor="is-open" className="text-sm font-medium text-foreground">Accept new tests</label>
          <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">{form.isOpen ? 'Newcomers can start the test from the landing page.' : 'The test page shows your message instead of the start button. Tests already in progress can still be sent.'}</p>
        </div>
        <div className="flex items-center gap-3 pt-1"><Switch id="is-open" checked={form.isOpen} onCheckedChange={checked => set('isOpen', Boolean(checked))} disabled={!canEdit} /><span className="text-sm font-medium">{form.isOpen ? 'Open' : 'Closed'}</span></div>
      </div>
      {!form.isOpen && <div className="mt-4">
        <label htmlFor="closed-message" className="text-sm font-medium">Message while closed</label>
        <Textarea id="closed-message" value={form.closedMessage ?? ''} disabled={!canEdit} maxLength={600} rows={3} onChange={event => set('closedMessage', event.target.value)} className="mt-1.5" placeholder="For example: The placement test reopens on 5 January for the new intake. Contact the school office on 012-345 6789." />
      </div>}
    </section>

    <section aria-labelledby="timing-title" className="rounded-sm border border-border bg-card p-5 shadow-sm">
      <h2 id="timing-title" className="text-lg font-semibold">Time and retakes</h2>
      <div className="mt-4 space-y-5">
        <NumberField id="time-limit" label="Time limit" hint="Between 20 and 240 minutes. When time runs out, answers are sent automatically." value={form.timeLimitMinutes} min={20} max={240} suffix="minutes" disabled={!canEdit} onChange={v => set('timeLimitMinutes', v)} />
        <NumberField id="retake-wait" label="Wait before a retake" hint="Days a person must wait after sending a test before starting another, matched by phone or email. 0 allows retakes at any time." value={form.retakeWaitDays} min={0} max={365} suffix="days" disabled={!canEdit} onChange={v => set('retakeWaitDays', v)} />
      </div>
    </section>

    <section aria-labelledby="cutoffs-title" className="rounded-sm border border-border bg-card p-5 shadow-sm">
      <h2 id="cutoffs-title" className="text-lg font-semibold">Level cut-offs</h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">In each subject, a learner reaches a level when they answer at least this share of that level’s questions correctly, and every easier level too. The overall recommendation follows the weaker of Reading and Math. New cut-offs apply to tests sent after you save; earlier results keep their scores.</p>
      <div className="mt-4 space-y-5">
        <NumberField id="cut-foundation" label="Foundation questions" hint="Needed to move above Below Pre-GED." value={form.foundationMastery} min={30} max={100} suffix="% correct" disabled={!canEdit} onChange={v => set('foundationMastery', v)} />
        <NumberField id="cut-preged" label="Pre-GED questions" hint="Needed, with the GED cut-off, to reach the GED class." value={form.preGedMastery} min={30} max={100} suffix="% correct" disabled={!canEdit} onChange={v => set('preGedMastery', v)} />
        <NumberField id="cut-ged" label="GED questions" hint="The hardest questions in each subject." value={form.gedMastery} min={30} max={100} suffix="% correct" disabled={!canEdit} onChange={v => set('gedMastery', v)} />
      </div>
    </section>

    {canEdit && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">{invalid ? <span className="text-destructive">Check the highlighted ranges before saving.</span> : settings.updatedByName ? `Last changed by ${settings.updatedByName}${settings.updatedAt ? ` on ${new Date(settings.updatedAt).toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}` : 'Using the default settings.'}</p>
      <Button type="submit" disabled={saving || invalid || !dirty}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save settings</Button>
    </div>}
  </form>;
}
