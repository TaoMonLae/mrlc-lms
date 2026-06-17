import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, HardDrive, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getTimezones, getCurrencies } from '../../lib/locale';
import { useSettings } from '../../providers/SettingsProvider';

const systemSchema = z.object({
  timezone: z.string(),
  dateFormat: z.string(),
  currency: z.string(),
  defaultLanguage: z.string(),
  fileUploadLimitMb: z.number().min(1).max(100),
  backupEnabled: z.boolean(),
});

type FormValues = z.infer<typeof systemSchema>;

export default function SystemSettings() {
  const timezones = useMemo(() => getTimezones(), []);
  const currencies = useMemo(() => getCurrencies(), []);
  const { systemSettings, updateSystem } = useSettings();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { isSubmitting, isDirty }
  } = useForm<FormValues>({
    resolver: zodResolver(systemSchema),
    defaultValues: systemSettings,
  });

  // Re-sync the form once the persisted settings load from the server.
  useEffect(() => {
    reset(systemSettings);
  }, [systemSettings, reset]);

  const onSubmit = async (data: FormValues) => {
    try {
      await updateSystem(data);
      reset(data);
      toast.success('System settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update system settings');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">System Configuration</h2>
        <p className="text-sm text-slate-500 mt-1">Localization, storage, and automated system behaviors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Localization */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
             Localization
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={watch('timezone')} onValueChange={(v: any) => setValue('timezone', v, { shouldDirty: true })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 min-w-[24rem]">
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={watch('dateFormat')} onValueChange={(v: any) => setValue('dateFormat', v, { shouldDirty: true })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Currency</Label>
                 <Select value={watch('currency')} onValueChange={(v: any) => setValue('currency', v, { shouldDirty: true })}>
                   <SelectTrigger className="w-full">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent className="max-h-72 min-w-[20rem]">
                     {currencies.map((c) => (
                       <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Language</Label>
                 <Select value={watch('defaultLanguage')} onValueChange={(v: any) => setValue('defaultLanguage', v, { shouldDirty: true })}>
                   <SelectTrigger className="w-full">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="en">English</SelectItem>
                     <SelectItem value="es">Spanish</SelectItem>
                     <SelectItem value="fr">French</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
            </div>
          </div>
        </div>

        {/* Storage & Maintenance */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            Storage & Maintenance
          </h3>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Max File Upload Size (MB)</Label>
              <Input 
                type="number" 
                {...register('fileUploadLimitMb', { valueAsNumber: true })} 
                min={1} 
                max={100}
                className="max-w-[200px]"
              />
              <p className="text-xs text-slate-500">Maximum allowed size for student assignments and resources.</p>
            </div>

            <div className="flex items-center justify-between border border-slate-200 dark:border-surface-raised rounded-xl p-4">
              <div className="flex gap-3">
                 <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg h-fit">
                    <HardDrive className="h-5 w-5" />
                 </div>
                 <div>
                   <Label className="text-base cursor-pointer" htmlFor="backup-toggle">Automated Daily Backups</Label>
                   <p className="text-xs text-slate-500">Create a database snapshot every night at 2:00 AM.</p>
                 </div>
              </div>
              <Switch 
                id="backup-toggle"
                checked={watch('backupEnabled')} 
                onCheckedChange={(checked) => setValue('backupEnabled', checked, { shouldDirty: true })} 
              />
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4 flex gap-3">
               <Shield className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
               <div className="text-sm text-amber-800 dark:text-amber-400/90">
                 <p className="font-semibold mb-1">System Security</p>
                 <p>Make sure to regularly review role permissions and limit file upload sizes to prevent abuse.</p>
               </div>
            </div>
          </div>
        </div>

      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-surface-raised flex justify-end">
        <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
