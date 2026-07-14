import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiSend } from '@/src/lib/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Preferences = {
  inAppEnabled: boolean; homeworkReminders: boolean; resultNotifications: boolean;
  interventionReminders: boolean; emailEnabled: boolean;
};
const DEFAULTS: Preferences = { inAppEnabled: true, homeworkReminders: true, resultNotifications: true, interventionReminders: true, emailEnabled: false };

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  useEffect(() => { apiGet<{ preferences?: Preferences }>('/api/notifications').then((data) => data.preferences && setPreferences(data.preferences)).catch(() => undefined); }, []);
  const save = async () => {
    setSaving(true);
    try { const updated = await apiSend<Preferences>('/api/notifications/preferences', 'PUT', preferences); setPreferences(updated); toast.success('Notification preferences saved'); }
    catch (error: any) { toast.error(error?.message || 'Could not save notification preferences'); }
    finally { setSaving(false); }
  };
  const row = (field: keyof Preferences, label: string, description: string, disabled = false) => <div className="flex items-center justify-between gap-4 rounded-lg border p-3"><div><Label htmlFor={`notification-${field}`}>{label}</Label><p className="mt-0.5 text-xs text-slate-500">{description}</p></div><Switch id={`notification-${field}`} checked={preferences[field]} disabled={disabled} onCheckedChange={(checked) => setPreferences({ ...preferences, [field]: checked })} /></div>;
  return <div id="notifications" className="scroll-mt-24 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-surface-raised dark:bg-surface-indigo"><div><h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider"><Bell className="h-4 w-4" />Notifications</h3><p className="mt-1 text-sm text-slate-500">Choose which reminders appear in the notification bell. Email delivery is queued when enabled.</p></div><div className="space-y-2">{row('inAppEnabled', 'In-app notifications', 'Show persistent reminders in the notification bell.')}{row('homeworkReminders', 'Homework reminders', 'Due-soon homework and redo requests.')}{row('resultNotifications', 'Results and feedback', 'Released exam results and marked homework.')}{row('interventionReminders', 'Intervention reminders', 'Assignments and overdue intervention actions.')}{row('emailEnabled', 'Email delivery', 'Send a copy through the configured school SMTP service.')}</div><div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</Button></div></div>;
}
