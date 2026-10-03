import { NotificationPreferences } from '../components/profile/NotificationPreferences';

export default function NotificationSettings() {
  return <div className="mx-auto max-w-3xl space-y-6">
    <header>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">Notification settings</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Manage reminders, school news and email delivery for your account.</p>
    </header>
    <NotificationPreferences />
  </div>;
}
