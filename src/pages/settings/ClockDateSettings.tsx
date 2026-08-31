import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, Check, Clock3, Globe2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getTimezones } from '../../lib/locale';
import {
  formatSchoolDate,
  formatSchoolTime,
  formatSchoolWeekday,
  formatTimeZoneLabel,
  type SchoolDateFormat,
  type SchoolTimeFormat,
} from '../../lib/dateTime';
import { useSettings } from '../../providers/SettingsProvider';

const clockDateSchema = z.object({
  timezone: z.string().min(1),
  dateFormat: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12', '24']),
  clockShowSeconds: z.boolean(),
});

type FormValues = z.infer<typeof clockDateSchema>;

const dateFormats: Array<{ value: SchoolDateFormat; label: string; note: string }> = [
  { value: 'DD/MM/YYYY', label: '31/08/2026', note: 'Day first' },
  { value: 'MM/DD/YYYY', label: '08/31/2026', note: 'Month first' },
  { value: 'YYYY-MM-DD', label: '2026-08-31', note: 'International' },
];

const timeFormats: Array<{ value: SchoolTimeFormat; label: string; note: string }> = [
  { value: '24', label: '18:30', note: '24-hour school time' },
  { value: '12', label: '06:30 PM', note: '12-hour with AM/PM' },
];

