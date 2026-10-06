import { useEffect, useRef, useState } from 'react';
import { Bell, Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { apiGet, apiSend } from '@/src/lib/api';
import { useAuth } from '@/src/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  notificationPreferenceKeys, parseNotificationPreferences, publicNotificationPreferences,
  type NotificationPreferences as Preferences, type NotificationPreferenceKey,
} from '@/shared/notificationPreferences';

export function NotificationPreferences() {
  const { user } = useAuth();
  // Account-keyed state prevents preferences leaking across shared-device logins.
  return <PreferenceForm key={user?.id} role={user?.role} email={user?.email} />;
}

function PreferenceForm({ role, email }: { role?: string; email?: string }) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [saved, setSaved] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    apiGet('/api/notifications/preferences', { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const next = parseNotificationPreferences(data);
        setPreferences(next); setSaved(next);
      })
      .catch((err) => { if (!controller.signal.aborted) setError(err?.message || 'Could not load notification settings.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); request.current?.abort(); };
  }, [attempt]);

  const dirty = preferences && saved && notificationPreferenceKeys.some((key) => preferences[key] !== saved[key]);
  const save = async () => {
    if (!preferences || !dirty || request.current) return;
    const controller = new AbortController(); request.current = controller;
    setSaving(true); setError('');
    try {
      const data = await apiSend('/api/notifications/preferences', 'PUT', publicNotificationPreferences(preferences), { signal: controller.signal });
      if (controller.signal.aborted) return;
      const next = parseNotificationPreferences(data);
      setPreferences(next); setSaved(next);
      window.dispatchEvent(new Event('notification-preferences-changed'));
      toast.success('Notification settings saved');
    } catch (err: any) {
      if (!controller.signal.aborted) setError(err?.message || 'Could not save notification settings. Try again.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  };
  const row = (field: NotificationPreferenceKey, label: string, description: string) => (
    <div className="flex min-h-20 items-center justify-between gap-6 border-b border-border py-4 last:border-b-0" key={field}>
      <div className="min-w-0">
        <Label htmlFor={`notification-${field}`} className="text-sm font-medium text-foreground">{label}</Label>
        <p id={`notification-${field}-description`} className="mt-1 max-w-prose text-sm leading-6 text-muted-foreground break-words">{description}</p>
      </div>
      <Switch id={`notification-${field}`} aria-describedby={`notification-${field}-description`}
        checked={preferences![field]} disabled={saving}
        onCheckedChange={(checked) => setPreferences((current) => current && { ...current, [field]: checked })} />
    </div>
  );

  // Flat preference rows and persistent actions adapt the installed React Bits Pro settings-form-1.
  return <section id="notifications" aria-labelledby="notification-settings-title" className="scroll-mt-24 rounded-sm border border-border bg-card text-card-foreground">
    <header className="border-b border-border px-5 py-6 sm:px-7">
      <h2 id="notification-settings-title" className="text-xl font-semibold tracking-tight">Your notifications</h2>
      <p className="mt-2 max-w-prose text-sm leading-6 text-muted-foreground">Choose how you hear from MRLC and which updates you receive.</p>
    </header>
    <div className="px-5 sm:px-7" aria-busy={loading || saving}>
      {loading ? <p role="status" className="py-12 text-sm text-muted-foreground">Loading your notification settings…</p> : !preferences ?
        <div className="py-8"><p role="alert" className="mb-4 text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setAttempt((n) => n + 1)}><RefreshCw aria-hidden="true" />Try again</Button></div> : <>
          <fieldset className="min-w-0 pt-6" disabled={saving}>
            <legend className="mb-2 flex items-center gap-2 text-sm font-semibold"><Mail className="size-4" aria-hidden="true" />Delivery</legend>
            {row('inAppEnabled', 'In-app notifications', 'Show reminders and updates in your notification bell.')}
            {row('emailEnabled', 'Email notifications', email ? `Send updates to ${email}. Your school must have email delivery configured.` : 'Send updates to your account email when school email delivery is configured.')}
          </fieldset>
          <fieldset className="min-w-0 border-t border-border pt-6" disabled={saving}>
            <legend className="mb-2 flex items-center gap-2 text-sm font-semibold"><Bell className="size-4" aria-hidden="true" />Topics</legend>
            <p className="clear-both text-sm leading-6 text-muted-foreground">These choices apply to both delivery channels.</p>
            {role === 'STUDENT' && row('homeworkReminders', 'Homework reminders', 'Due dates and homework returned for another attempt.')}
            {role === 'STUDENT' && row('resultNotifications', 'Results and feedback', 'Released exam results and marked homework.')}
            {row('interventionReminders', 'Student support', 'Support actions assigned to you and overdue follow-ups.')}
            {role !== 'STUDENT' && row('payrollNotifications', 'Payroll', 'Your approved payslips and payment confirmations.')}
            {row('classNotifications', 'Classes and announcements', 'Class assignments, timetable changes, video lesson reminders and school announcements.')}
            {role === 'TEACHER' && row('appUpdates', 'App updates', 'New MRLC LMS releases and features.')}
          </fieldset>
          {!preferences.inAppEnabled && !preferences.emailEnabled && <p className="mb-5 rounded-lg bg-muted px-4 py-3 text-sm leading-6 text-muted-foreground">Both delivery channels are off. Your topic choices will be kept for when you turn notifications back on.</p>}
          {error && <p role="alert" className="mb-5 text-sm text-destructive">{error}</p>}
          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-5">
            <p role="status" className="text-sm text-muted-foreground">{saving ? 'Saving your settings…' : dirty ? 'You have unsaved changes.' : 'Your settings are up to date.'}</p>
            <div className="flex gap-2">
              {dirty && <Button variant="ghost" disabled={saving} onClick={() => { setPreferences(saved); setError(''); }}>Discard</Button>}
              <Button disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</Button>
            </div>
          </footer>
        </>}
    </div>
  </section>;
}
