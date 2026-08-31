import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { MousePointerClick, KeyRound, Mail, ShieldCheck, AlertTriangle, Eye } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '../providers/AuthProvider';
import { ProfilePhotoUploader } from '@/src/components/profile/ProfilePhotoUploader';
import { NotificationPreferences } from '@/src/components/profile/NotificationPreferences';
import { SessionManagement } from '@/src/components/profile/SessionManagement';
import { MfaSettings } from '@/src/components/profile/MfaSettings';
import { useSettings } from '../providers/SettingsProvider';
import { CURSOR_EFFECT_LABELS, previewCursorEffect } from '../lib/cursorEffects';
import type { CursorEffect } from '../types/settings';

type CursorSelection = CursorEffect | 'SCHOOL_DEFAULT';

const CURSOR_EFFECT_OPTIONS: { value: CursorSelection; label: string }[] = [
  { value: 'SCHOOL_DEFAULT', label: "Use school default" },
  { value: 'NONE', label: 'None' },
  { value: 'RAINBOW_TRAIL', label: 'Blob Cursor' },
  { value: 'SPLASH_CURSOR', label: 'Splash Cursor (fluid)' },
  { value: 'RIBBONS', label: 'Ribbons' },
  { value: 'GHOST_CURSOR', label: 'Ghost Cursor (smoke trail)' },
  { value: 'CLICK_SPARK', label: 'Click Spark' },
  { value: 'TARGET_CURSOR', label: 'Target Cursor (reticle)' },
];

export default function MyProfile() {
  const { user, updateUser } = useAuth();
  const { systemSettings } = useSettings();
  const reduceMotion = useReducedMotion();
  const [cursorEffect, setCursorEffect] = useState<CursorSelection>((user?.cursorEffect as CursorEffect | null) || 'SCHOOL_DEFAULT');
  const [saving, setSaving] = useState(false);

  const isDirty = cursorEffect !== (user?.cursorEffect || 'SCHOOL_DEFAULT');

  useEffect(() => {
    const effect = cursorEffect === 'SCHOOL_DEFAULT' ? systemSettings.cursorEffect : cursorEffect;
    previewCursorEffect(effect);
    return () => previewCursorEffect(null);
  }, [cursorEffect, systemSettings.cursorEffect]);

  const handleSaveCursorEffect = async () => {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('auth_token');
      const value = cursorEffect === 'SCHOOL_DEFAULT' ? null : cursorEffect;
      const res = await fetch('/api/me/cursor-effect', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cursorEffect: value }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save cursor effect');
      }
      updateUser({ cursorEffect: value });
      toast.success('Cursor effect updated');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save cursor effect');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1 dark:text-slate-300">Manage your personal account and preferences.</p>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          <ProfilePhotoUploader
            currentUrl={user?.profilePhotoUrl}
            fallbackText={user?.name?.split(' ').map((w) => w[0]).join('') || 'U'}
            targetType="user"
            imageClassName="h-16 w-16 rounded-full"
            buttonLabel="Change Picture"
          />
          <div>
            <div className="font-semibold text-lg text-slate-900 dark:text-white">{user?.name}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {user?.email}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> {user?.role}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-surface-raised">
          <Button variant="outline" size="sm" render={<Link to="/change-password" />} nativeButton={false}>
            <KeyRound className="mr-2 h-4 w-4" /> Change Password
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-surface-indigo border border-slate-200 dark:border-surface-raised rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" /> Cursor Effect
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Pick your own decorative mouse-cursor effect, overriding the school-wide default just for your account.
          </p>
        </div>

        <div className="max-w-sm space-y-2">
          <Label>Effect</Label>
          <Select value={cursorEffect} onValueChange={(value) => setCursorEffect(value as CursorSelection)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURSOR_EFFECT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500">
            Your selection previews across this screen before you save it.
          </p>
        </div>

        {reduceMotion ? (
          <div className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200" role="status">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p><span className="font-semibold">Preview paused by Reduce Motion.</span> The preference will still save, but continuous pointer animation stays off while Reduce Motion is enabled on this device.</p>
            </div>
          </div>
        ) : (
          <div className="border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200" role="status">
            <div className="flex items-start gap-3">
              <Eye className="mt-0.5 size-4 shrink-0" />
              <p><span className="font-semibold">Live preview:</span> {cursorEffect === 'SCHOOL_DEFAULT' ? `${CURSOR_EFFECT_LABELS[systemSettings.cursorEffect]} (school default)` : CURSOR_EFFECT_LABELS[cursorEffect]}.</p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSaveCursorEffect}
            disabled={!isDirty || saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
      <NotificationPreferences />
      <MfaSettings />
      <SessionManagement />
    </div>
  );
}