export default function ClockDateSettings() {
  const timezones = useMemo(() => getTimezones(), []);
  const { systemSettings, updateSystem } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(clockDateSchema),
    defaultValues: {
      timezone: systemSettings.timezone,
      dateFormat: systemSettings.dateFormat,
      timeFormat: systemSettings.timeFormat,
      clockShowSeconds: systemSettings.clockShowSeconds,
    },
  });

  useEffect(() => {
    reset({
      timezone: systemSettings.timezone,
      dateFormat: systemSettings.dateFormat,
      timeFormat: systemSettings.timeFormat,
      clockShowSeconds: systemSettings.clockShowSeconds,
    });
  }, [reset, systemSettings]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timezone = watch('timezone');
  const dateFormat = watch('dateFormat');
  const timeFormat = watch('timeFormat');
  const showSeconds = watch('clockShowSeconds');

  const onSubmit = async (data: FormValues) => {
    try {
      await updateSystem(data);
      reset(data);
      toast.success('School clock and date settings updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update clock and date settings');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative">
      <header className="grid border-b border-foreground lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="px-5 py-6 sm:px-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-academic-teal">Regional standard</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-foreground">Clock & date</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Set one dependable school time for schedules, attendance, reports and the application header.
          </p>
        </div>
        <div className="border-t border-foreground bg-academic-navy-deep px-5 py-5 text-white lg:border-l lg:border-t-0 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-academic-gold">Live school time</p>
            <Clock3 className="size-4 text-academic-gold" aria-hidden="true" />
          </div>
          <time dateTime={now.toISOString()} className="mt-4 block font-mono text-4xl font-semibold leading-none tracking-[-0.055em]">
            {formatSchoolTime(now, timezone, timeFormat, showSeconds)}
          </time>
          <p className="mt-3 text-sm font-medium text-white/90">
            {formatSchoolWeekday(now, timezone)} · {formatSchoolDate(now, timezone, dateFormat)}
          </p>
          <p className="mt-2 truncate text-[10px] uppercase tracking-[0.09em] text-white/55">{formatTimeZoneLabel(timezone, now)}</p>
        </div>
      </header>

      <div className="divide-y divide-border">
        <section className="grid gap-4 px-5 py-6 md:grid-cols-[minmax(180px,0.75fr)_minmax(0,1.25fr)] md:gap-8 sm:px-7" aria-labelledby="timezone-label">
          <div>
            <p className="font-mono text-[10px] text-academic-teal">01</p>
            <h3 id="timezone-label" className="mt-1 flex items-center gap-2 text-sm font-semibold"><Globe2 className="size-4" aria-hidden="true" /> School time zone</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">The reference zone for the top-bar clock and date preview.</p>
          </div>
          <div className="self-center">
            <Label htmlFor="school-timezone" className="sr-only">School time zone</Label>
            <Select value={timezone} onValueChange={(value) => setValue('timezone', value, { shouldDirty: true })}>
              <SelectTrigger id="school-timezone" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-80 min-w-[min(32rem,calc(100vw-2rem))]">
                {timezones.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="grid gap-4 px-5 py-6 md:grid-cols-[minmax(180px,0.75fr)_minmax(0,1.25fr)] md:gap-8 sm:px-7" aria-labelledby="time-format-label">
          <div>
            <p className="font-mono text-[10px] text-academic-teal">02</p>
            <h3 id="time-format-label" className="mt-1 flex items-center gap-2 text-sm font-semibold"><Clock3 className="size-4" aria-hidden="true" /> Time notation</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Choose the notation staff and learners see in the school header.</p>
          </div>
          <div className="grid sm:grid-cols-2" role="radiogroup" aria-labelledby="time-format-label">
            {timeFormats.map((item) => {
              const active = timeFormat === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setValue('timeFormat', item.value, { shouldDirty: true })}
                  className={`relative min-h-20 border p-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-academic-navy-deep bg-academic-navy-deep text-white' : 'border-border bg-card hover:bg-muted/55'} sm:-ml-px sm:first:ml-0`}
                >
                  <span className="font-mono text-xl font-semibold">{item.label}</span>
                  <span className={`mt-1 block text-xs ${active ? 'text-white/65' : 'text-muted-foreground'}`}>{item.note}</span>
                  {active && <Check className="absolute right-3 top-3 size-4 text-academic-gold" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 px-5 py-6 md:grid-cols-[minmax(180px,0.75fr)_minmax(0,1.25fr)] md:gap-8 sm:px-7" aria-labelledby="date-format-label">
          <div>
            <p className="font-mono text-[10px] text-academic-teal">03</p>
            <h3 id="date-format-label" className="mt-1 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4" aria-hidden="true" /> Date order</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Use one predictable order across shared school views.</p>
          </div>
          <div className="grid sm:grid-cols-3" role="radiogroup" aria-labelledby="date-format-label">
            {dateFormats.map((item) => {
              const active = dateFormat === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setValue('dateFormat', item.value, { shouldDirty: true })}
                  className={`relative min-h-20 border p-4 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-academic-teal bg-accent text-accent-foreground' : 'border-border bg-card hover:bg-muted/55'} sm:-ml-px sm:first:ml-0`}
                >
                  <span className="font-mono text-sm font-semibold">{item.label}</span>
                  <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">{item.note}</span>
                  {active && <Check className="absolute right-3 top-3 size-4 text-academic-teal" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="grid gap-4 px-5 py-6 md:grid-cols-[minmax(180px,0.75fr)_minmax(0,1.25fr)] md:gap-8 sm:px-7" aria-labelledby="seconds-label">
          <div>
            <p className="font-mono text-[10px] text-academic-teal">04</p>
            <h3 id="seconds-label" className="mt-1 text-sm font-semibold">Clock precision</h3>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Seconds help with timed attendance and exams; hide them for a quieter header.</p>
          </div>
          <label htmlFor="clock-seconds" className="flex min-h-16 cursor-pointer items-center justify-between gap-5 border border-border bg-muted/35 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold">Show seconds</span>
              <span className="mt-1 block text-xs text-muted-foreground">Example: {formatSchoolTime(now, timezone, timeFormat, true)}</span>
            </span>
            <Switch id="clock-seconds" checked={showSeconds} onCheckedChange={(checked) => setValue('clockShowSeconds', checked, { shouldDirty: true })} />
          </label>
        </section>
      </div>

      <footer className="sticky bottom-0 flex flex-col gap-3 border-t border-foreground bg-card/95 px-5 py-4 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="text-xs font-medium text-muted-foreground" role="status">{isDirty ? 'Clock standard has unsaved changes.' : 'School time standard is up to date.'}</p>
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          <Save className="size-4" aria-hidden="true" /> {isSubmitting ? 'Saving…' : 'Save clock standard'}
        </Button>
      </footer>
    </form>
  );
}
