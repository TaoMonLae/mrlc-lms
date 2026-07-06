import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MousePointerClick, KeyRound, Mail, ShieldCheck } from 'lucide-react';
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

const CURSOR_EFFECT_OPTIONS: { value: string; label: string }[] = [
  { value: 'SCHOOL_DEFAULT', label: "Use school default" },
  { value: 'NONE', label: 'None' },
  { value: 'RAINBOW_TRAIL', label: 'Rainbow Trail' },
  { value: 'SPLASH_CURSOR', label: 'Splash Cursor (fluid)' },
  { value: 'RIBBONS', label: 'Ribbons' },
  { value: 'GHOST_CURSOR', label: 'Ghost Cursor (smoke trail)' },
  { value: 'CLICK_SPARK', label: 'Click Spark' },
  { value: 'TARGET_CURSOR', label: 'Target Cursor (reticle)' },
];

export default function MyProfile() {
  const { user, updateUser } = useAuth();
  const [cursorEffect, setCursorEffect] = useState(user?.cursorEffect || 'SCHOOL_DEFAULT');
  const [saving, setSaving] = useState(false);

  const isDirty = cursorEffect !== (user?.cursorEffect || 'SCHOOL_DEFAULT');

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
          <Button variant="outline" size="sm" render={<Link to="/change-password" />}>
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
          <Select value={cursorEffect} onValueChange={setCursorEffect}>
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
            Automatically disabled for anyone with "reduce motion" enabled in their OS.
          </p>
        </div>

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
    </div>
  );
}
